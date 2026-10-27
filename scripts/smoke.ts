#!/usr/bin/env npx tsx
/**
 * Shikamaru Smoke - Backend runtime gate (shell/HTTP, NOT Playwright).
 *
 * Parses the `**Smoke:**` field of a task in TASKS.md, optionally boots the
 * app via `start_cmd` (spawn + poll until a port/URL is ready), then runs each
 * assertion command. Exits 0 if all assertions pass, 1 otherwise. The spawned
 * process is ALWAYS killed in `finally` (SIGTERM then SIGKILL), even on error
 * or timeout. Writes `.shikamaru/smoke/[id]/report.json`.
 *
 * A task without a `**Smoke:**` field is a clean skip (exit 0, verdict "skipped").
 * A crash of the runner itself is treated as verdict "error" (exit 1) — never a
 * silent pass, so the Runner keeps the task at `needs-review`.
 *
 * Disjoint from recettage.ts (Playwright / front). See task-schema.md
 * "Disjonction Smoke ⟂ Recettage".
 *
 * Usage: npx tsx scripts/smoke.ts --task T154 [--tasks-file path/to/TASKS.md]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
// Spécifieur avec `.js` : le package est `"type": "module"`, donc un build
// `tsc` conserve l'extension telle quelle et Node ESM REFUSE un import sans
// extension (`ERR_MODULE_NOT_FOUND`) avant même que le gate démarre. tsx
// résout `.js` → `.ts` sans broncher : ça marche des deux côtés, alors que
// l'extensionless ne marche QUE sous tsx. AGENTS.md impose le chemin
// compile-puis-node dans la sandbox Cowork.
import { extractTaskSection, resolveTasksFile } from './lib/task-dialect.js';

interface SmokeStep {
  cmd: string;
  note?: string;
  success?: boolean;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  /**
   * Cause NOMMÉE d'un échec non-assertionnel. Un échec de PARSING et un
   * TIMEOUT ne sont pas des échecs d'assertion : les confondre a fait rouvrir
   * du code correct (~8 faux FAIL en 4 jours).
   *  - `SMOKE_PARSE_AMBIGUOUS` : la puce ne décrit pas 1 commande unique.
   *  - `SMOKE_ASSERT_TIMEOUT`  : la commande a été TUÉE avant de conclure.
   */
  errorCode?: 'SMOKE_PARSE_AMBIGUOUS' | 'SMOKE_ASSERT_TIMEOUT';
}

interface SmokeConfig {
  startCmd?: string;
  steps: SmokeStep[];
  /** Puces refusées comme assertions parce qu'elles sont des CHAMPS (T91). */
  refus?: RefusDePuce[];
  /**
   * Ce qui a FERMÉ le bloc Smoke — champ suivant, séparateur, heading, fin de
   * section. Le bloc s'arrête là, et le rapport le DIT au lieu de le taire :
   * sans cette phrase, une assertion perdue parce qu'un champ la précède est
   * indiscernable d'une assertion jamais écrite. C'est ce silence qui a laissé
   * 31 assertions dormir dans TASKS.md (T90). Review codex du 2026-08-12 : la
   * sentinelle empêche bien l'exécution, mais elle sortait du bloc AVANT que la
   * seconde garde puisse journaliser quoi que ce soit — le refus promis par la
   * spec n'apparaissait donc nulle part.
   */
  finDeBloc?: string;
}

interface RefusDePuce {
  /** Nom du champ reconnu — JAMAIS la valeur, qui est une commande refusée. */
  champ: string;
  /** Numéro de ligne, relatif au champ `**Smoke:**` de la section. */
  ligne: number;
  motif: string;
}

/**
 * Noms de champ reconnus par la sentinelle de fin de bloc et par le refus par
 * nom (T91). La liste est CLOSE et ne se devine pas : tout ce qui n'y est pas
 * reste une assertion légitime. C'est ce qui laisse passer un `- test:
 * \`pytest -q\`` ou un `- assert:` sans les avaler.
 *
 * Elle vient des dialectes que `scripts/validate.ts` accepte en LECTURE
 * (`fieldValue`, lignes 35-37 et 63) : gras, gras en puce, gras à suffixe,
 * NON-GRAS, heading. La moitié « détection » du parseur avait été élargie en
 * T90 sans que la moitié « terminaison » connaisse le dialecte non-gras — un
 * `- Rollback: \`cmd\`` ne fermait donc rien et partait en shell.
 *
 * L'allonger est un acte délibéré : chaque nom ajouté est une puce qui cesse
 * d'être exécutable. L'inverse est vrai aussi — un nom qui manque est un
 * chemin d'exécution ouvert.
 */
// NON exportée à dessein : ce module appelle `main()` au niveau module, donc
// l'importer lancerait le gate. `verifier-harnais-smoke.ts` lit ce littéral
// TEXTUELLEMENT et vérifie qu'il couvre tout ce que `validate.ts` sait lire.
const NOMS_DE_CHAMP = [
  'Rollback',
  'Fallback',
  'Files',
  'Done',
  'Prompt',
  'Context',
  'Duration',
  'Tier',
  'Type',
  'Status',
  'Goal',
  'Boundaries',
  'Edge cases',
  'TDD',
  'Success metrics',
  'Critère de done',
  // T91, review codex du 2026-08-12 (P1) — les noms ci-dessous MANQUAIENT, et
  // chaque nom manquant est un chemin d'exécution ouvert, pas une coquetterie.
  // Mesuré AVANT correctif sur un fixture jetable, en exécutant le gate :
  //   `- Statut: \`echo APPAT-STATUT-A-FAIT-FEU\`` → « Assertions: 2 », appât
  //   EXÉCUTÉ, verdict PASS. Idem pour `- Review:`. Or `validate.ts` lit
  //   explicitement ces deux noms (`fieldValue(block, "(?:Statut|Status)")`
  //   ligne 231, `fieldValue(block, "Review")` ligne 249) : ce sont des CHAMPS
  //   valides du dialecte, exactement au même titre que `Rollback`.
  // La liste de T91 avait été recopiée du prompt de la spec au lieu d'être
  // dérivée des lecteurs de `validate.ts` — la spec disait pourtant « la liste
  // fait autorité, elle est dans fieldValue, ne la réinvente pas ». D'où la
  // garde anti-dérive du vérificateur, qui relit `validate.ts` et échoue si un
  // nom qu'il accepte manque ici : la prochaine divergence sera vue, pas subie.
  'Statut',
  'Review',
  'Recettage',
  'Smoke',
  'Depends on',
  'Depends',
  'Branche',
  'Branch',
  'Base',
  'PR',
  'Progress',
  'Completed',
  'Blocked reason',
  'Needs review reason',
  'Assignee',
  'Reviewer',
  'ClaimedAt',
  // Re-review codex (via Edgee) du 2026-08-12 (P1) — la liste était dérivée des
  // seuls LECTEURS de validate.ts ; le vocabulaire COMPLET est plus large :
  // schemas/tasks-schema.md porte notes/priority/timeout, et le dialecte partagé
  // (scripts/lib/task-dialect.ts, FIELD_HEADING) reconnaît aussi Note(s),
  // Created, Contexte, Durée, Blocked, Critère, File, Edge case. Mesuré avant
  // correctif : `- Notes: \`cmd\`` ni terminateur ni refusé → exécuté en shell.
  // La garde du vérificateur relit désormais AUSSI FIELD_HEADING : la prochaine
  // extension du dialecte cassera la garde au lieu d'ouvrir un chemin.
  'Notes',
  'Note',
  'Priority',
  'Priorité',
  'Priorite',
  'Timeout',
  'Created',
  'Contexte',
  'Durée',
  'Duree',
  'Blocked',
  'Critère',
  'Critere',
  'File',
  'Edge case',
  'Dépendances',
  'Dependances',
];

const echapperPourRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// L'ORDRE du tableau ci-dessus est sans conséquence, et ça se mesure plutôt que
// se raisonner. Un tri « du plus long au plus court » avait été posé ici pour
// protéger les noms préfixes (`Depends` volant `- Depends on:`), puis RETIRÉ :
// les trois états ont été joués sur `- Depends on: \`echo APPAT\`` et rendent
// tous les trois UNE assertion — ordre favorable sans tri, ordre défavorable
// sans tri, ordre défavorable avec tri. L'alternance JS BACKTRACKE : `Depends`
// est essayé, le `:` exigé juste après ne suit pas, le moteur reprend sur
// `Depends on`, qui matche. Le tri ne protégeait donc rien, et le garder aurait
// été du code sans effet mesurable adossé à une explication fausse.
const ALTERNANCE_NOMS = NOMS_DE_CHAMP.map(echapperPourRegex).join('|');

type Verdict = 'PASS' | 'FAIL' | 'skipped' | 'error';

interface SmokeReport {
  task: string;
  verdict: Verdict;
  startCmd?: string;
  steps: SmokeStep[];
  /** Puces refusées comme assertions parce qu'elles sont des CHAMPS (T91). */
  refus?: RefusDePuce[];
  /** Ce qui a fermé le bloc Smoke — voir SmokeConfig.finDeBloc. */
  finDeBloc?: string;
  stdout: string;
  stderr: string;
  message?: string;
  timestamp: string;
}

const START_TIMEOUT_MS = parseInt(process.env.SMOKE_START_TIMEOUT_MS || '30000', 10);
// 60 s (et non 15 s) : un dry-run NocoDB à 4 tables paginées, espacées de 0,6 s
// par le rate-limit, a été mesuré à 15 002 ms puis 11 808 ms sur DEUX passages
// consécutifs — à 15 s le gate passait à la loterie.
const ASSERT_TIMEOUT_MS = parseInt(process.env.SMOKE_ASSERT_TIMEOUT_MS || '60000', 10);
/** Défaut quand la task ne déclare rien — la valeur historique, inchangée. */
const ASSERT_TIMEOUT_DEFAULT_MS = 60000;
/** Plafond explicite d'un `**Timeout:**` déclaré par une task : 10 minutes. */
const ASSERT_TIMEOUT_CAP_MS = 600000;
// Plafond de ce qu'on RETIENT d'une sortie d'assertion (les pipes, eux, sont
// toujours drainés). Le report n'en publie que les 2000 derniers caractères ;
// 256 Ko laissent de la marge pour le diagnostic sans jamais menacer le heap.
const OUTPUT_CAP_BYTES = 256 * 1024;

// ── args ──────────────────────────────────────────────────────────────────
function parseArgs(): { taskId: string; tasksFile: string } {
  const args = process.argv.slice(2);
  const taskIndex = args.indexOf('--task');

  if (taskIndex === -1 || !args[taskIndex + 1]) {
    console.error('Usage: npx tsx scripts/smoke.ts --task T154 [--tasks-file path | path]');
    process.exit(1);
  }

  // `--tasks-file path` OU un positionnel — même contrat que
  // archive-done-tasks.ts (l'asymétrie de flag entre les deux était masquée
  // par une coïncidence de parsing).
  const resolved = resolveTasksFile(args, path.join(process.cwd(), 'TASKS.md'));
  return { taskId: args[taskIndex + 1], tasksFile: resolved };
}

// ── parsing ─────────────────────────────────────────────────────────────────
// `extractTaskSection` vit désormais dans ./lib/task-dialect (source unique,
// partagée avec validate.ts et archive-done-tasks.ts — les 3 copies avaient
// déjà divergé).

/** Échec de parsing d'une puce — NOMMÉ, jamais silencieux. */
class SmokeParseError extends Error {
  constructor(
    public readonly code: 'SMOKE_PARSE_AMBIGUOUS',
    message: string
  ) {
    super(message);
  }
}

/** Positions des backticks NON échappés (un `\``  littéral n'en est pas un). */
function backtickPositions(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '`' && s[i - 1] !== '\\') out.push(i);
  }
  return out;
}

/**
 * Découpe une puce en `{cmd, note}`. Contrat : **1 puce = 1 assertion**.
 *
 * L'ancien `cleanCommand` prenait le span PREMIER↔DERNIER backtick, ce qui
 * fabriquait une commande unique à partir de plusieurs, avec des backticks
 * résiduels — cause des 3 pannes de parsing (`grep -c "→" f | awk '$1>=3'`
 * découpé en `grep -c "` → « unexpected EOF while looking for matching
 * backtick »). On extrait maintenant STRICTEMENT la première paire, et toute
 * ambiguïté est REFUSÉE par son nom : le coût d'un refus explicite est nul,
 * celui d'une concaténation silencieuse est un faux FAIL qui fait rouvrir du
 * code correct.
 *
 * Le `→` séparateur de note est cherché HORS backticks — sans quoi une flèche
 * présente DANS la commande (`grep -c "→" f.md`) tronque l'assertion.
 */
