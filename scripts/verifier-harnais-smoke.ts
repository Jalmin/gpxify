#!/usr/bin/env npx tsx
/**
 * Vérificateur du harnais de parsing du gate Smoke (T90).
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * `scripts/__fixtures__/smoke-parse.md` déclarait ses verdicts attendus dans
 * une TABLE MARKDOWN que rien n'assérait. Deux des six étaient faux depuis T47
 * sans que personne le voie :
 *
 *   - T900 (`- **Smoke:**` en puce) devait sortir PASS  → sortait « skipped »
 *   - T903 (puce dont l'assert est `false`) devait sortir FAIL → sortait « skipped »
 *
 * T903 est le canari du harnais : son Goal dit mot pour mot « prouver que le
 * FAUX VERT a disparu ». Il sortait vert. Le défaut était invisible parce que
 * PASS et « skipped » rendent tous les deux exit 0 : aucun `&&` en shell, aucun
 * CI, ne pouvait les distinguer.
 *
 * Ce script porte les verdicts attendus EN CODE et sort en code ≠ 0 à la
 * première divergence. La table du fixture devient le miroir lisible de ce
 * tableau-ci, plus la seule trace de l'intention.
 *
 * Usage :
 *   npx tsx scripts/verifier-harnais-smoke.ts
 *   npx tsx scripts/verifier-harnais-smoke.ts --prouver-la-derive
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_HEADING } from './lib/task-dialect.js';

const FIXTURE = 'scripts/__fixtures__/smoke-parse.md';
const RACINE = process.cwd();

/** Classe de message rendue par smoke.ts quand aucune assertion n'est à jouer. */
type ClasseDeMessage = 'champ-absent' | 'champ-vide' | 'assertions';

interface Attendu {
  section: string;
  /** Verdict attendu dans `.shikamaru/smoke/{section}/report.json`. */
  verdict: 'PASS' | 'FAIL' | 'skipped' | 'error';
  /** Code de sortie attendu du process `smoke.ts`. */
  code: number;
  /** Nombre d'assertions que le parseur doit avoir RETENUES (pas exécutées avec succès). */
  assertions: number;
  /** Distingue « pas de champ du tout » de « champ présent mais vide ». */
  classe: ClasseDeMessage;
  /**
   * Sentinelle d'appât qui ne doit apparaître NULLE PART dans le rapport.
   *
   * Le compte d'assertions ne suffit pas à prouver qu'un appât n'a pas été
   * capté : une régression pourrait le retenir À LA PLACE d'une assertion
   * légitime et laisser le compte juste. Cette vérification est ce qui rend le
   * désarmement des appâts (T91) sans perte de preuve — mieux, elle prouve plus
   * qu'avant, et sans avoir à faire feu.
   */
  absentDuRapport?: string;
  /**
   * Nombre de puces que le parseur doit avoir REFUSÉES par nom de champ
   * (seconde garde de T91). Zéro partout tant que la sentinelle de fin tient :
   * la garde est un FILET, elle ne doit jamais servir sur le chemin nominal.
   * Ce compte est ce qui rend son déclenchement VISIBLE — sans lui, une
   * régression de la sentinelle serait rattrapée en silence par le filet, et
   * un harnais qui ne voit pas la régression qu'il rattrape est décoratif.
   */
  refusAttendus?: number;
  /** Fragment attendu dans la phrase « bloc terminé par … » du rapport. */
  finDeBlocContient?: string;
  /**
   * Variables d'environnement ajoutées à celles du vérificateur pour CETTE
   * section seulement (T177).
   *
   * Le comportement de deux sections dépend d'un réglage du gate lui-même
   * (`SMOKE_ASSERT_TIMEOUT_MS`), pas du seul texte du fixture : sous le défaut
   * de 60 s, un `sleep 30` conclurait normalement et la section mesurerait
   * l'inverse de ce qu'elle prétend prouver. Le réglage vit donc à côté du
   * verdict attendu, dans le même tableau — et non dans un export global du
   * shell, qui s'appliquerait aux 14 sections et rendrait le harnais dépendant
   * de la façon dont on l'a lancé.
   */
  env?: Record<string, string>;
  /** Ce que la section prouve — repris tel quel dans la sortie. */
  raison: string;
}

