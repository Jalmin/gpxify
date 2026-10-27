#!/usr/bin/env npx tsx
/**
 * Parseur/validateur léger des QUESTS.md — couche portefeuille (T178).
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * Le système portefeuille vit dans des QUESTS.md DISTRIBUÉS par repo, seedés à
 * la main le 2026-08-13. Sans contrat de lecture, le format diverge dès la 2e
 * édition et `portfolio-scan.ts` (T179) lit à l'aveugle. Ce module est ce
 * contrat ; `.claude/commands/references/quests-schema.md` en est la version
 * lisible.
 *
 * La grammaire n'est PAS inventée : elle est dérivée des 12 QUESTS.md réels du
 * portefeuille. En cas de conflit entre le schéma et un seed, c'est le schéma
 * qui a tort (règle Boundaries de T178). Trois formes réelles ont ainsi
 * corrigé le schéma pressenti :
 *
 *  1. `famille: produit-interne` (pennylane) — les 3 familles canoniques
 *     (mission | produit | méta) ne couvrent pas les qualifiants. La famille
 *     est donc normalisée sur sa base et `familleRaw` conserve la forme.
 *  2. Les pauses réelles s'écrivent au TIRET CADRATIN (`pause — réveil : …`),
 *     pas en parenthèses. Les deux formes sont acceptées ; aucun seed n'est
 *     réécrit pour plaire au parseur.
 *  3. Les étiquettes de champ portent des qualifiants entre parenthèses
 *     (`**Jalon (si reprise):**` BDO, `**Mesure (funnel complet, …):**`
 *     KalioKool). L'étiquette est donc normalisée avant lecture, sinon ces
 *     deux quêtes perdaient silencieusement leur jalon et leur mesure.
 *
 * Validation VOLONTAIREMENT légère — trois erreurs bloquantes, pas une de plus
 * (frontmatter absent, 0 bloc quête, statut hors enum). Tout le reste est
 * warning : un QUESTS.md est un support de rituel humain, pas un artefact de
 * build. Un parseur sévère transformerait le rituel du lundi en session de
 * réparation de fichiers — l'inverse du but.
 *
 * Usage :
 *   npx tsx scripts/lib/quests-parser.ts QUESTS.md [autre/QUESTS.md ...]
 *   → `<path>: N quêtes` par fichier ; exit 0 si tous valides, 1 sinon.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** Les 4 statuts du dialecte. Seuls `vivante` et `pause` sont utilisés par les seeds du 2026-08-13 ; `gelée`/`morte` sont les verdicts du rituel (skill shika-plan). */
export const STATUTS = ['vivante', 'pause', 'gelée', 'morte'] as const;
export type Statut = (typeof STATUTS)[number];

/** Les 3 familles canoniques. Un qualifiant est toléré (`produit-interne`) : il vit dans `familleRaw`. */
export const FAMILLES = ['mission', 'produit', 'méta'] as const;
export type Famille = (typeof FAMILLES)[number];

export interface Quest {
  /** `Q1`, `Q2`… tel qu'écrit dans le heading. */
  id: string;
  titre: string;
  /** Statut normalisé sur sa base — c'est lui qu'on compte. */
  statut: Statut;
  /** Ligne de statut complète, annotation comprise. Ce que le rituel affiche. */
  statutRaw: string;
  /** Annotation seule (ce qui suit la base) : `méta`, `flux — service continu`, `réveil : …`. */
  annotation?: string;
  /** Condition de réveil en TEXTE LIBRE (pauses uniquement) — jamais interprétée, jamais datée de force. */
  reveil?: string;
  /** `true` = service continu sans jalon de fin (Equicty). Un flux ne compte pas dans le WIP chantiers. */
  flux: boolean;
  /**
   * `true` = quête de FOND : elle avance en arrière-plan et n'occupe pas une
   * des places du top-3. Comme un flux, elle ne compte pas dans le WIP — mais
   * pour une raison différente : un flux n'a pas de fin, une quête de fond en a
   * une, elle ne prétend simplement pas être un des chantiers de la semaine.
   * Elle garde donc ses warnings jalon/mesure, que le flux, lui, n'émet pas.
   */
  fond: boolean;
  jalon?: string;
  mesure?: string;
  /** Tous les champs `**Label:**` du bloc, étiquette normalisée en minuscules. Les champs libres (Pourquoi, Sources, Contexte…) vivent ici et ne déclenchent JAMAIS d'erreur. */
  champs: Record<string, string>;
}