function parseBullet(item: string): { cmd: string; note?: string } {
  const ticks = backtickPositions(item);

  // Le token ` ET ` hors backticks signe une puce multi-commandes
  // (`` `a` ET `b` ``). Cherché HORS backticks et HORS note pour ne pas
  // refuser un légitime `grep " ET " f` ni une note « couvre A ET B ».
  const rejectEt = (outside: string) => {
    if (/(^|\s)ET(\s|$)/.test(outside)) {
      throw new SmokeParseError(
        'SMOKE_PARSE_AMBIGUOUS',
        `1 puce = 1 assertion — le token « ET » chaîne plusieurs commandes, séparez-les en puces distinctes : ${item}`
      );
    }
  };

  if (ticks.length === 0) {
    // Legacy : puce sans backticks — la commande est la puce entière.
    const arrow = item.indexOf('→');
    const cmdPart = arrow === -1 ? item : item.slice(0, arrow);
    rejectEt(cmdPart);
    const note = arrow === -1 ? undefined : item.slice(arrow + 1).trim();
    return { cmd: cmdPart.trim(), note: note || undefined };
  }

  if (ticks.length === 1) {
    throw new SmokeParseError(
      'SMOKE_PARSE_AMBIGUOUS',
      `backtick non refermé — la commande doit être délimitée par une paire de backticks : ${item}`
    );
  }

  const cmd = item.slice(ticks[0] + 1, ticks[1]).trim();
  const after = item.slice(ticks[1] + 1);
  const arrow = after.indexOf('→');
  const note = arrow === -1 ? undefined : after.slice(arrow + 1).trim();
  const outside = item.slice(0, ticks[0]) + ' ' + (arrow === -1 ? after : after.slice(0, arrow));

  rejectEt(outside);

  // L'ambiguïté ne se juge QUE sur la partie COMMANDE : une note est du texte
  // libre où les backticks sont légitimes (`→ couvre `Done #2``, `→ `2>&1` est
  // une redirection`). Les compter refusait des puces parfaitement saines —
  // le faux FAIL que cette task supprime.
  const commandRegion = item.slice(0, ticks[1] + 1) + (arrow === -1 ? after : after.slice(0, arrow));
  const commandTicks = backtickPositions(commandRegion);
  if (commandTicks.length > 2) {
    throw new SmokeParseError(
      'SMOKE_PARSE_AMBIGUOUS',
      `1 puce = 1 assertion — ${Math.ceil(commandTicks.length / 2)} paires de backticks dans la partie commande, une seule est autorisée : ${item}`
    );
  }

  return { cmd, note: note || undefined };
}

/** Strip trailing `*(...)* ` italic annotation from a start_cmd line remainder. */
function stripItalicNote(s: string): string {
  return s.replace(/\*\(.*?\)\*\s*$/, '').trim();
}

/**
 * Parse the `**Smoke:**` block. Grammar (from tier-templates.md):
 *
 *   **Smoke:**
 *   - start_cmd: `npm run dev &`  *(optionnel — lance l'app si besoin)*
 *   - `curl -sf localhost:$PORT/api/health | grep -q 'ok'` → couvre Done #2
 *
 * Returns null when no `**Smoke:**` field exists (→ skip).
 */
/**
 * Lit le champ `**Timeout:**` (SECONDES) d'une section de task.
 *
 * La sortie de secours `SMOKE_ASSERT_TIMEOUT_MS` existait déjà mais n'est
 * actionnable que par l'opérateur du run : aucune task ne pouvait déclarer que
 * son assertion est légitimement lente (import Prefect, requête BigQuery — 3
 * occurrences). Elle reste l'override de plus haut rang, pour ne rien retirer
 * au conseil que le message de timeout donne déjà.
 *
 * Précédence : `SMOKE_ASSERT_TIMEOUT_MS` > `**Timeout:**` borné > 60 s.
 *
 * Le motif est ANCRÉ et tolère les trois dialectes mesurés sur le portefeuille
 * (canonique, en puce, deux-points hors gras) — même raisonnement que le champ
 * `**Quest:**` : une mention en prose ne doit jamais être prise pour un champ.
 * Valeur non entière ⇒ champ ignoré, défaut, aucun crash.
 */
function parseAssertTimeoutMs(taskSection: string): number {
  if (process.env.SMOKE_ASSERT_TIMEOUT_MS) return ASSERT_TIMEOUT_MS;

  const m = taskSection.match(/^(?:[-*]\s+)?\*\*Timeout\*?\*?:?\*{0,2}\s*(.+?)\s*$/im);
  if (!m) return ASSERT_TIMEOUT_DEFAULT_MS;

  const brut = m[1].trim();
  const sec = /^(\d+)\s*s?$/i.exec(brut);
  if (!sec) {
    console.log(`   ⚠️  **Timeout:** « ${brut} » illisible — défaut ${ASSERT_TIMEOUT_DEFAULT_MS}ms retenu`);
    return ASSERT_TIMEOUT_DEFAULT_MS;
  }

  const ms = parseInt(sec[1], 10) * 1000;
  if (ms <= 0) return ASSERT_TIMEOUT_DEFAULT_MS;
  if (ms > ASSERT_TIMEOUT_CAP_MS) {
    console.log(
      `   ⚠️  **Timeout:** ${sec[1]}s dépasse le plafond — borné à ${ASSERT_TIMEOUT_CAP_MS / 1000}s`
    );
    return ASSERT_TIMEOUT_CAP_MS;
  }
  return ms;
}