/**
 * Les verdicts attendus, section par section. Toute modification ici est un
 * changement de CONTRAT du gate : elle doit s'accompagner de la mise à jour de
 * la table du fixture, qui n'est que le miroir lisible de ce tableau.
 */
const ATTENDUS: Attendu[] = [
  {
    section: 'T900',
    verdict: 'PASS',
    code: 0,
    assertions: 1,
    classe: 'assertions',
    raison: "`- **Smoke:**` en puce — la forme employée par TASKS.md — doit être détecté",
  },
  {
    section: 'T901',
    verdict: 'PASS',
    code: 0,
    assertions: 1,
    classe: 'assertions',
    raison: 'le dialecte canonique en colonne 0 continue de marcher (non-régression)',
  },
  {
    section: 'T902',
    verdict: 'skipped',
    code: 0,
    assertions: 0,
    classe: 'champ-absent',
    raison: "une MENTION du champ en prose (`- [ ] une task sans **Smoke:**`) ne s'exécute pas — protection T160",
  },
  {
    section: 'T903',
    verdict: 'FAIL',
    code: 1,
    assertions: 1,
    classe: 'assertions',
    raison: "LE CANARI : une assertion `false` en puce doit sortir ROUGE, jamais « skipped »",
  },
  {
    section: 'T904',
    verdict: 'skipped',
    code: 0,
    assertions: 0,
    classe: 'champ-vide',
    absentDuRapport: 'APPAT-T904-A-FAIT-FEU',
    finDeBlocContient: 'Rollback',
    raison: "champ en puce mais VIDE : le `- **Rollback**` suivant est un APPÂT, il ne doit jamais être capté comme assertion",
  },
  {
    section: 'T905',
    verdict: 'skipped',
    code: 0,
    assertions: 0,
    classe: 'champ-absent',
    absentDuRapport: 'GRAS-ITALIQUE-EXECUTE',
    raison: "`***Smoke:***` en gras-italique n'est pas un champ — un marqueur de liste exige au moins un espace",
  },
  {
    section: 'T906',
    verdict: 'skipped',
    code: 0,
    assertions: 0,
    classe: 'champ-vide',
    absentDuRapport: 'APPAT-MINUSCULE-EXECUTE',
    finDeBlocContient: 'rollback',
    raison: "la sentinelle de fin ignore la CASSE du champ suivant : un `- **rollback**` en minuscule doit fermer le bloc, sinon sa puce part en assertion exécutée",
  },
  {
    section: 'T907',
    verdict: 'PASS',
    code: 0,
    assertions: 1,
    classe: 'assertions',
    raison: "détection du champ et lecture des puces acceptent la MÊME classe de marqueur — un champ en `*` ne doit pas être détecté puis vidé",
  },
  {
    section: 'T908',
    verdict: 'PASS',
    code: 0,
    assertions: 1,
    classe: 'assertions',
    absentDuRapport: 'APPAT-T908-A-FAIT-FEU',
    finDeBlocContient: 'non-gras',
    raison:
      "la sentinelle de fin reconnaît le dialecte NON-GRAS (`- Rollback: …`), que validate.ts accepte en lecture — mesuré à 2 assertions au lieu d'1 avant correctif, l'appât exécuté",
  },
  {
    section: 'T909',
    verdict: 'PASS',
    code: 0,
    assertions: 1,
    classe: 'assertions',
    absentDuRapport: 'APPAT-T909-A-FAIT-FEU',
    finDeBlocContient: 'Statut',
    raison:
      "le VOCABULAIRE de la liste close couvre les noms que validate.ts lit (`Statut`, `Review`) — mesuré à 2 assertions au lieu d'1 avant correctif : le bon dialecte sur un nom oublié laisse le chemin ouvert",
  },
  {
    section: 'T910',
    verdict: 'FAIL',
    code: 1,
    assertions: 1,
    classe: 'assertions',
    raison:
      "une assertion ouverte en GRAS (`- **assert:** \\`false\\``) doit être LUE et sortir ROUGE — avant correctif le terminateur « toute puce en gras » fermait le bloc avant elle : skipped, exit 0, l'échec disparaissait (re-review du 2026-08-12, P1)",
  },
  {
    section: 'T911',
    verdict: 'PASS',
    code: 0,
    assertions: 1,
    classe: 'assertions',
    absentDuRapport: 'APPAT-T911-A-FAIT-FEU',
    finDeBlocContient: 'Notes',
    raison:
      "la liste close couvre le vocabulaire COMPLET (schéma + dialecte partagé), pas les seuls lecteurs de validate.ts — `Notes` est un champ du schéma que validate.ts ne lit pas : avant correctif sa valeur backtickée partait en shell (re-review du 2026-08-12, P1)",
  },
  {
    section: 'T912',
    verdict: 'error',
    code: 1,
    assertions: 1,
    classe: 'assertions',
    env: { SMOKE_ASSERT_TIMEOUT_MS: '1000' },
    raison:
      "une assertion TUÉE par le timeout rend `error` (mesure impossible), jamais FAIL — le rapport ne doit pas accuser un livrable que personne n'a mesuré (T177)",
  },
  {
    section: 'T913',
    verdict: 'FAIL',
    code: 1,
    assertions: 2,
    classe: 'assertions',
    env: { SMOKE_ASSERT_TIMEOUT_MS: '1000' },
    raison:
      "un échec MESURÉ et un timeout dans le même bloc : l'échec prime, verdict FAIL — sinon requalifier le timeout en `error` laisserait un vrai échec se faire recouvrir par un voisin lent (T177)",
  },
];

