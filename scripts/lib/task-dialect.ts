/**
 * Dialecte Markdown des tasks — source unique.
 *
 * Trois scripts implémentaient séparément la MÊME grammaire de header :
 * `extractTaskSection` de smoke.ts, `headerRe` de validate.ts, et
 * `TASK_HEADER_NUM`/`TASK_HEADER_ALPHA` d'archive-done-tasks.ts. Elles avaient
 * déjà divergé (flag `/i` seulement dans archive, lookahead de séparateur
 * seulement dans validate) : corriger l'une faisait décrocher les autres.
 * Signalé par 2 reviewers indépendants (review T157 P3).
 *
 * Grammaire — canonique `### T155 — titre` (schemas/tasks-schema.md), avec
 * tolérance de LECTURE pour le legacy `### Task 72:` et le dialecte client
 * `## T2 —` (KONBINI/pythia-lab, T155).
 *
 * Deux branches d'ID, volontairement dissymétriques :
 *  - NUMÉRIQUE `T?\d+[a-z]?` — le `T` est optionnel et tolère la minuscule
 *    (archive l'acceptait via un `/i` global). La minuscule est portée par la
 *    classe `[Tt]` et NON par un flag `/i` : un `/i` global rendrait `[A-Z]+`
 *    de la branche alpha insensible à la casse, et tout titre de doc en
 *    minuscules (`## api-first design`) deviendrait une task fantôme.
 *  - ALPHA `[A-Z]+[0-9-][A-Z0-9-]*[a-z]?` — couvre les préfixes projet
 *    (`EMAIL-1`, `CRM0-1`, `V3-C1`). EXIGE un séparateur derrière l'ID
 *    (lookahead, review T157 P1) sans quoi `## API-first design` ou
 *    `## CI-CD pipeline` deviennent des tasks fantômes.
 */

/**
 * DEUX NIVEAUX DE STRICTESSE, volontairement distincts — mesurés sur le corpus
 * réel (100 TASKS.md de ~/Projects, 5 891 headings) avant d'être figés :
 *
 *  - ÉNUMÉRER les tasks (validate.ts) → STRICT : la branche alpha exige un
 *    séparateur. Sans lui, `## API-first design` devient une task fantôme et le
 *    gate part faux-ROUGE (review T157 P1).
 *  - FERMER une section (smoke.ts, archive-done-tasks.ts) → TOLÉRANT : pas de
 *    séparateur exigé.
 *
 * Aligner le second sur le premier « pour unifier » est une RÉGRESSION mesurée :
 * 18+ headings de vrais TASKS.md n'ont aucun séparateur (`## T-EMAIL-KILL-
 * INTERNAL-SIGN` ×14, `## T-REVIEW-PUBLIC-ROUTE-NULL-CHECK`, `### V1.2-D4`,
 * `### Task T-R4 [done]:`). Ils cesseraient d'être des frontières, et leur
 * contenu serait absorbé par le bloc PRÉCÉDENT — dans un script qui SUPPRIME
 * des sections (`--apply`). La prémisse qui rend le lookahead sûr côté
 * validate.ts est sa garde anti-silence (un heading non reconnu porteur d'un
 * champ statut lève une ERREUR) ; archive-done-tasks.ts n'a pas cette garde,
 * son mode d'échec est l'absorption SILENCIEUSE.
 */

/** STRICT — énumération. Corps sans flags : une regex `g` est STATEFUL, ne jamais partager l'instance. */
export const TASK_HEADER_SOURCE =
  String.raw`^#{2,3}\s+(?:[Tt]ask\s+)?([Tt]?\d+[a-z]?|[A-Z]+[0-9-][A-Z0-9-]*[a-z]?(?=\s*[—:–-]\s))\s*[—:–-]?[^\n]*$`;

/** Nouvelle instance de la regex STRICTE. `flags` doit contenir `m`. */
export function taskHeaderRegex(flags = 'gm'): RegExp {
  return new RegExp(TASK_HEADER_SOURCE, flags);
}

/** TOLÉRANT — frontière de section. Le `[Tt]` porte la minuscule à la place d'un `/i` global, qui rendrait `[A-Z]+` insensible à la casse et ferait de tout titre en minuscules une frontière. */
// Suffixe `[A-Za-z]?` et non `[a-z]?` : le `/i` de l'ancienne TASK_HEADER_NUM
// d'archive-done-tasks.ts rendait AUSSI le suffixe insensible à la casse, donc
// `### T72B` était une frontière. Absent des 5 891 headings du corpus réel —
// donc invisible à la mesure — mais vrai par construction : le restreindre
// aurait fait absorber une telle task par le bloc précédent.
// Le préfixe `Task` est insensible à la casse sur la branche NUMÉRIQUE (`## TASK 5`)
// et sensible sur la branche ALPHA — reproduction EXACTE du couple
// TASK_HEADER_NUM (`/i`) / TASK_HEADER_ALPHA (sans `/i`) d'archive-done-tasks.ts.
// Épelé en classes plutôt qu'avec un flag `/i` : un `/i` porté sur la branche
// alpha rendrait `[A-Z]+` insensible à la casse, et tout titre en minuscules
// (`## api-first design`) deviendrait une frontière de task.
export const TASK_BOUNDARY_NUM = /^#{2,3}\s+(?:[Tt][Aa][Ss][Kk]\s+)?[Tt]?\d+[A-Za-z]?\b/;
// `[Tt]ask` et non `Task` : la regex STRICTE et extractTaskSection acceptent la
// minuscule. Pinner la frontière sur `Task` seul créait une INCOHÉRENCE dont le
// prix est destructif — `### task EMAIL-1: …` était une task pour validate mais
// PAS une frontière pour archive, donc absorbée par un bloc `done` qui la
// précède et SUPPRIMÉE par `--apply` (et smoke lui attribuait les assertions de
// la task d'avant). Entre les deux, on élargit : plus de frontières = moins
// d'absorption, c'est le sens sûr pour un script qui supprime.
export const TASK_BOUNDARY_ALPHA = /^#{2,3}\s+(?:[Tt]ask\s+)?[A-Z]+[0-9-][A-Z0-9-]*[a-z]?\b/;