function parseSmoke(taskSection: string): SmokeConfig | null {
  // Grab everything after `**Smoke:**` (canonical) OR a `### Smoke` field
  // heading (tolerated client dialect) up to the next `**Field:**`, `---`,
  // heading, or fenced block. `(?![\s\S])` matches true end-of-string in JS.
  // Le champ DOIT être ancré en DÉBUT DE LIGNE (`^`, flag `m`). Sans l'ancre,
  // une simple MENTION du nom du champ dans une prose — `- [ ] une task sans
  // **Smoke:** reste un skip` — était captée AVANT le vrai champ ; le bloc
  // capturé s'arrêtait au `**Champ:**` suivant, donc vide, donc « No **Smoke:**
  // field — skipped » avec exit 0. Un faux SKIP est pire qu'un faux FAIL : le
  // gate bloquant disparaît EN VERT. Trouvé en faisant tourner le gate sur la
  // spec de T160 elle-même.
  //
  // T90 (2026-08-11) — le champ est aussi accepté PRÉCÉDÉ D'UN MARQUEUR DE
  // LISTE (`- **Smoke:**`), qui est le dialecte réel de TASKS.md : tous ses
  // champs sont des puces. Mesuré avant correctif : `--task T54` et `--task
  // T84` rendaient « No **Smoke:** field », exit 0 ; six tasks étaient dans ce
  // cas, soit 31 assertions jamais exécutées, et la section T903 du harnais —
  // dont l'unique assertion est `false` — sortait EN VERT.
  //
  // Deux conditions rendent l'élargissement sûr, et elles sont couplées :
  //  1. `**Smoke:**` doit être le PREMIER token après le marqueur, et le
  //     marqueur exige AU MOINS UN ESPACE. C'est ce qui continue d'exclure la
  //     mention en prose de T902 (`- [ ] une task sans **Smoke:**`, où le
  //     premier token est `[ ]`) et le gras-italique de T905 (`***Smoke:***`,
  //     où aucun espace ne suit le premier `*`).
  //  2. Le TERMINATEUR doit reconnaître le champ suivant SOUS SA FORME EN PUCE.
  //     Sans cette moitié, le bloc vide de T904 courait jusqu'au heading et
  //     avalait le `- **Rollback** : git revert HEAD` de la ligne suivante, qui
  //     serait parti en ASSERTION — le gate aurait détruit le dépôt qu'il garde.
  //     L'appât est dans le fixture exprès. Élargir la détection SANS élargir la
  //     terminaison est donc pire que ne rien faire.
  //  3. La sentinelle accepte `**[A-Za-z]`, pas seulement `[A-Z]`. Review de
  //     T90 : la contrainte majuscule existait avant, mais elle était
  //     INATTEIGNABLE — sans détection en puce, aucun bloc ne pouvait courir
  //     jusqu'à un champ en puce. Ce diff ouvre le chemin, et un champ suivant
  //     en minuscule (`- **rollback** : \`git revert HEAD\``) ne fermait pas le
  //     bloc : sa puce partait en assertion EXÉCUTÉE. Couvert par T906.
  //
  // Détail qui a mordu pendant l'écriture de T90, et qui vaut d'être écrit :
  // la sentinelle de fin ne peut PAS s'exprimer en `\n**Champ` ici. Le
  // séparateur consomme déjà le saut de ligne, donc sur un bloc VIDE — le champ
  // suivant est la ligne d'APRÈS immédiate, cas T904 — il ne reste aucun `\n` à
  // matcher : la sentinelle rate, le bloc file jusqu'au heading et avale la
  // puce suivante. Mesuré : `git revert HEAD` capté comme assertion. La
  // sentinelle est donc ancrée en DÉBUT DE LIGNE (`^`, flag `m`), et le
  // séparateur ne consomme QU'UN saut de ligne.
  // T91 (2026-08-12) — la TERMINAISON n'est plus une sentinelle noyée dans la
  // regex de détection, elle est un PARCOURS DE LIGNES. Trois raisons, toutes
  // mesurées le 2026-08-12 en EXÉCUTANT le gate, jamais en relisant la regex :
  //
  //  a. La sentinelle ne connaissait que le dialecte GRAS. Un champ NON-GRAS
  //     (`- Rollback: \`echo …\``), que validate.ts accepte explicitement en
  //     lecture, ne fermait rien : sa valeur entre backticks partait en
  //     ASSERTION et s'exécutait. Mesuré : 2 assertions au lieu d'1, appât
  //     exécuté, verdict PASS. C'est la classe exacte de l'incident du run 005.
  //  b. Le même chemin s'ouvre sous DEUX autres formes que la review n'avait pas
  //     nommées, et qu'un correctif de regex sur le seul cas cité aurait
  //     laissées ouvertes : le champ non-gras précédé d'une LIGNE VIDE, et le
  //     champ non-gras en COLONNE 0 suivi d'une puce. Mesurées à 2 assertions
  //     toutes les deux.
  //  c. Le champ en DERNIÈRE LIGNE SANS SAUT DE LIGNE FINAL (P2-7, tracé non
  //     corrigé en T90) rendait « No **Smoke:** field » — le message de champ
  //     ABSENT sur un champ PRÉSENT, soit la confusion même que T90 supprime.
  //     Le séparateur `\n` exigé par la regex n'existait pas. Un parcours de
  //     lignes n'a pas ce problème : le bloc est simplement vide.
  //
  // La DÉTECTION, elle, ne change pas d'un iota — c'est la moitié que T90 a
  // réparée et qui est couverte par T900/T902/T905/T907. Elle exige toujours
  // que `**Smoke:**` soit le PREMIER token après un marqueur de liste suivi
  // d'AU MOINS UN ESPACE, ce qui continue d'exclure la mention en prose de T902
  // (`- [ ] une task sans **Smoke:**`) et le gras-italique de T905.
  const MARQUEUR_DE_LISTE = String.raw`[ \t]*(?:[-*+][ \t]+)?`;
  const detectionDuChamp = new RegExp(
    `^(?:${MARQUEUR_DE_LISTE}\\*\\*Smoke:\\*\\*[^\\n]*|#{2,4}\\s+Smoke\\s*:?\\s*)$`,
  );
  // Un champ NON-GRAS ne se reconnaît qu'à son NOM — d'où la liste close. Sans
  // elle, `^\s*[-*+]\s+\w+\s*:` capterait `- assert:` et viderait tous les
  // blocs : un faux SKIP généralisé, pire que le défaut corrigé.
  const champNonGras = new RegExp(`^${MARQUEUR_DE_LISTE}(?:${ALTERNANCE_NOMS})[ \\t]*:`, 'i');
  // Re-review codex (via Edgee) du 2026-08-12 (P1) : « toute puce en gras »
  // avalait aussi les ASSERTIONS légitimes ouvertes en gras — un
  // `- **assert:** \`false\`` fermait le bloc AVANT d'être lu : l'échec
  // devenait skipped/PASS, la classe de faux vert que T90 supprime. Le
  // terminateur exige désormais un NOM DE CHAMP CONNU (le même vocabulaire que
  // le dialecte non-gras), colon dedans (`**Tier:**`) ou dehors (`**Tier** :`),
  // colon absent accepté (`- **Rollback**`, appât T904). Un gras INCONNU dans
  // le bloc redevient une assertion : c'est le contrat du bloc Smoke, et le
  // chemin inverse (l'avaler) est précisément le défaut corrigé ici.
  const champGras = new RegExp(
    `^${MARQUEUR_DE_LISTE}\\*\\*(?:${ALTERNANCE_NOMS})[ \\t]*:?\\*\\*[ \\t]*:?`,
    'i',
  );
  const termineLeBloc = (ligne: string): boolean =>
    champGras.test(ligne) ||
    champNonGras.test(ligne) ||
    /^---/.test(ligne) ||
    /^#{2,4}\s/.test(ligne) ||
    /^```/.test(ligne);

  const lignesSection = taskSection.split('\n');
  const debut = lignesSection.findIndex((l) => detectionDuChamp.test(l));
  if (debut === -1) return null;

  /**
   * Nomme ce qui ferme le bloc. La VALEUR de la ligne n'est jamais reprise :
   * c'est une commande qu'on refuse d'exécuter, la recopier dans un rapport
   * l'offre au copier-coller ET brouille la vérification d'absence d'appât du
   * harnais, qui ne saurait plus distinguer « exécuté » de « mentionné ». Le
   * nom du champ et son rang suffisent à retrouver la ligne.
   */
  const decrireLaFin = (ligne: string, rang: number): string => {
    const nonGras = ligne.match(new RegExp(`^${MARQUEUR_DE_LISTE}(${ALTERNANCE_NOMS})[ \\t]*:`, 'i'));
    if (nonGras) return `champ « ${nonGras[1]} » au dialecte non-gras (ligne +${rang})`;
    const gras = ligne.match(/\*\*([A-Za-z][^*\n]*?)\*\*/);
    if (gras) return `champ « ${gras[1].replace(/\s*:\s*$/, '')} » (ligne +${rang})`;
    if (/^---/.test(ligne)) return `séparateur --- (ligne +${rang})`;
    if (/^#{2,4}\s/.test(ligne)) return `heading (ligne +${rang})`;
    return `bloc de code (ligne +${rang})`;
  };

  const lines: string[] = [];
  let finDeBloc = 'fin de la section';
  for (let i = debut + 1; i < lignesSection.length; i++) {
    if (termineLeBloc(lignesSection[i])) {
      finDeBloc = decrireLaFin(lignesSection[i], i - debut);
      break;
    }
    lines.push(lignesSection[i]);
  }

  const config: SmokeConfig = { steps: [], finDeBloc };
  const refus: RefusDePuce[] = [];
  for (const [rang, line] of lines.entries()) {
    const trimmed = line.trim();
    // MÊME classe de marqueur que la détection du champ (`MARQUEUR_DE_LISTE`).
    // Review de T90 : la détection s'ouvrait à `*` et `+` alors que cette boucle
    // n'acceptait que `-`. Un `* **Smoke:**` suivi de `* assert: \`false\`` était
    // donc DÉTECTÉ puis vidé de son contenu — 0 step — et ressortait « champ
    // présent mais 0 assertion déclarée », skipped, exit 0. Un message FAUX (la
    // task en déclarait une) sur le mode de panne exact que T90 supprime.
    if (!/^[-*+]\s/.test(trimmed) && !/^[-*+]$/.test(trimmed)) continue;
    const item = trimmed.replace(/^[-*+]\s*/, '');

    // SECONDE GARDE, indépendante de la sentinelle de fin (T91) : une puce dont
    // le premier token est un NOM DE CHAMP connu n'est pas une assertion, quoi
    // qu'ait décidé la terminaison. Elle est refusée et JOURNALISÉE — jamais
    // exécutée, jamais tue.
    //
    // Redondante avec la sentinelle par construction, et c'est le sujet : cette
    // sentinelle a DÉJÀ été élargie une fois (review de T90, casse du champ
    // suivant) et un chemin d'exécution est passé derrière quand même. Deux
    // gardes qui se recouvrent valent mieux qu'une seule qu'on croit complète.
    // Le GRAS est pelé avant le test (re-review du 2026-08-12) : `**Statut:** v`
    // ne matchait pas `^(NOMS):` à cause du `**` de tête — la garde ne couvrait
    // que le dialecte non-gras, alors que la sentinelle vient d'être RESTREINTE
    // aux noms connus : les deux gardes doivent voir le même dialecte.
    const itemSansGras = item.replace(/^\*\*([^*\n]+?)\*\*[ \t]*/, '$1 ');
    const nomDeChamp = itemSansGras.match(new RegExp(`^(${ALTERNANCE_NOMS})[ \\t]*:`, 'i'));
    if (nomDeChamp) {
      refus.push({
        champ: nomDeChamp[1],
        ligne: rang + 1,
        motif: `puce refusée : « ${nomDeChamp[1]} » est un nom de champ, pas une assertion`,
      });
      continue;
    }

    // start_cmd line — `\s*` AVANT le colon : `- start_cmd : n/a` (espace
    // devant `:`) ne matchait pas et partait en ASSERTION, donc `n/a` lancé en
    // shell → FAIL sur une task dont toutes les vraies assertions passent.
    // 4 occurrences (T79, T81, T83, T85), corrigé 4× à la main.
    const startMatch = item.match(/^\s*start_cmd\s*:\s*(.*)$/i);
    if (startMatch) {
      const rawVal = stripItalicNote(startMatch[1]).trim();
      let cmd = '';
      if (rawVal) {
        try {
          cmd = parseBullet(rawVal).cmd;
        } catch {
          // Une valeur de start_cmd non parsable reste traitée comme littérale :
          // elle sera de toute façon filtrée par isSafeStartCmd.
          cmd = rawVal;
        }
      }
      // Sentinelles « pas de démarrage » → puce IGNORÉE, rien n'est exécuté.
      const sentinel = cmd.toLowerCase().replace(/[`*_]/g, '').trim();
      if (!sentinel || ['n/a', 'na', 'none', 'aucun', 'nil', '-', '–', '—'].includes(sentinel)) {
        continue;
      }
      config.startCmd = cmd;
      continue;
    }

    // assertion line — commande dans une paire de backticks, `→ note` optionnelle
    try {
      const { cmd, note } = parseBullet(item);
      if (cmd) config.steps.push({ cmd, note });
    } catch (err) {
      if (err instanceof SmokeParseError) {
        // Une puce ambiguë est un ÉCHEC NOMMÉ porté dans le report, pas une
        // commande devinée ni un silence.
        config.steps.push({
          cmd: item,
          errorCode: err.code,
          success: false,
          stdout: '',
          stderr: `${err.code}: ${err.message}`,
          durationMs: 0,
        });
        continue;
      }
      throw err;
    }
  }

  // Un en-tête `**Smoke:**` sans aucune commande d'assertion reste un skip pour
  // le gate (rien d'exécutable), MAIS la décision est prise par l'appelant et
  // plus ici : replier ce cas en `null` le rendait indiscernable d'un champ
  // absent, alors que les deux ne disent pas la même chose — l'un ne prétend
  // pas être gardé, l'autre le prétend et ne l'est pas (T90). Le verdict et le
  // code de sortie sont inchangés, seul le message du rapport les sépare.
  if (refus.length > 0) config.refus = refus;
  return config;
}

// ── port polling ─────────────────────────────────────────────────────────────
/** Best-effort extraction of a TCP port from start_cmd or assertion commands. */
function detectPort(config: SmokeConfig): number | null {
  const haystack = [config.startCmd || '', ...config.steps.map((s) => s.cmd)].join(' ');
  // localhost:3000, 127.0.0.1:8080, :$PORT (env), --port 5000, PORT=4000
  const explicit = haystack.match(/(?:localhost|127\.0\.0\.1)[:/](\d{2,5})/);
  if (explicit) return parseInt(explicit[1], 10);
  const portFlag = haystack.match(/(?:--port[= ]|PORT=)(\d{2,5})/);
  if (portFlag) return parseInt(portFlag[1], 10);
  // `:$PORT` with PORT exported in start_cmd (e.g. PORT=4000 npm run dev)
  if (/:\$PORT/.test(haystack)) {
    const envPort = haystack.match(/PORT=(\d{2,5})/);
    if (envPort) return parseInt(envPort[1], 10);
    if (process.env.PORT) return parseInt(process.env.PORT, 10);
  }
  return null;
}

function checkPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1000);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ── process lifecycle ─────────────────────────────────────────────────────────
/**
 * Basenames d'interpréteurs autorisés en `start_cmd`. Exactement ceux qui
 * vivaient déjà dans l'allowlist par préfixe — aucun ajout (Boundaries T183).
 */
const ALLOWED_START_BASENAMES = new Set([
  'npm',
  'pnpm',
  'yarn',
  'npx',
  'node',
  'python',
  'python3',
]);

/**
 * Un `start_cmd` est sûr si son interpréteur est dans l'allowlist ET qu'il ne
 * peut pas lancer autre chose que lui.
 *
 * L'ancien filtre comparait des PRÉFIXES (`cmd.startsWith('python ')`), ce qui
 * refusait tout interpréteur qualifié par un chemin — `venv/bin/python -m
 * uvicorn`, `./venv/bin/python` — alors que c'est la forme normale d'un module
 * à venv. Six occurrences au moins, dont trois dans un seul run.
 *
 * On raisonne désormais sur le BASENAME du premier mot, sous trois verrous qui
 * ferment la porte que le préfixe fermait par accident :
 *   • aucun chaînage ni substitution (`&&`, `;`, `|`, `&`, backtick, `$(`) —
 *     sinon `python3 -m http.server && curl evil` passerait sur son seul
 *     premier segment ;
 *   • aucun chemin ABSOLU — un `start_cmd` boote le module du repo, pas un
 *     binaire système ;
 *   • aucun `..` — pas de remontée hors du repo pour aller chercher un
 *     interpréteur homonyme.
 *
 * Le cas `PORT=…` reste accepté, mais n'est plus un laissez-passer : on retire
 * l'affectation en tête et on valide la commande qui SUIT. Avant, `PORT=1
 * ./bin/rm -rf /` passait parce que la chaîne commençait par `PORT=`.
 */
function isSafeStartCmd(cmd: string): boolean {
  let rest = cmd.trim();
  if (!rest) return false;

  // Chaînage / backgrounding / substitution : refus, quel que soit le premier
  // segment. Le `&` final légitime a déjà été retiré par l'appelant.
  if (/[;|&`]/.test(rest) || rest.includes('$(')) return false;

  // Affectation d'env en tête (contrat historique : `PORT=`), puis on juge ce
  // qui vient après.
  if (rest.startsWith('PORT=')) {
    rest = rest.slice(rest.indexOf('=') + 1).replace(/^\S*\s*/, '');
    if (!rest) return false;
  }

  const first = rest.split(/\s+/)[0];
  if (!first) return false;
  if (path.isAbsolute(first)) return false;
  if (first.split('/').includes('..')) return false;

  return ALLOWED_START_BASENAMES.has(path.basename(first));
}

function signalProcess(child: ChildProcess, sig: NodeJS.Signals): void {
  if (!child.pid) return;
  try {
    // Signal the whole process group (spawned detached ⇒ negative pid).
    process.kill(-child.pid, sig);
  } catch {
    try {
      child.kill(sig);
    } catch {
      /* already gone */
    }
  }
}

/** Le groupe de processus existe-t-il encore ? (signal 0 = sonde, ne tue rien) */
function groupAlive(child: ChildProcess): boolean {
  if (!child.pid) return false;
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reap the spawned process group: SIGTERM, wait for it to die, then SIGKILL.
 * Escalation is awaited by the caller so it completes BEFORE `process.exit()`
 * tears down the event loop — a `setTimeout` would not fire.
 *
 * On SONDE le groupe au lieu d'attendre `graceMs` en aveugle : quand plus rien
 * ne survit — le cas de très loin le plus fréquent pour une assertion — on rend
 * la main immédiatement. Sans cette sonde, chaque assertion payait la grâce
 * entière (1,5 s) pour un process déjà mort.
 */
async function reapGroup(child: ChildProcess, graceMs: number): Promise<void> {
  if (!child.pid || !groupAlive(child)) return;
  signalProcess(child, 'SIGTERM');
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25));
    if (!groupAlive(child)) return;
  }
  signalProcess(child, 'SIGKILL');
  await new Promise((r) => setTimeout(r, 100));
}