/**
 * Déplie l'alternation de FIELD_HEADING en noms concrets.
 *
 * Seuls deux métacaractères sont admis — `X?` (caractère optionnel) et `[ab]`
 * (classe, avec `?` possible derrière) — parce que ce sont les seuls que le
 * dialecte emploie (`Files?`, `Crit[eè]re`, `Dur[ée]e`, `Edge cases?`). Tout
 * autre rend `null` : la garde CRIE plutôt que certifier un vocabulaire mal
 * déplié — même règle que « zéro lecteur trouvé n'est pas un succès ».
 */
function deplierFieldHeading(sourceRegex: string): string[] | null {
  const groupe = sourceRegex.match(/\((.+)\)/);
  if (!groupe) return null;
  const noms: string[] = [];
  for (const alt of groupe[1].split('|')) {
    let variantes = [''];
    let i = 0;
    while (i < alt.length) {
      const c = alt[i];
      if (c === '[') {
        const fin = alt.indexOf(']', i);
        if (fin === -1) return null;
        const classe = alt.slice(i + 1, fin).split('');
        i = fin + 1;
        const optionnel = alt[i] === '?';
        if (optionnel) i++;
        const suivantes: string[] = [];
        for (const v of variantes) {
          for (const ch of classe) suivantes.push(v + ch);
          if (optionnel) suivantes.push(v);
        }
        variantes = suivantes;
      } else if (/[A-Za-zÀ-ÿ0-9 ]/.test(c)) {
        const optionnel = alt[i + 1] === '?';
        const suivantes: string[] = [];
        for (const v of variantes) {
          suivantes.push(v + c);
          if (optionnel) suivantes.push(v);
        }
        variantes = suivantes;
        i += optionnel ? 2 : 1;
      } else {
        return null;
      }
    }
    noms.push(...variantes);
  }
  return noms;
}