/** Une ligne ouvre-t-elle une nouvelle task ? (niveau TOLÉRANT — ferme une section) */
export function isTaskBoundary(line: string): boolean {
  return TASK_BOUNDARY_NUM.test(line) || TASK_BOUNDARY_ALPHA.test(line);
}

/**
 * Headings de CHAMP du dialecte client (`### Statut`, `### Smoke`…). Ce sont
 * des champs, pas des frontières de bloc : les traiter comme des frontières
 * vidait le bloc de la task et perdait ses erreurs (confirmation T157).
 */
export const FIELD_HEADING =
  /^#{3,4}\s+(Statut|Status|Smoke|TDD|Prompt|Files?|Goal|Context|Contexte|Crit[eè]re|Done|Boundaries|Fallback|Rollback|Recettage|Design|Review|Tier|Dur[ée]e|Progress|Notes?|Blocked|Completed|PR|Assignee|Reviewer|Edge cases?|Type|Depends|Created|Branch)\b/i;

export interface TaskHeader {
  /** Index du début du heading dans le contenu. */
  index: number;
  /** Ligne de heading complète, telle quelle. */
  raw: string;
  /** ID capturé brut (`155`, `T155`, `t155b`, `EMAIL-1`). */
  rawId: string;
  /** ID normalisé : numérique → `T155` ; alpha → inchangé, en majuscules. */
  id: string;
}

/**
 * Normalise un ID de task. Les IDs numériques rejoignent l'espace `T`-majuscule
 * (`72`, `t72b` → `T72`/`T72B`) ; les IDs alpha restent TELS QUELS (review T157
 * P3 — les préfixer de `T` fabriquait des `TEMAIL-1` introuvables au grep).
 */
export function normalizeTaskId(rawId: string): string {
  return /^\d/.test(rawId) ? `T${rawId}`.toUpperCase() : rawId.toUpperCase();
}

/** Tous les headers de task du document, dans l'ordre d'apparition. */
export function findTaskHeaders(content: string): TaskHeader[] {
  return [...content.matchAll(taskHeaderRegex('gm'))].map((m) => ({
    index: m.index!,
    raw: m[0],
    rawId: m[1],
    id: normalizeTaskId(m[1]),
  }));
}

/**
 * Isole la section d'une task, au niveau TOLÉRANT (localisation ET fermeture) :
 * ce qui compte ici est de ne perdre AUCUNE frontière réelle, pas d'écarter les
 * titres de doc — c'est le rôle du niveau strict côté validate.ts.
 * Retourne null si la task est introuvable — jamais une section vide silencieuse.
 */
export function extractTaskSection(content: string, taskId: string): string | null {
  // `T160` → `160` ; un ID alpha (`SMOKE1`, `EMAIL-1`) reste entier.
  const bare = taskId.replace(/^[Tt](?=\d)/, '');
  const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingRe = new RegExp(String.raw`^#{2,3}\s+(?:[Tt]ask\s+)?[Tt]?${escaped}\b.*$`, 'm');
  const headingMatch = headingRe.exec(content);
  if (!headingMatch) return null;

  const startIdx = headingMatch.index;
  const afterHeading = startIdx + headingMatch[0].length;
  const rest = content.slice(afterHeading);
  // Les headings de CHAMP du dialecte client (`### Smoke`, `### Statut`) ne
  // ferment PAS la section — ce sont des champs de la task en cours.
  const boundaries = [
    rest.search(new RegExp(TASK_BOUNDARY_NUM.source, 'm')),
    rest.search(new RegExp(TASK_BOUNDARY_ALPHA.source, 'm')),
  ].filter((n) => n !== -1);
  const next = boundaries.length ? Math.min(...boundaries) : -1;
  return content.slice(startIdx, next === -1 ? content.length : afterHeading + next);
}

/**
 * Résout le chemin du fichier de tasks depuis argv — `--tasks-file <path>` OU
 * un positionnel, indifféremment.
 *
 * Avant, smoke.ts EXIGEAIT `--tasks-file` et archive-done-tasks.ts n'acceptait
 * qu'un positionnel, où `--tasks-file` tombait dans son `args.find(a =>
 * !a.startsWith("--"))` : le flag était ignoré et c'est le path SUIVANT qui
 * était consommé — la coïncidence masquait l'asymétrie.
 */
export function resolveTasksFile(args: string[], fallback = 'TASKS.md'): string {
  const flagIndex = args.indexOf('--tasks-file');
  if (flagIndex !== -1 && args[flagIndex + 1] && !args[flagIndex + 1].startsWith('--')) {
    return args[flagIndex + 1];
  }
  // Positionnel : tout ce qui n'est ni un flag, ni la VALEUR d'un flag connu.
  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tasks-file' || args[i] === '--task') {
      consumed.add(i);
      consumed.add(i + 1);
    }
  }
  const positional = args.find((a, i) => !a.startsWith('--') && !consumed.has(i));
  return positional || fallback;
}
