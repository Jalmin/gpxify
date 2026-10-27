# /shika-qa

Skill QA E2E pour les projets que tu pilotes. Génère un manifest YAML par interview, lance le runner Playwright contre le projet, et te résume le rapport.

**Pré-requis** : `runner-qa/` installé dans le repo `shikamaru` (Phase 14, T121-T124). Le projet courant doit avoir un dev server lançable (ou un staging accessible).

---

## Principe

Trois phases strictes :

1. **Interview** — 6 questions structurées (1 question = 1 prompt) → manifest YAML validé
2. **Run** — invoque `runner-qa` en Bash, capture le rapport
3. **Résumé** — présente le résultat au user, lien vers les screenshots

**Hard rule** : aucun manifest n'est sauvegardé sur disque sans avoir passé `parseManifest()` (T122). Pas d'auto-fix silencieux.

---

## [PHASE 1/3] Interview Claude-driven

### 1.0 Détection manifest pré-existant

```bash
ls "<projet>/.shikamaru/qa-config.yaml" 2>/dev/null
```

**Si manifest existe** :

```
🔍 Manifest QA détecté : .shikamaru/qa-config.yaml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Affiche un résumé : baseUrl, N parcours, viewports]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Que fait-on ?
```

AskUserQuestion (1 question, 4 options) :
- **Garder tel quel** → skip Phase 1, va à Phase 2
- **Re-interview complète** → écrase après confirmation explicite
- **Édit ciblé** → demande quel champ modifier (sub-question)
- **Pause** → sauvegarde état + arrête

**Hard rule** : JAMAIS écrase le manifest existant sans confirmation explicite du user.

**Si pas de manifest** : passe à 1.1.

### 1.1 Détection parcours candidats (heuristiques)

Avant de poser Q3 (parcours), Claude scan le projet pour PROPOSER des candidats. Voir `references/qa-interview-prompts.md` section "Heuristiques détection parcours".

Résumé des heuristiques :
- Routes Next.js : `app/**/page.tsx`, `pages/**/*.tsx`
- Routes Vue/Svelte : `src/routes/**/*` (SvelteKit), `src/views/**` (Vue Router)
- Endpoints exposés dans `package.json scripts`
- URLs présentes dans tests existants (`*.spec.ts`, `*.test.ts`, `*.e2e.ts`)
- Forms détectés : `<form>` dans .tsx/.vue/.svelte/.html

Stocke la liste détectée pour usage en Q3.

### 1.2 Six questions structurées

⚠️ **Hard rule globale** : `1 question = 1 prompt`. Jamais batcher (cf. global CLAUDE.md). Si tu as besoin d'enchaîner 2 questions, fais-les séquentielles.

Pour chaque question, voir `references/qa-interview-prompts.md` (banque complète : prompts à afficher, exemples bonnes réponses, conversion → YAML).

Ordre fixe :

| # | Question | Champ YAML produit |
|---|----------|--------------------|
| Q1 | URL test (dev/staging) | `baseUrl` |
| Q2 | Auth requise ? Si oui : login URL, sélecteurs, env var password | `auth` (optionnel) |
| Q3 | 3 parcours critiques (Claude propose les candidats détectés en 1.1) | `parcours[].name` + `steps[]` |
| Q4 | Viewports à tester | `viewports` |
| Q5 | Données de test à utiliser (email/login de test, etc.) | injecté dans `auth.email` ou `steps[].value` |
| Q6 | Actions destructives à éviter en run | `ignoreList` + warning baseUrl prod |

Pour Q3, expansion sub-questions : pour CHAQUE parcours retenu, demande la séquence d'actions (goto → fill → click → expect). Une sub-question par parcours, pas plus.

### 1.3 Conversion → YAML + validation

À la fin des 6 questions :

1. Construis le YAML en mémoire (string) selon `references/qa-config-schema.md`.
2. **Affiche le YAML brut au user** pour relecture rapide.
3. Écris le YAML dans un fichier temp `/tmp/shika-qa-draft-<run-id>.yaml` (jamais sur disque projet avant validation).
4. Invoque le parser :
   ```bash
   SHIKA_ROOT="$(dirname "$(readlink -f "$(which shikamaru 2>/dev/null)")")/../" \
     || SHIKA_ROOT="/Users/loicjalmin/Projects/shikamaru"
   DRAFT="/tmp/shika-qa-draft-$RUN_ID.yaml"

   cd "$SHIKA_ROOT/runner-qa"
   npx tsx -e "
     import { parseManifest } from './src/manifest.ts';
     import { readFileSync } from 'node:fs';
     const yaml = readFileSync('$DRAFT', 'utf8');
     const result = parseManifest(yaml);
     if (!result.ok) {
       console.error(JSON.stringify({ ok: false, errors: result.errors }, null, 2));
       process.exit(1);
     }
     console.log(JSON.stringify({ ok: true }));
   "
   ```
   ⚠️ **Pour Claude qui exécute** : remplace `$DRAFT` par le path littéral du fichier temp. Le snippet ci-dessus est exécutable tel quel via Bash (pas via `tsx -e` directement avec une string interpolée).
5. **Si parsing OK** → `mv "$DRAFT" "<projet>/.shikamaru/qa-config.yaml"` (création du dossier `.shikamaru/` si absent).
6. **Si parsing fail** → affiche les `ParseError[]` au user avec `path` explicite, retourne à la Q correspondante. Pas d'auto-fix silencieux. Le fichier temp reste pour debug, supprimé à la prochaine exécution.

### 1.4 Sauvegarde + interruption (`pause`)