/**
 * Garde ANTI-DÉRIVE du vocabulaire (review codex de T91, 2026-08-12).
 *
 * Le défaut trouvé sur T91 n'était pas dans la regex mais dans la LISTE : la
 * sentinelle reconnaissait le dialecte non-gras, et `Statut` / `Review` — que
 * `validate.ts` lit explicitement — n'y figuraient pas. Un nom manquant est un
 * chemin d'exécution ouvert, et rien ne le signalait : les deux fichiers
 * peuvent diverger en silence puisque aucun n'importe l'autre.
 *
 * Cette garde relit les APPELS de `validate.ts` (`fieldValue`/`fieldBlock`) et
 * exige que chaque nom lu soit refusé comme assertion par `smoke.ts`. Elle ne
 * porte pas de liste en dur — une liste en dur aurait exactement le défaut
 * qu'elle corrige. La prochaine divergence sera VUE, pas subie.
 *
 * Les DEUX listes sont lues TEXTUELLEMENT, jamais importées : `smoke.ts` appelle
 * `main()` au niveau module, donc l'importer LANCERAIT le gate et sortirait par
 * `process.exit` avant que ce vérificateur ait pu asserter quoi que ce soit.
 * Vérifié avant d'écrire la garde, pas supposé.
 */
function verifierLeVocabulaire(): string[] {
  const source = readFileSync(join(RACINE, 'scripts', 'validate.ts'), 'utf8');
  const litteral = readFileSync(join(RACINE, 'scripts', 'smoke.ts'), 'utf8').match(
    /const NOMS_DE_CHAMP = \[([\s\S]*?)\];/,
  );
  if (!litteral) {
    return [
      "vocabulaire : NOMS_DE_CHAMP est INTROUVABLE dans scripts/smoke.ts — la garde ne peut rien prouver",
      '       ce que la garde prouve : un renommage silencieux de la liste close désarmerait ce contrôle',
    ];
  }
  // Les COMMENTAIRES du littéral sont retirés avant d'en extraire les entrées.
  // Sans ça, `// 'Review',` — une entrée DÉSACTIVÉE — comptait encore comme
  // présente : la garde certifiait un vocabulaire différent de celui qui tourne.
  // Mesuré (review codex du 2026-08-12, P2) : entrée commentée → l'appât
  // `- Review: \`echo …\`` EXÉCUTÉ, et la garde affichait « Vocabulaire
  // conforme ». Un faux vert dans l'instrument construit pour en supprimer un.
  const actif = litteral[1].replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const connus = [...actif.matchAll(/'([^']+)'/g)].map((m) => m[1]);

  const noms = new Set<string>();
  // Les DEUX styles de quote sont acceptés. La regex n'en connaissait qu'un :
  // passer les lecteurs de `validate.ts` en quotes simples rendait ZÉRO nom, et
  // zéro nom manquant se lisait « conforme ». Même mode de panne que le faux
  // vert de T90 — l'absence de preuve rendue comme une preuve.
  // La quote FERMANTE doit être la MÊME que l'ouvrante (rétro-référence `\1`).
  // Une classe `["']` des deux côtés tronquait un nom portant une apostrophe :
  // `fieldValue(block, "Goal's owner")` rendait `Goal`, déjà connu, donc
  // « conforme » — alors que le champ complet reste exécutable. Troisième faux
  // vert trouvé dans cette garde, et le troisième de la même famille :
  // l'instrument conclut sur ce qu'il a su lire, pas sur ce qui est écrit.
  for (const m of source.matchAll(/field(?:Value|Block)\([^,]+,\s*(["'])(.+?)\1/g)) {
    // `"(?:Statut|Status)"` est une ALTERNANCE de regex, pas un nom : on la
    // déplie, sinon on vérifierait un nom qui n'existe nulle part.
    const brut = m[2];
    const alternance = brut.match(/^\(\?:(.+)\)$/);
    for (const nom of (alternance ? alternance[1] : brut).split('|')) noms.add(nom);
  }

  // Zéro lecteur trouvé n'est pas un succès : c'est la garde qui a perdu sa
  // prise. Elle le DIT plutôt que de certifier le vide.
  if (noms.size === 0) {
    return [
      "vocabulaire : AUCUN lecteur de champ trouvé dans scripts/validate.ts — la garde n'a plus de prise",
      "       ce que la garde prouve : une garde qui ne trouve rien à vérifier doit crier, jamais certifier",
    ];
  }

  // DEUXIÈME source (re-review via Edgee du 2026-08-12, P1) : le dialecte
  // partagé. FIELD_HEADING est le vocabulaire le plus large que la chaîne sait
  // LIRE — un nom qu'il reconnaît et que la liste close ignore est un chemin
  // d'exécution (`- Notes: \`cmd\`` parti en shell, mesuré). Les lecteurs de
  // validate.ts restent vérifiés : les deux sources s'additionnent.
  const dialecte = deplierFieldHeading(FIELD_HEADING.source);
  if (dialecte === null) {
    return [
      'vocabulaire : FIELD_HEADING (task-dialect) porte un métacaractère que le déplieur ne sait pas lire',
      '       ce que la garde prouve : plutôt crier que certifier un vocabulaire mal déplié',
    ];
  }
  for (const nom of dialecte) noms.add(nom);

  // Comparaison INSENSIBLE à la casse : c'est la sémantique de champNonGras
  // (flag `i`) — exiger la casse exacte ici fabriquerait des fausses alertes
  // sur un vocabulaire que le gate, lui, refuse déjà.
  const connusMin = connus.map((n) => n.toLowerCase());
  const manquants = [...noms].filter((nom) => !connusMin.includes(nom.toLowerCase()));
  if (manquants.length === 0) return [];
  return [
    `vocabulaire : ${manquants.length} nom(s) lu(s) par validate.ts et ABSENT(S) de NOMS_DE_CHAMP — ${manquants.join(', ')}`,
    "       ce que la garde prouve : un nom absent de la liste close n'est pas refusé comme assertion — sa valeur entre backticks part en shell",
  ];
}

interface Obtenu {
  code: number;
  verdict: string;
  assertions: number;
  classe: ClasseDeMessage;
  /** Rapport brut, pour y chercher une sentinelle d'appât. */
  rapportBrut: string;
  /** Nombre de puces refusées par nom de champ. */
  refus: number;
  /** Phrase « bloc terminé par … » portée par le rapport. */
  finDeBloc: string;
  /**
   * `smoke.ts` n'a pas pu s'exécuter (npx/tsx absent, timeout, mort avant
   * d'écrire). C'est un ÉCHEC D'INSTRUMENT, pas un résultat : il diverge de
   * tout attendu, et le confondre avec une divergence de contrat faisait sortir
   * `--prouver-la-derive` en code 0 sans qu'aucun test n'ait tourné (P2 de la
   * passe du 2026-08-12). Même mode de panne que le faux vert que T90 supprime,
   * d'un cran plus haut : l'instrument qui garde l'instrument.
   */
  executionImpossible: boolean;
}

/** Exécute le gate sur une section du fixture et lit son rapport. */
function jouer(section: string, env?: Record<string, string>): Obtenu {
  const chemin = join(RACINE, '.shikamaru', 'smoke', section, 'report.json');
  // Le rapport du run PRÉCÉDENT est effacé AVANT de relancer le gate. Sans ça,
  // un `smoke.ts` qui meurt avant d'écrire (erreur tsx, dépendance manquante)
  // laisserait comparer des données mortes : un T903 « FAIL » périmé ferait
  // sortir le canari VERT alors que rien n'a tourné. Un instrument anti-faux-vert
  // ne doit pas pouvoir produire un faux vert. (Review de T90, P2-5.)
  rmSync(chemin, { force: true });

  const res = spawnSync(
    'npx',
    ['tsx', 'scripts/smoke.ts', '--task', section, '--tasks-file', FIXTURE],
    // L'environnement de la section est ajouté à celui du vérificateur, jamais
    // substitué : `smoke.ts` tourne via `npx tsx` et a besoin de PATH, HOME &
    // consorts pour seulement démarrer.
    { cwd: RACINE, encoding: 'utf8', timeout: 120_000, env: { ...process.env, ...env } },
  );

  const code = res.status ?? -1;
  if (!existsSync(chemin)) {
    return {
      code,
      verdict: 'RAPPORT-ABSENT',
      assertions: -1,
      classe: 'assertions',
      rapportBrut: '',
      refus: -1,
      finDeBloc: '',
      executionImpossible: true,
    };
  }

  const brut = readFileSync(chemin, 'utf8');
  const rapport = JSON.parse(brut);
  const message: string = rapport.message ?? '';
  // Les deux classes de « rien à jouer » se distinguent par le message, pas par
  // le verdict : toutes deux rendent « skipped » et exit 0. C'est justement la
  // confusion que ce vérificateur existe pour lever.
  let classe: ClasseDeMessage = 'assertions';
  if (/No \*\*Smoke:\*\* field/.test(message)) classe = 'champ-absent';
  else if (/declares 0 assertion|aucune assertion/.test(message)) classe = 'champ-vide';

  return {
    code,
    verdict: rapport.verdict,
    assertions: Array.isArray(rapport.steps) ? rapport.steps.length : -1,
    classe,
    rapportBrut: brut,
    refus: Array.isArray(rapport.refus) ? rapport.refus.length : 0,
    finDeBloc: rapport.finDeBloc ?? '',
    executionImpossible: false,
  };
}

interface Resultat {
  divergences: string[];
  lignes: string[];
  /** Sections dont `smoke.ts` n'a pas pu s'exécuter — voir `Obtenu`. */
  inexecutables: string[];
}

function comparer(attendus: Attendu[]): Resultat {
  const divergences: string[] = [];
  const lignes: string[] = [];
  const inexecutables: string[] = [];

  for (const a of attendus) {
    const o = jouer(a.section, a.env);
    if (o.executionImpossible) inexecutables.push(a.section);
    const ecarts: string[] = [];
    if (o.verdict !== a.verdict) ecarts.push(`verdict ${a.verdict} attendu, ${o.verdict} obtenu`);
    if (o.code !== a.code) ecarts.push(`code ${a.code} attendu, ${o.code} obtenu`);
    if (o.assertions !== a.assertions) {
      ecarts.push(`${a.assertions} assertion(s) attendue(s), ${o.assertions} retenue(s)`);
    }
    if (o.classe !== a.classe) ecarts.push(`classe « ${a.classe} » attendue, « ${o.classe} » obtenue`);
    // L'appât ne doit apparaître NULLE PART dans le rapport — ni en assertion
    // retenue, ni en commande refusée, ni dans une sortie. Le compte seul ne le
    // prouverait pas : une régression peut capter l'appât À LA PLACE d'une
    // assertion légitime et laisser le compte juste.
    if (a.absentDuRapport && o.rapportBrut.includes(a.absentDuRapport)) {
      ecarts.push(`l'appât « ${a.absentDuRapport} » apparaît dans le rapport`);
    }
    const refusAttendus = a.refusAttendus ?? 0;
    if (o.refus !== refusAttendus) {
      ecarts.push(`${refusAttendus} refus attendu(s), ${o.refus} obtenu(s)`);
    }
    if (a.finDeBlocContient && !o.finDeBloc.includes(a.finDeBlocContient)) {
      ecarts.push(`fin de bloc « ${a.finDeBlocContient} » attendue, « ${o.finDeBloc || '(absente)'} » obtenue`);
    }

    if (ecarts.length === 0) {
      lignes.push(`  ✅ ${a.section}  ${a.verdict.padEnd(7)} code ${a.code}  ${a.assertions} assert  — ${a.raison}`);
    } else {
      lignes.push(`  ❌ ${a.section}  ${ecarts.join(' · ')}`);
      lignes.push(`       ce que la section prouve : ${a.raison}`);
      divergences.push(`${a.section}: ${ecarts.join(' · ')}`);
    }
  }

  return { divergences, lignes, inexecutables };
}

/** Code de sortie réservé à l'échec d'INSTRUMENT, distinct de la divergence. */
const CODE_EXECUTION_IMPOSSIBLE = 2;

function main(): void {
  const preuveDeDerive = process.argv.includes('--prouver-la-derive');

  if (preuveDeDerive) {
    // Auto-test de l'INSTRUMENT : on falsifie volontairement un verdict attendu
    // et on exige que le vérificateur le voie. Sans ce mode, rien ne prouve que
    // ce script assère quoi que ce soit — c'est exactement le défaut de la table
    // Markdown qu'il remplace.
    console.log('🧪 Preuve de dérive : le verdict attendu de T903 est volontairement falsifié en « PASS ».');
    const falsifies = ATTENDUS.map((a) =>
      a.section === 'T903' ? { ...a, verdict: 'PASS' as const, code: 0 } : a,
    );
    const { divergences, inexecutables } = comparer(falsifies);
    // ⚠️ L'ordre de ces deux tests est le finding lui-même. `jouer()` rend
    // « RAPPORT-ABSENT » quand smoke.ts ne démarre pas — ce qui DIVERGE aussi de
    // l'attendu falsifié. En concluant sur la seule divergence, l'auto-test
    // sortait en 0 alors qu'AUCUN test n'avait tourné : il prouvait sa propre
    // vigilance avec un instrument mort. L'exécution valide se vérifie DONC en
    // premier, et son échec porte un code de sortie distinct — un appelant doit
    // pouvoir séparer « l'instrument est décoratif » de « l'instrument n'a pas
    // pu tourner », qui ne se réparent pas de la même façon.
    if (inexecutables.length > 0) {
      console.log(
        `❌ Exécution impossible sur ${inexecutables.length} section(s) : ${inexecutables.join(', ')}.\n` +
          "   Aucune conclusion sur la dérive n'est possible — smoke.ts n'a rendu aucun rapport.",
      );
      process.exit(CODE_EXECUTION_IMPOSSIBLE);
    }
    const vu = divergences.some((d) => d.startsWith('T903'));
    console.log(vu
      ? '✅ Dérive DÉTECTÉE sur T903 — le vérificateur assère réellement.'
      : '❌ Dérive NON détectée — le vérificateur est décoratif.');
    process.exit(vu ? 0 : 1);
  }

  console.log(`🔎 Harnais de parsing du gate Smoke — ${ATTENDUS.length} sections\n`);
  const { divergences, lignes, inexecutables } = comparer(ATTENDUS);
  lignes.forEach((l) => console.log(l));

  console.log('\n' + '━'.repeat(40));
  if (inexecutables.length > 0) {
    // Le mode nominal sortait déjà en ≠ 0 dans ce cas (la divergence suffit),
    // mais sous le libellé « hors contrat », qui envoie chercher un défaut de
    // parsing là où c'est la boîte à outils qui manque. La cause est nommée.
    console.log(
      `❌ Exécution impossible sur ${inexecutables.length}/${ATTENDUS.length} section(s) : ${inexecutables.join(', ')}.\n` +
        '   Cause à chercher du côté de npx/tsx ou du timeout, PAS du parseur.',
    );
    process.exit(CODE_EXECUTION_IMPOSSIBLE);
  }
  // La garde de vocabulaire ne dépend d'aucune section : elle compare deux
  // fichiers. Elle tourne donc même si le harnais est vert — c'est justement un
  // harnais vert qui a laissé passer `Statut` et `Review`.
  const derive = verifierLeVocabulaire();
  if (divergences.length === 0 && derive.length === 0) {
    console.log(`✅ Harnais conforme : ${ATTENDUS.length}/${ATTENDUS.length} sections au verdict attendu.`);
    console.log('✅ Vocabulaire conforme : tout nom lu par validate.ts est refusé comme assertion.');
    process.exit(0);
  }
  if (derive.length > 0) {
    console.log(`❌ Dérive de vocabulaire entre scripts/validate.ts et scripts/smoke.ts :`);
    derive.forEach((d) => console.log(`   • ${d}`));
  }
  if (divergences.length > 0) {
    console.log(`❌ ${divergences.length}/${ATTENDUS.length} section(s) hors contrat :`);
    divergences.forEach((d) => console.log(`   • ${d}`));
  }
  process.exit(1);
}

main();