/** Reaping du start_cmd : grâce longue, un serveur mérite un arrêt propre. */
async function killProcess(child: ChildProcess): Promise<void> {
  if (!child.pid || child.killed) return;
  await reapGroup(child, 1500);
}

// ── assertions ─────────────────────────────────────────────────────────────
/**
 * Exécute UNE assertion dans son propre groupe de processus.
 *
 * L'interpréteur est **`/bin/bash`**, et c'est un choix, pas un détail. Le champ
 * `**Smoke:**` est spécifié « shell » (task-schema.md, §Disjonction Smoke ⟂
 * Recettage) sans nommer de dialecte : le Speccer y écrit du bash, ce lecteur
 * exécutait du `/bin/sh`, strictement plus pauvre. Une assertion PARFAITEMENT
 * VALIDE échouait donc sur une erreur de syntaxe — pas sur la propriété qu'elle
 * teste. Constaté sur T210 (2026-09-14) : `diff <(sed …) <(sed …)`, refusé par
 * `/bin/sh` qui ne connaît pas la substitution de processus, alors que les trois
 * critères que l'assertion vérifie étaient tenus. Un gate qui rougit sur son
 * propre lecteur n'apprend rien à personne, et pousse à réécrire le test pour le
 * faire verdir — exactement ce qu'on interdit par ailleurs.
 *
 * `detached: true` donne au shell un groupe à lui ; tout ce qu'il lance — y
 * compris un `cmd &` backgroundé — y reste. Le `finally` reape ce groupe
 * (SIGTERM → SIGKILL) : aucun process ne survit à l'assertion, quelle que soit
 * la syntaxe shell employée.
 *
 * C'est ce qui remplace `isSafeAssertCmd`, qui tentait de repérer un
 * backgrounding en manipulant le TEXTE de la commande. Ce screening a produit
 * deux FAUX VERTS successifs, chacun trouvé par une passe de review distincte
 * (`&>` que dash lit `&` puis `>`, puis une parité de backslashes mal comptée
 * sur `\\&`) et un faux refus jamais corrigé (`echo "a & b"`, où l'esperluette
 * est quotée donc inerte). On ne parse pas du shell à coups de regex : on
 * confine et on reape.
 *
 * On attend `exit` et NON `close` : un enfant backgroundé hérite des pipes
 * stdout/stderr, donc `close` n'arriverait qu'à la mort de l'orphelin — soit
 * jamais avant le timeout. `exit` rend le code de sortie du shell dès qu'il se
 * termine, et le drain des sorties reste borné juste après.
 */