export interface QuestsDoc {
  /** `false` ⇔ au moins une erreur STRUCTURELLE. Les warnings n'invalident jamais. */
  valid: boolean;
  project?: string;
  /** Famille normalisée sur sa base. */
  famille?: string;
  /** Famille telle qu'écrite (`produit-interne`). */
  familleRaw?: string;
  budget?: string;
  lastRitual?: string;
  /** Le `**Cap:**` de tête — la direction du repo. Optionnel (3 seeds n'en ont pas). */
  cap?: string;
  quests: Quest[];
  errors: string[];
  warnings: string[];
}

/**
 * Heading de quête. Canonique `### Q1: titre` (les 12 seeds), avec tolérance de
 * LECTURE sur `##` et sur le tiret en séparateur — même dissymétrie que
 * `task-dialect.ts` : on lit large, on écrit canonique. La borne `Q\d+` est ce
 * qui empêche `## Triage 2026-08-13` (5 seeds) de devenir une quête fantôme.
 */
const QUEST_HEADING = /^#{2,3}\s+(Q\d+)\s*[:—-]\s*(.+?)\s*$/;

/** Toute ligne de heading — sert de BORNE de fin de bloc. C'est elle qui referme la dernière quête devant la section `## Triage` des seeds BDO/MANTU/Pythia/RevueXXI/rouchon. */
const HEADING = /^#{1,6}\s/;

/**
 * Champ `**Label:** valeur`. L'étiquette tolère un qualifiant parenthésé, qui
 * est retiré à la normalisation : sans ça `**Jalon (si reprise):**` (BDO) et
 * `**Mesure (funnel complet, …):**` (KalioKool) seraient lus comme des champs
 * inconnus et ces deux quêtes perdraient leur jalon/mesure EN SILENCE.
 * L'ancrage sur `**` en début de ligne est ce qui protège des puces
 * `- ✅ **Always:** …` des blocs Boundaries (KalioKool), qui ne sont pas des
 * champs de quête.
 */
const CHAMP = /^\*\*([^*]+?)\s*:\*\*\s*(.*)$/;

/** `**Jalon (si reprise):**` → `jalon`. */
function normaliserEtiquette(brut: string): string {
  return brut
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase();
}

/**
 * Extrait le frontmatter YAML plat. Le délimiteur est exigé en TOUTE PREMIÈRE
 * ligne : une règle horizontale `---` au milieu du corps n'ouvre pas un
 * frontmatter (c'est l'appât de la fixture adversariale).
 */
