---
name: references:quests-schema
description: Schéma du dialecte QUESTS.md — couche portefeuille (cap/quête/jalon/mesure). Contrat de lecture de scripts/lib/quests-parser.ts, consommé par portfolio-scan.ts et le skill shika-plan.
---

# QUESTS.md — Schéma (schemaVersion 1)

Un `QUESTS.md` par repo, à sa racine. Il répond à **une** question : *ce repo, il sert à quoi en ce moment, et à quoi on voit que c'est fini ?* TASKS.md porte le **comment** et le coût (tier) ; QUESTS.md porte le **pourquoi** et la valeur.

Ce schéma est **dérivé des 12 QUESTS.md réels** seedés à la main le 2026-08-13, pas inventé. En cas de conflit entre ce document et un seed, **c'est ce document (ou le parser) qui a tort** — un seed n'est jamais réécrit pour plaire à l'outil.

Implémentation : `scripts/lib/quests-parser.ts` (`parseQuests(content) → QuestsDoc`, + mode CLI).

---

## Vocabulaire

| Terme | Ce que c'est | Où il vit |
|-------|--------------|-----------|
| **Cap** | La direction du repo, une phrase. Ne se coche pas. | `**Cap:**` en tête de fichier |
| **Quête** | Un engagement qui peut se fermer (ou un service continu). L'unité de triage du rituel. | bloc `### Qn: titre` |
| **Jalon** | À quoi on voit que la quête est **finie** — binaire, vérifiable, pas un pourcentage. | `**Jalon:**` |
| **Mesure** | Le chiffre ou le fait qui prouve le jalon (requête SQL, colonne d'un tableau, date). | `**Mesure:**` |

Une quête sans jalon binaire est une intention, pas une quête.

---

## Structure du fichier

```markdown
---
schemaVersion: 1
project: kaliokool
famille: produit
budget: 1 soirée/sem
lastRitual: 2026-08-13
---

# QUESTS.md — KalioKool

**Cap:** 100 actifs — actif = compte activé + ≥1 session en cours ou terminée.

### Q1: Lancer l'acquisition et colmater le funnel
**Statut:** vivante
**Jalon:** 1 organisme réel déroule une session dans l'app.
**Mesure:** `SELECT count(DISTINCT organization_id) FROM sessions WHERE status IN (…)` — baseline 2026-08-13 : **0**

### Q2: Facturation / avoirs
**Statut:** pause
**Pourquoi:** 0 facture émise par quiconque — feature sans usage tant que Q1 n'est pas franchie.

## Triage 2026-08-13
- notes libres du rituel (hors quêtes — le parseur s'arrête ici)
```

### Frontmatter (obligatoire, en **première ligne**)

| Champ | Rôle | Absent ⇒ |
|-------|------|----------|
| `schemaVersion` | `1` | warning si ≠ 1 |
| `project` | slug du repo | warning |
| `famille` | `mission` \| `produit` \| `méta` | warning |
| `budget` | temps qu'on y met, en texte libre (`0 en pause`, `1 soirée/sem`) | toléré |
| `lastRitual` | date ISO du dernier passage du rituel | toléré |

Le délimiteur `---` est exigé en **toute première ligne** : une règle horizontale au milieu du corps n'ouvre pas un frontmatter (fixture `invalid-sans-frontmatter.md`).

### Les 3 familles

`mission` (client, facturé) · `produit` (le nôtre) · `méta` (l'outillage).

Un **qualifiant** est toléré et normalisé sur sa base : `produit-interne` (pennylane) est lu `produit`, la forme écrite restant dans `familleRaw`. Une famille hors des trois bases ⇒ warning, jamais erreur.

La famille n'est pas décorative : elle est le garde-fou anti-micro-boucle. Une quête `méta` ne s'active que contre une friction **mesurée** sur une quête `mission`/`produit`.

---

## Bloc quête

Heading canonique `### Qn: titre`. En lecture, `##` et le tiret en séparateur sont tolérés (même dissymétrie lire-large / écrire-canonique que `task-dialect.ts`). La borne `Q\d+` est ce qui empêche une section `## Triage 2026-08-13` de devenir une quête fantôme — 5 seeds en portent une.

Un bloc se referme au **heading suivant, quel qu'en soit le niveau**.

### Champs

| Champ | Obligatoire | Notes |
|-------|-------------|-------|
| `**Statut:**` | ✅ **oui** | seul champ dont le rituel ne peut pas se passer — absent ou hors enum ⇒ **erreur structurelle** |
| `**Jalon:**` | sur quête vivante (hors flux) | absent ⇒ warning |
| `**Mesure:**` | sur quête vivante (hors flux) | absent ⇒ warning |
| tout autre champ bold | non | **toléré, jamais d'erreur** — `**Pourquoi:**`, `**Sources:**`, `**Contexte:**`, `**Stratégie:**`, `**Direction:**`, `**Boundaries:**`, `**Standard de service:**`, `**Santé au rituel:**` sont attestés dans les seeds |

L'étiquette tolère un **qualifiant parenthésé** : `**Jalon (si reprise):**` (BDO), `**Mesure (funnel complet, à surveiller pendant la pub):**` (KalioKool) sont lus comme `jalon` et `mesure`. Sans cette normalisation, ces deux quêtes perdraient leur jalon et leur mesure en silence.

Une valeur court jusqu'au champ suivant : elle peut être **multi-lignes** (la Mesure de KalioKool tient sur 2 lignes, requête SQL comprise). Les puces d'un bloc `**Boundaries:**` (`- ✅ **Always:** …`) ne sont pas des champs : l'ancrage du parseur est sur `**` en début de ligne.

### Les 4 statuts

| Statut | Sens | Réveil |
|--------|------|--------|
| `vivante` | on y travaille maintenant | — |
| `pause` | suspendue, reprendra | condition ou date attendue |
| `gelée` | suspendue sans horizon, re-triée un jour | — |
| `morte` | ne reprendra pas. Point final. | jamais |

Seuls `vivante` et `pause` apparaissent dans les seeds du 2026-08-13 : `gelée` et `morte` sont les **verdicts que le rituel écrit** (skill `shika-plan`).

**Annotations tolérées** — le statut se lit sur sa base, l'annotation est conservée (`statutRaw`, `annotation`) :

```
**Statut:** vivante (méta)
**Statut:** vivante (flux — service continu, pas de jalon de fin)
**Statut:** vivante (fond — n'entre pas dans le top-3 WIP)
**Statut:** pause — réveil : décision client à la rentrée
**Statut:** pause — s'ouvre à la livraison de Q1
**Statut:** pause permanente par défaut
```

⚠️ Les pauses réelles s'écrivent au **tiret cadratin** (`pause — réveil : …`), pas en parenthèses. Les deux formes sont acceptées.

Le **réveil** est extrait en **texte libre** et n'est jamais interprété comme une date : `réveil : X` → `X`, sinon l'annotation entière fait office de condition (`se réveille si Etienne la demande`). Un réveil non datable ⇒ warning ; une pause sans aucune condition ⇒ warning (c'est une quête qui ne se réveillera jamais toute seule).

### Chantier vs flux

- **Chantier** : a une fin. Porte un jalon binaire. **Compte dans le WIP.**
- **Flux** : service continu, pas de jalon de fin (Equicty : support campagnes). Porte un `**Standard de service:**` au lieu d'un jalon. **Ne compte pas dans le WIP** et n'émet ni warning jalon ni warning mesure.

Détection : annotation contenant `flux`, ou présence d'un champ `**Standard de service:**`.

---

## Les 3 règles du système

1. **WIP 2-3 chantiers** — tout le portefeuille confondu, pas par repo. Les flux et les quêtes `fond` n'y entrent pas. Au-delà de 3 chantiers vivants, le scan lève un ⚠ : ce n'est pas une interdiction, c'est une question posée au rituel.
2. **Circuit breaker** — un jalon daté dépassé se signale tout seul. Une quête qui passe deux rituels sans progrès est **posée sur la table** (prolonger / pause / geler / tuer), et « prolonger » est une décision **explicite**, jamais un défaut par inertie.
3. **Budget hygiène** — max **1 task hygiène par run** (gate dure du runner, §1.1). L'outillage et le ménage voyagent en passager, jamais au volant.

---

## Validation

Trois erreurs **structurelles** (bloquantes), pas une de plus :

1. **frontmatter absent** (délimiteur `---` pas en première ligne)
2. **0 bloc quête** `### Qn:`
3. **statut absent ou hors enum** sur une quête

Tout le reste est **warning**. Un QUESTS.md est un support de rituel humain, pas un artefact de build : un parseur sévère transformerait le lundi en session de réparation de fichiers.

```bash
npx tsx scripts/lib/quests-parser.ts QUESTS.md            # → "QUESTS.md: 2 quêtes (1 vivante, 1 pause)"
npx tsx scripts/lib/quests-parser.ts ~/Projects/*/QUESTS.md   # exit 0 si tous valides, 1 sinon
```

Fixtures : `scripts/__fixtures__/quests/` — 2 formes réelles copiées (`meta-shikamaru.md`, `pause-reveil-ziggy.md`) + 1 adversariale (`invalid-sans-frontmatter.md`, crédible mais sans frontmatter, avec un `---` en appât au milieu du corps).

---

## Consommateurs

| Qui | Quoi |
|-----|------|
| `scripts/portfolio-scan.ts` (T179) | état des lieux du lundi — quêtes par statut, flags WIP et circuit breaker |
| skill `shika-plan` (T180) | le rituel : scan → confrontation → triage → écriture des verdicts |
| gate quête du speccer (T181) | liste les quêtes **vivantes** pour rattacher chaque feature à l'une d'elles |

*Créé par T178 (2026-08-13). Source : 12 QUESTS.md seedés le 2026-08-13, `docs/recherche-shika-plan-2026-08-13.md`.*