À tout moment, si user dit `pause` :
- Sauve l'état partiel dans `<projet>/.shikamaru/qa-interview-state.json`
- Format : `{ step: "Q3", answeredSoFar: {...}, candidatesParcours: [...] }`
- Arrête proprement.

Au prochain `/shika-qa`, détecte ce fichier en 1.0 et propose **Reprendre l'interview**.

---

## [PHASE 2/3] Run

### 2.1 Vérifications avant run

- `<projet>/.shikamaru/qa-config.yaml` existe et a passé Phase 1.
- Si `auth.passwordEnvVar` est défini → vérifie que l'env var est set dans l'env courant. Sinon : demande au user de la set et arrête.
- Si `baseUrl` matche un pattern prod (heuristique : domaine racine sans `localhost`/`staging`/`dev`/`preview` dans le sous-domaine) → **demande confirmation explicite** avant lancement.

### 2.2 Lancement runner-qa

```bash
RUN_ID="$(date +%Y%m%d-%H%M%S)"
PROJECT_ROOT="$(pwd)"  # le projet courant (où l'utilisateur invoque /shika-qa)
SHIKA_ROOT="/Users/loicjalmin/Projects/shikamaru"
OUTPUT_DIR="/tmp/shika-qa/$RUN_ID"

mkdir -p "$OUTPUT_DIR"

cd "$SHIKA_ROOT/runner-qa"
npx tsx src/cli.ts \
  --manifest "$PROJECT_ROOT/.shikamaru/qa-config.yaml" \
  --run-id "$RUN_ID" \
  --output "$OUTPUT_DIR" \
  > "$OUTPUT_DIR/stdout.log" \
  2> "$OUTPUT_DIR/stderr.log"

EXIT_CODE=$?
```

`runner-qa/src/cli.ts` (T125) wrap parseManifest + runManifest + reporter. Sortie stdout : un objet JSON `{ ok, runId, pass, fail, total, reportPath, jsonPath }` consommable par Claude.

### 2.3 Capture & affichage exit

- Si `EXIT_CODE = 0` → run terminé normalement (peut contenir des fails de parcours).
- Si `EXIT_CODE != 0` → erreur infra (Playwright manquant, port conflict, etc.).

Dans ce cas (échec infra) :
- Affiche `stderr.log` brut au user.
- Si message contient `Executable doesn't exist` → propose `npx playwright install chromium` puis retry.
- Sinon → marque le run en erreur, passe à Phase 3 avec rapport vide.

---

## [PHASE 3/3] Résumé

### 3.1 Lecture du rapport

Le rapport est dans `/tmp/shika-qa/<run-id>/report.md` (généré par `runner-qa/src/reporter.ts` T124).

```bash
cat "/tmp/shika-qa/$RUN_ID/report.md"
```

### 3.2 Présentation condensée au user

Affiche :

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 QA — Run terminé
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[X] pass / [Y] fail (parcours)

Parcours en échec :
  • [name] : [code] — [message court]
  • ...

Erreurs détectées (top 5) :
  • [type] [url] — [message]
  • ...

Screenshots : /tmp/shika-qa/<run-id>/
Rapport complet : /tmp/shika-qa/<run-id>/report.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3.3 Edge cases résumé

- **0 erreur ET 0 parcours fail** → afficher warning : "0 erreur — vérifie qu'au moins un parcours échoue volontairement, sinon le manifest n'a probablement pas testé ce que tu pensais."
- **Tous les parcours fail au même step** → suspect : auth cassée OU baseUrl down. Suggère vérifier ces deux causes.
- **Résultat `abort` avec `code: AUTH_ENV_MISSING`** → l'env var de password n'est pas set. Affiche le nom de l'env var concernée.

### 3.4 Lien Drive (optionnel, V2)

Si `<projet>/.shikamaru/drive-config.yaml` configure un dossier Drive cible :
- Upload `report.md` + screenshots (V2 — non implémenté en T125).

---

## Boundaries

- ✅ **Always** :
  - Passer le manifest généré par `parseManifest` AVANT sauvegarde
  - Lire le code projet pour proposer parcours candidats
  - Respecter "1 question = 1 prompt"
  - Afficher la commande Bash exacte avant lancement runner

- 🚫 **Never** :
  - Écrire un manifest non-validé sur disque
  - Lancer le runner sans afficher la commande au user
  - Auto-fix silencieux des erreurs de parsing

- ⚠️ **Ask first** : si `baseUrl` matche un pattern prod, confirme avant lancement runner

---

## Boucle de retour

```
Que fais-on ensuite ?
  1) Re-run        — relancer avec le même manifest
  2) Édit manifest — modifier un parcours et re-run
  3) /shika-speccer — créer une task pour fix un parcours fail
  4) Rien          — c'est bon
```

---

## Fichiers utilisés

| Fichier | Rôle |
|---------|------|
| `.claude/commands/references/qa-config-schema.md` | Schéma manifest (T122) |
| `.claude/commands/references/qa-interview-prompts.md` | Banque questions + heuristiques |
| `<projet>/.shikamaru/qa-config.yaml` | Manifest sauvegardé |
| `<projet>/.shikamaru/qa-interview-state.json` | État interview pause |
| `/tmp/shika-qa/<run-id>/report.md` | Rapport markdown |
| `/tmp/shika-qa/<run-id>/*.png` | Screenshots multi-viewport |

---

*Note : pas de tests unitaires sur ce SKILL (markdown). Acceptance test = T127 (pilote KalioKool dogfooding). Si T127 expose des friction points, retour spec ici.*