async function runAssertion(step: SmokeStep, timeoutMs: number = ASSERT_TIMEOUT_MS): Promise<SmokeStep> {
  const start = Date.now();
  // Puce déjà refusée au parsing (SMOKE_PARSE_AMBIGUOUS) : on n'exécute RIEN.
  if (step.errorCode) return step;

  let child: ChildProcess | null = null;
  let stdout = '';
  let stderr = '';

  try {
    child = spawn('/bin/bash', ['-c', step.cmd], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      env: { ...process.env },
    });

    // On DRAINE toujours les pipes (cesser de lire bloquerait l'enfant sur un
    // pipe plein) mais on ne RETIENT qu'une queue bornée. `execSync` avait un
    // `maxBuffer` ; sans équivalent ici, une assertion bavarde (`yes`) ferait
    // grossir ces chaînes pendant tout le timeout jusqu'à l'OOM — et un crash
    // du process Node saute le `finally`, donc laisse vivre le groupe detached
    // qu'on prétend justement reaper. Le cap est très au-dessus des 2000
    // derniers caractères effectivement rapportés.
    const append = (buf: string, chunk: string): string => {
      const s = buf + chunk;
      return s.length > OUTPUT_CAP_BYTES ? s.slice(-OUTPUT_CAP_BYTES) : s;
    };
    child.stdout?.on('data', (d) => {
      stdout = append(stdout, String(d));
    });
    child.stderr?.on('data', (d) => {
      stderr = append(stderr, String(d));
    });

    type Outcome = {
      code: number | null;
      signal: NodeJS.Signals | null;
      timedOut: boolean;
      spawnError?: Error;
    };

    const outcome = await new Promise<Outcome>((resolve) => {
      let settled = false;
      const settle = (r: Outcome) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(r);
      };
      const timer = setTimeout(
        () => settle({ code: null, signal: null, timedOut: true }),
        timeoutMs
      );
      child!.on('error', (e) =>
        settle({ code: null, signal: null, timedOut: false, spawnError: e as Error })
      );
      child!.on('exit', (code, signal) => settle({ code, signal, timedOut: false }));
    });

    // Laisser les pipes se vider — attente BORNÉE, pour ne jamais se bloquer
    // sur un orphelin qui les tiendrait ouverts.
    await new Promise((r) => setTimeout(r, 50));

    if (outcome.spawnError) throw outcome.spawnError;

    if (outcome.timedOut) {
      // Un TIMEOUT n'est PAS un échec d'assertion (acquis T160) : la commande a
      // été TUÉE avant de conclure, son verdict est INCONNU. Le déguiser en
      // FAIL faisait « corriger » du code valide par le runner.
      step.success = false;
      step.errorCode = 'SMOKE_ASSERT_TIMEOUT';
      step.stdout = stdout.slice(-2000);
      step.stderr = `assert timeout after ${timeoutMs}ms (commande TUÉE, verdict d'assertion INCONNU — pas un échec) — déclarer un `+"`**Timeout:** <secondes>`"+` sur la task (plafond ${ASSERT_TIMEOUT_CAP_MS / 1000}s) ou relancer avec SMOKE_ASSERT_TIMEOUT_MS plus haut si la commande est légitimement lente`;
    } else {
      step.success = outcome.code === 0;
      step.stdout = stdout.slice(-2000);
      step.stderr = step.success
        ? ''
        : (stderr || `exit ${outcome.code ?? `signal ${outcome.signal}`}`).slice(-2000);
    }
  } catch (err: unknown) {
    step.success = false;
    step.stdout = stdout.slice(-2000);
    step.stderr = (err instanceof Error ? err.message : String(err)).slice(-2000);
  } finally {
    // TOUJOURS reaper le groupe — c'est CE geste qui rend le screening inutile.
    if (child) await reapGroup(child, 300);
  }

  step.durationMs = Date.now() - start;
  return step;
}