function lireFrontmatter(lignes: string[]): { champs: Record<string, string>; finDuBloc: number } | null {
  if (lignes[0]?.trim() !== '---') return null;
  const fin = lignes.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (fin === -1) return null;

  const champs: Record<string, string> = {};
  for (const ligne of lignes.slice(1, fin)) {
    const m = ligne.match(/^([A-Za-zÀ-ÿ][\w-]*)\s*:\s*(.*)$/);
    if (m) champs[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { champs, finDuBloc: fin };
}

/**
 * Découpe la valeur de statut en base + annotation.
 * Formes réelles couvertes : `vivante`, `vivante (méta)`, `vivante (flux — …)`,
 * `pause`, `pause — réveil : …`, `pause permanente par défaut`.
 * Rend `null` si aucune base d'enum n'ouvre la valeur → erreur structurelle.
 */
function decouperStatut(valeur: string): { statut: Statut; annotation?: string } | null {
  const nu = valeur.trim().replace(/\*+/g, '');
  for (const statut of STATUTS) {
    // `gelee` sans accent toléré en lecture — une saisie à la main ne doit pas casser le rituel.
    const variantes = statut === 'gelée' ? ['gelée', 'gelee'] : [statut];
    for (const v of variantes) {
      const re = new RegExp(`^${v}\\b`, 'i');
      if (!re.test(nu)) continue;
      const reste = nu
        .slice(v.length)
        .replace(/^\s*[—–-]\s*/, '')
        .replace(/^\s*\((.*)\)\s*$/, '$1')
        .trim();
      return { statut, annotation: reste.length > 0 ? reste : undefined };
    }
  }
  return null;
}

/**
 * Condition de réveil, en texte libre. Le mot-clé d'amorce est retiré quand il
 * est présent (`réveil : X` → `X`) ; sinon l'annotation entière fait office de
 * condition (`s'ouvre à la livraison de Q1`, `se réveille si Etienne la
 * demande`). Rien n'est jamais interprété comme une date : le rituel est un
 * jugement humain, le parseur ne fait que rapporter.
 */
function extraireReveil(annotation: string): string {
  return annotation
    .replace(/^r[ée]veil\s*(?::|\s)\s*/i, '')
    .replace(/^se\s+r[ée]veille\s+/i, '')
    .trim();
}

export function parseQuests(content: string): QuestsDoc {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lignes = content.split(/\r?\n/);

  const fm = lireFrontmatter(lignes);
  if (!fm) {
    // Erreur structurelle n°1 — et arrêt net : sans frontmatter, le fichier
    // n'est pas un QUESTS.md, inutile de rapporter des quêtes qu'on ne saurait
    // pas rattacher à un projet.
    return {
      valid: false,
      quests: [],
      errors: ['frontmatter absent : un QUESTS.md ouvre par `---` en première ligne et le referme par `---`'],
      warnings,
    };
  }

  const corps = lignes.slice(fm.finDuBloc + 1);
  const project = fm.champs.project;
  const familleRaw = fm.champs.famille;
  let famille = familleRaw;
  if (familleRaw) {
    const base = FAMILLES.find((f) => familleRaw.toLowerCase().startsWith(f));
    if (base) famille = base;
    else warnings.push(`famille « ${familleRaw} » hors des 3 familles canoniques (${FAMILLES.join(' | ')})`);
  } else {
    warnings.push('frontmatter sans `famille`');
  }
  if (!project) warnings.push('frontmatter sans `project`');
  if (fm.champs.schemaversion && fm.champs.schemaversion !== '1') {
    warnings.push(`schemaVersion ${fm.champs.schemaversion} inconnue (attendue : 1)`);
  }

  // Préambule = tout ce qui précède la 1re quête ; on n'y cherche que le Cap.
  const premiereQuete = corps.findIndex((l) => QUEST_HEADING.test(l));
  const preambule = premiereQuete === -1 ? corps : corps.slice(0, premiereQuete);
  const capLigne = preambule.find((l) => CHAMP.test(l) && normaliserEtiquette(l.match(CHAMP)![1]) === 'cap');
  const cap = capLigne ? capLigne.match(CHAMP)![2].trim() : undefined;

  const quests: Quest[] = [];
  for (let i = premiereQuete === -1 ? corps.length : premiereQuete; i < corps.length; i++) {
    const entete = corps[i].match(QUEST_HEADING);
    if (!entete) continue;

    // Bloc = jusqu'au prochain heading, quel que soit son niveau.
    let fin = i + 1;
    while (fin < corps.length && !HEADING.test(corps[fin])) fin++;

    // Champs du bloc : une valeur court jusqu'au champ suivant (la Mesure de
    // KalioKool tient sur 3 lignes, requête SQL comprise).
    const champs: Record<string, string> = {};
    let courant: string | null = null;
    for (const ligne of corps.slice(i + 1, fin)) {
      const m = ligne.match(CHAMP);
      if (m) {
        courant = normaliserEtiquette(m[1]);
        champs[courant] = m[2].trim();
      } else if (courant) {
        champs[courant] = `${champs[courant]}\n${ligne}`.trim();
      }
    }

    const [id, titre] = [entete[1], entete[2]];
    const statutBrut = champs['statut'];
    const decoupe = statutBrut ? decouperStatut(statutBrut) : null;
    if (!decoupe) {
      // Erreur structurelle n°3 — statut absent ou hors enum. Une quête sans
      // statut lisible ne peut être ni comptée ni triée : c'est le seul champ
      // dont le rituel ne peut pas se passer.
      errors.push(
        statutBrut
          ? `${id} : statut « ${statutBrut} » hors enum (${STATUTS.join(' | ')})`
          : `${id} : champ **Statut:** absent`,
      );
      i = fin - 1;
      continue;
    }

    const { statut, annotation } = decoupe;
    const flux = /\bflux\b/i.test(annotation ?? '') || 'standard de service' in champs;
    // ANCRÉ en tête d'annotation (`vivante (fond — …)`), au contraire de `flux`
    // qui se cherche partout : « de fond » est une tournure courante en prose
    // (« travail de fond », « chantier de fond ») et un motif libre
    // requalifierait en silence des chantiers qui doivent compter dans le WIP.
    // Délimiteur EXPLICITE après le marqueur, jamais `\b` : en JavaScript `\b`
    // est ASCII, donc `é` y compte comme une frontière de mot et `fondé` /
    // `fondée` — « vivante (fondée sur le retour client) » — passerait pour le
    // marqueur. Le chantier sortirait du décompte EN SILENCE, soit exactement
    // le sous-comptage que ce correctif existe pour empêcher : il serait pire
    // que le sur-comptage d'origine, parce qu'il retire du WIP au lieu d'y
    // ajouter. On exige donc une vraie fin de token : espace, tiret,
    // ponctuation de séparation, ou fin de chaîne.
    const fond = /^\s*fond(?=$|[\s—–\-,;:.)])/i.test(annotation ?? '');
    const jalon = champs['jalon'];
    const mesure = champs['mesure'];

    if (statut === 'vivante' && !flux) {
      // Un chantier vivant sans jalon ni mesure est le symptôme n°1 que le
      // rituel cherche : une quête qui ne peut pas se fermer. Warning, jamais
      // erreur — c'est au user de trancher, pas au parseur.
      if (!jalon) warnings.push(`${id} : quête vivante sans **Jalon:**`);
      if (!mesure) warnings.push(`${id} : quête vivante sans **Mesure:**`);
    }

    let reveil: string | undefined;
    if (statut === 'pause') {
      if (annotation) {
        reveil = extraireReveil(annotation) || undefined;
        if (reveil && !/\d{4}-\d{2}-\d{2}/.test(reveil)) {
          warnings.push(`${id} : réveil non datable (« ${reveil} »)`);
        }
      } else {
        warnings.push(`${id} : pause sans condition de réveil`);
      }
    }

    quests.push({ id, titre, statut, statutRaw: statutBrut.trim(), annotation, reveil, flux, fond, jalon, mesure, champs });
    i = fin - 1;
  }

  // Erreur structurelle n°2.
  if (quests.length === 0 && errors.length === 0) {
    errors.push('aucun bloc de quête `### Qn: titre` trouvé');
  }

  return { valid: errors.length === 0, project, famille, familleRaw, budget: fm.champs.budget, lastRitual: fm.champs.lastritual, cap, quests, errors, warnings };
}

// ---------------------------------------------------------------------------
// Mode CLI
// ---------------------------------------------------------------------------

function principal(chemins: string[]): number {
  if (chemins.length === 0) {
    console.error('Usage : npx tsx scripts/lib/quests-parser.ts <QUESTS.md> [...]');
    return 1;
  }

  let echecs = 0;
  for (const chemin of chemins) {
    let doc: QuestsDoc;
    try {
      doc = parseQuests(readFileSync(chemin, 'utf8'));
    } catch (e) {
      console.log(`${chemin}: illisible — ${(e as Error).message}`);
      echecs++;
      continue;
    }

    const repartition = doc.quests.length
      ? ` (${STATUTS.map((s) => [s, doc.quests.filter((q) => q.statut === s).length] as const)
          .filter(([, n]) => n > 0)
          .map(([s, n]) => `${n} ${s}`)
          .join(', ')})`
      : '';
    console.log(`${chemin}: ${doc.quests.length} quête${doc.quests.length > 1 ? 's' : ''}${repartition}`);
    for (const e of doc.errors) console.log(`  ❌ ${e}`);
    for (const w of doc.warnings) console.log(`  ⚠️  ${w}`);
    if (!doc.valid) echecs++;
  }

  if (echecs > 0) console.log(`\n${echecs}/${chemins.length} fichier(s) en erreur structurelle`);
  return echecs > 0 ? 1 : 0;
}

const cible = process.argv[1] ? resolve(process.argv[1]).replace(/\.(ts|js)$/, '') : '';
if (cible && cible === fileURLToPath(import.meta.url).replace(/\.(ts|js)$/, '')) {
  process.exit(principal(process.argv.slice(2)));
}