// ── report ─────────────────────────────────────────────────────────────────
function writeReport(taskId: string, report: SmokeReport): string {
  const outDir = path.join(process.cwd(), '.shikamaru', 'smoke', taskId);
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const { taskId, tasksFile } = parseArgs();
  const timestamp = new Date().toISOString();

  console.log(`\n🔥 Smoke gate for ${taskId}`);
  console.log('━'.repeat(40));

  if (!fs.existsSync(tasksFile)) {
    // Missing source is a runner error, not a pass.
    const report: SmokeReport = {
      task: taskId,
      verdict: 'error',
      steps: [],
      stdout: '',
      stderr: '',
      message: `TASKS file not found: ${tasksFile}`,
      timestamp,
    };
    writeReport(taskId, report);
    console.error(`❌ ${report.message}`);
    // Modular monolith : le TASKS.md vit dans les sous-projets — guider au lieu
    // d'échouer sur le seul chemin par défaut. Même contrat que
    // archive-done-tasks.ts. Purement additif : le verdict reste `error` et le
    // code de sortie reste 1 dans tous les cas.
    if (fs.existsSync('subprojects')) {
      const candidates = fs
        .readdirSync('subprojects', { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join('subprojects', d.name, 'TASKS.md'))
        .filter((c) => fs.existsSync(c));
      if (candidates.length > 0) {
        console.error(`   Modular monolith détecté — passer le fichier explicitement :`);
        for (const c of candidates) {
          console.error(`   npx tsx scripts/smoke.ts --task ${taskId} --tasks-file ${c}`);
        }
      } else {
        console.error(`   subprojects/ présent mais aucun TASKS.md trouvé dedans — vérifier le chemin passé.`);
      }
    }
    process.exit(1);
  }

  const content = fs.readFileSync(tasksFile, 'utf-8');
  const section = extractTaskSection(content, taskId);

  if (!section) {
    const report: SmokeReport = {
      task: taskId,
      verdict: 'error',
      steps: [],
      stdout: '',
      stderr: '',
      message: `Task ${taskId} not found in ${tasksFile}`,
      timestamp,
    };
    writeReport(taskId, report);
    console.error(`❌ ${report.message}`);
    process.exit(1);
  }

  const assertTimeoutMs = parseAssertTimeoutMs(section);
  const config = parseSmoke(section);

  // Deux « rien à jouer » distincts, jusqu'ici indiscernables — tous deux rendent
  // « skipped » et exit 0, ce qui est exactement la confusion qui a laissé 31
  // assertions dormir sans que personne le voie (T90) :
  //   • champ ABSENT       → la task ne prétend pas être gardée, le skip est juste ;
  //   • champ PRÉSENT VIDE → la task PRÉTEND être gardée et ne l'est pas.
  // Le second garde exit 0 (contrat de la section T904 du harnais, où le champ
  // vide est suivi d'un `git revert HEAD` en appât), mais il se NOMME dans le
  // rapport, de sorte qu'un resserrement futur soit possible sans archéologie.
  // `&& !config.startCmd` reproduit à l'identique la condition qui vivait dans
  // parseSmoke : un bloc ne portant qu'un `start_cmd` continue de démarrer
  // l'app et de sortir PASS (0/0), il n'est PAS traité comme vide.
  const champPresentMaisVide =
    config !== null && config.steps.length === 0 && !config.startCmd;
  if (!config || champPresentMaisVide) {
    const message = champPresentMaisVide
      ? '**Smoke:** field present but declares 0 assertion — nothing to gate.'
      : 'No **Smoke:** field — nothing to gate.';
    const report: SmokeReport = {
      task: taskId,
      verdict: 'skipped',
      steps: [],
      refus: config?.refus,
      finDeBloc: config?.finDeBloc,
      stdout: '',
      stderr: '',
      message,
      timestamp,
    };
    writeReport(taskId, report);
    console.log(champPresentMaisVide
      ? '⏭️  **Smoke:** présent mais 0 assertion déclarée — skipped (exit 0).'
      : '⏭️  No **Smoke:** field — skipped (exit 0).');
    for (const r of config?.refus ?? []) console.log(`   ↷ ${r.motif} (ligne +${r.ligne})`);
    if (config?.finDeBloc) console.log(`   ⏹ bloc terminé par : ${config.finDeBloc}`);
    process.exit(0);
  }

  console.log(`📋 Assertions: ${config.steps.length}${config.startCmd ? ` · start_cmd: ${config.startCmd}` : ''} · timeout/assert: ${assertTimeoutMs}ms`);
  // Le refus est BRUYANT : une puce écartée en silence est indiscernable d'une
  // puce oubliée, et c'est ce silence-là qui a laissé 31 assertions dormir.
  for (const r of config.refus ?? []) console.log(`   ↷ ${r.motif} (ligne +${r.ligne})`);
  if (config.finDeBloc) console.log(`   ⏹ bloc terminé par : ${config.finDeBloc}`);

  let child: ChildProcess | null = null;
  let verdict: Verdict = 'PASS';
  let message: string | undefined;

  try {
    // 1) Boot the app if a start_cmd is provided.
    if (config.startCmd) {
      // Strip a trailing `&` — we background it ourselves via detached spawn.
      const cmd = config.startCmd.replace(/\s*&\s*$/, '');

      if (!isSafeStartCmd(cmd)) {
        throw new Error(
          `Unsafe start_cmd: "${cmd}". Interpréteur autorisé (basename) : ${[...ALLOWED_START_BASENAMES].join('/')}, éventuellement préfixé PORT=. Chemin absolu, "..", et tout chaînage (&& ; | & \` $()) sont refusés.`
        );
      }

      console.log(`🚀 start_cmd: ${cmd}`);
      // `sh` et non `bash`, à l'inverse des assertions : `isSafeStartCmd` vient
      // de refuser tout chaînage (`&& ; | & \` $()`) et n'a laissé passer qu'un
      // interpréteur de la liste blanche, éventuellement préfixé `PORT=`. Il n'y
      // a donc aucune syntaxe shell à interpréter ici — le shell n'est qu'un
      // exec. Aligner ce site sur bash n'apporterait rien et élargirait la
      // surface pour rien.
      child = spawn('sh', ['-c', cmd], {
        stdio: 'pipe',
        detached: true,
        env: { ...process.env },
      });

      const port = detectPort(config);
      if (port) {
        console.log(`   Polling port ${port} (timeout ${START_TIMEOUT_MS}ms)...`);
        const ready = await waitForPort(port, START_TIMEOUT_MS);
        if (!ready) {
          verdict = 'FAIL';
          message = `start timeout: port ${port} never opened within ${START_TIMEOUT_MS}ms`;
          console.error(`❌ ${message}`);
        }
      } else {
        // No detectable port → give the process a fixed grace period.
        const graceMs = Math.min(START_TIMEOUT_MS, 8000);
        console.log(`   No port detected — waiting ${graceMs}ms grace period...`);
        await new Promise((r) => setTimeout(r, graceMs));
      }
    }

    // 2) Run assertions (skip if boot already failed).
    if (verdict !== 'FAIL') {
      // Les deux causes d'échec sont comptées SÉPARÉMENT, et le verdict n'est
      // arrêté qu'une fois la boucle finie (T177).
      //
      // Avant, chaque étape non-verte écrivait `verdict = 'FAIL'` sur place. Le
      // timeout tombait donc dans la même case que l'échec mesuré, alors que le
      // code écrit lui-même, deux fonctions plus haut, « commande TUÉE, verdict
      // d'assertion INCONNU — pas un échec » (acquis T160) : le rapport
      // ACCUSAIT un livrable que personne n'avait mesuré, et le runner partait
      // « corriger » du code valide. `error` dit la mesure impossible.
      //
      // La sévérité, elle, ne bouge pas : `error` sort en exit 1 comme `FAIL`
      // (voir le `process.exit` en fin de main) — donc `needs-review`. On change
      // l'étiquette de la cause, jamais le fait que le gate BLOQUE. Déguiser un
      // timeout en PASS serait le faux vert que ce gate existe pour supprimer.
      let echecMesure = false;
      let mesureImpossible = false;
      for (let i = 0; i < config.steps.length; i++) {
        const step = config.steps[i];
        console.log(`\n⏳ [${i + 1}/${config.steps.length}] ${step.cmd}`);
        await runAssertion(step, assertTimeoutMs);
        if (step.success) {
          console.log(`   ✅ PASS (${step.durationMs}ms)`);
        } else {
          // SEUL le timeout d'assertion est une mesure impossible. Tout le
          // reste — exit ≠ 0, crash du shell, SMOKE_PARSE_AMBIGUOUS — a
          // CONCLU, et reste un échec mesuré.
          if (step.errorCode === 'SMOKE_ASSERT_TIMEOUT') mesureImpossible = true;
          else echecMesure = true;
          // L'étiquette dit la CAUSE (timeout / parsing / commande refusée),
          // jamais un « FAIL » indifférencié.
          const label =
            step.errorCode === 'SMOKE_ASSERT_TIMEOUT'
              ? 'TIMEOUT'
              : step.errorCode || 'FAIL';
          console.log(`   ❌ ${label} (${step.durationMs}ms): ${step.stderr?.split('\n')[0] || 'assertion failed'}`);
        }
      }
      // PRÉCÉDENCE : un échec MESURÉ prime sur une mesure impossible. Quand les
      // deux coexistent, quelque chose a bel et bien conclu à l'échec — le
      // masquer derrière `error` fabriquerait un faux vert d'un genre nouveau,
      // où un vrai échec se ferait recouvrir par un voisin lent (section T913).
      if (echecMesure) {
        verdict = 'FAIL';
      } else if (mesureImpossible) {
        verdict = 'error';
        const tues = config.steps.filter(
          (s) => !s.success && s.errorCode === 'SMOKE_ASSERT_TIMEOUT',
        ).length;
        // Le rapport NOMME la cause. Le hint « relancer avec
        // SMOKE_ASSERT_TIMEOUT_MS plus haut » vit déjà dans le stderr de
        // l'étape, il n'est pas recopié ici.
        message =
          `assert timeout: ${tues}/${config.steps.length} assertion(s) TUÉE(S) avant de conclure — ` +
          `verdict d'assertion INCONNU, aucun échec mesuré`;
        console.error(`❌ ${message}`);
      }
      if (config.steps.length === 0) {
        // start_cmd only, no assertion — boot success is the only signal.
        message = message || 'start_cmd booted, no assertion to run';
      }
    }
  } catch (err: unknown) {
    // Runner-internal crash → error verdict, never a silent pass.
    verdict = 'error';
    message = `smoke internal error: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`❌ ${message}`);
  } finally {
    // ALWAYS reap the spawned process group (SIGTERM → SIGKILL), awaited so
    // escalation completes before process.exit tears down the event loop.
    if (child) {
      console.log('\n🛑 Killing spawned process...');
      await killProcess(child);
    }
  }

  const aggStdout = config.steps.map((s) => s.stdout || '').join('\n').slice(-4000);
  const aggStderr = config.steps.map((s) => s.stderr || '').join('\n').slice(-4000);

  const report: SmokeReport = {
    task: taskId,
    verdict,
    startCmd: config.startCmd,
    steps: config.steps,
    refus: config.refus,
    finDeBloc: config.finDeBloc,
    stdout: aggStdout,
    stderr: aggStderr,
    message,
    timestamp,
  };
  const reportPath = writeReport(taskId, report);

  console.log('\n' + '━'.repeat(40));
  console.log(`📄 Report: ${reportPath}`);
  const passed = config.steps.filter((s) => s.success).length;
  console.log(`📊 Verdict: ${verdict} (${passed}/${config.steps.length} assertions passed)`);

  process.exit(verdict === 'PASS' ? 0 : 1);
}

main().catch((error) => {
  // Last-resort guard: never exit 0 on an unhandled throw.
  console.error('Fatal error:', error);
  process.exit(1);
});
