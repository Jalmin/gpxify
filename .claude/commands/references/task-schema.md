# Task Schema — Référence stricte

Spec des champs OBLIGATOIRES et OPTIONNELS pour une task Shikamaru.
Le Speccer utilise ce schéma pour son Quality Gate à l'étape 5.

---

## Types de tasks

Le Speccer détecte le type automatiquement depuis le titre/goal. Si ambigu → demande au user.

| Type | Détection (mots-clés) | Exemples |
|------|----------------------|----------|
| `setup` | install, config, OAuth, secret, env, deploy | Setup Google Workspace MCP |
| `cleanup` | archive, remove, delete, deprecate, refactor (sans logique) | Archiver Phase 4 |
| `core` | feature, logique, algo, calcul, validation, parser | Prompt routine nocturne |
| `integration` | API, webhook, MCP, HTTP, external, SMTP, email | Morning brief via IMAP+SMTP |

---

## Tiers de complexité

Le Speccer classe chaque task par tier de complexité **avant** d'appliquer le schéma. Le tier détermine la profondeur de spec attendue. Référence : Addy Osmani (O'Reilly Sept 2025) pour l'heuristique **"would a junior need the how"**.

**Les seuils chiffrés, eux, sont mesurés sur ces dépôts** — recalibrage T207, chiffres rejoués le 2026-09-14 par `scripts/run-cost.py` sur deux fenêtres nommées, ancrées sur `origin/main` : Ziggy depuis le 08/09 (60 commits `feat`) et KONBINI core depuis le 01/09 (92), soit **152 commits** ; code produit seul, tests exclus. Les seuils venaient auparavant de SWE-Bench Pro / Devin (Cognition 2025), jamais recalibrés : **82 % du corpus dépassait alors le seuil de rejet L** (125 commits sur 152), toute la plage XS+S+M n'en couvrant que 27. Une grille dont le tier le plus haut est refusé quatre fois sur cinq ne classe plus — elle rabat tout sur M. Sous les bornes ci-dessous, le même corpus donne XS 8,6 % (13), S 19,7 % (30), M 59,2 % (90), L 12,5 % (19).

Pour rejouer : `python3 scripts/run-cost.py --project <dépôt> --since <début de fenêtre> --until 2026-09-14T23:59:59+02:00 --ref origin/main`. L'ancrage sur `origin/main` fait partie de la mesure : sur un checkout partagé, `HEAD` se déplace et le corpus avec lui.

| Tier | Surface (LOC) | Fichiers | Durée typique | Exemple |
|------|---------------|----------|---------------|---------|
| **XS** | ≤60 | ≤2 | 5-15 min | typo, accent, label, copy change, update date |
| **S** | ≤200 | ≤3 | 15-30 min | ajout champ formulaire, fix bug local, refacto fichier |
| **M** | ≤1200 | ≤7 | 30-90 min | logique nouvelle, intégration, feature complète |

### Heuristique primaire de classification

**La taille, mesurée en fichiers et en lignes.** Les quatre lignes de la matrice ci-dessus sont l'heuristique primaire : c'est le couple (fichiers, lignes) qui sépare XS, S et M, et lui seul.

**"Would a junior need the how?" ne route plus (T213, 2026-09-15).** La question reste utile pour juger la *profondeur du Prompt* à écrire, jamais pour choisir un tier : une task dont le Speccer a déjà rédigé le Prompt y répond toujours `oui`, donc elle ne discrimine rien au moment où on classe. Mesuré : T204 (2 fichiers, 20 lignes) classée M sur ce seul signal le 2026-09-13 ; sur Ziggy, le sous-agent léger a rendu **27 M pour 2 S et 2 XS** par ce chemin ; sur le sprint REVUE-ZIGGY, **9 tasks spécifiées M pour 3 livrées M** au verdict de taille de T209.

### Heuristiques chiffrées (validation secondaire)

Arbre de décision en 2 questions (règle d'étiquetage du niveau de review — aucune task n'est rejetée ni scindée par sa taille) :

```
Q2: La modif touche-t-elle ≤2 fichiers ET ≤60 lignes ?
    OUI → XS
    NON → continue Q3

Q3: La modif touche-t-elle ≤3 fichiers ET ≤200 lignes ?
    OUI → S
    NON → M
```

⚠️ **Le besoin du *how* ne route plus (T213, 2026-09-15) : la taille seule tranche XS, S et M.** L'ancienne question de tête (« un dev junior a-t-il besoin du HOW ? ») envoyait toute sa branche `oui` vers `M` sans jamais évaluer de borne de taille — et **une spec écrite y répond toujours oui**, puisque le Prompt step-by-step est précisément ce que le Speccer vient de produire. Le signal ne discriminait donc plus rien au moment de classer : T204 (2 fichiers, 20 lignes) sortait `M` par ce seul chemin, et le sous-agent léger a rendu `27 M pour 2 S et 2 XS` sur Ziggy. Le champ `junior_needs_how` **reste émis** par le classifier, en signal informatif.

⚠️ Les deux bornes de Q2 sont **conjonctives** : `≤2 fichiers` **ET** `≤60 lignes`. Une seule des deux dépassée suffit à sortir de XS — c'est ce qui sépare XS de S (cas mesuré : 3 fichiers pour 59 lignes → S, DA-3B, mesure T207).

⚠️ Les deux bornes de Q3 sont **conjonctives** de la même façon : `≤3 fichiers` **ET** `≤200 lignes`. Une seule dépassée sort de S vers M (cas mesuré : 3 fichiers pour 473 lignes → M, DA-5B, mesure T207). `Q2` et `Q3` recopient les colonnes `Fichiers` et `Surface (LOC)` de la matrice ci-dessus — les modifier ici sans l'y faire casse l'accord entre l'arbre et la grille.

### Règles de classification

- **Doute → S** + commentaire dans rationale
- **Task XS qui touche >2 fichiers OU >60 lignes total** → auto-promote à S
- **Tasks Phase 1-11 sans tier explicite** → default rétro = M (compatibilité, pas de breaking change)

---

## Matrice des champs OBLIGATOIRES par tier × type

La matrice est désormais à **double axe**. Le champ requis dépend simultanément du tier (XS/S/M) et du type (setup/core/integration/cleanup).

| Champ | XS | S | M (setup) | M (core) | M (integration) | M (cleanup) |
|-------|----|----|-----------|----------|-----------------|-------------|
| **Goal** (1 phrase) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Context** (pourquoi) | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Files** (liste) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Prompt** (exécutable) | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Critères de done** | 1+ | 3+ | 3+ | 3+ | 3+ | 3+ |
| **TDD Tests d'abord** | — | — | — | ✅ | ✅ | — |
| **Edge cases** (3+ table) | — | — | ⚠️ | ✅ | ✅ | ⚠️ |
| **Boundaries** (✅/⚠️/🚫) | — | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| **Fallback** (si erreur) | — | — | ⚠️ | ✅ | ✅ (strict) | — |
| **Smoke:** (assertion live) | — | — | — | — | — | — |
| **Timeout:** (secondes) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Rollback** (revert) | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Durée estimée** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Légende : ✅ obligatoire | ⚠️ recommandé (warning) | — optionnel | `1+` / `3+` = nb minimum d'items
**Smoke** : facultatif — la preuve se fait au run, §d.0 de `shika-run.md`. Un Smoke écrit reste joué par le runner en d.1bis (T224, 2026-09-26).

---

## Spec par champ — règles rapides

| Champ | Format | Invalide si |
|-------|--------|-------------|
| Goal | 1 phrase impérative, résultat mesurable (> 20 char) | "Améliorer la qualité" / non-mesurable |
| Context | 1-3 phrases, mentionne un pourquoi (> 30 char) | "On a besoin de ça" |
| Files | Liste de chemins relatifs (au moins 1) | "tout le projet" / pas de chemin |
| Prompt | Instructions exécutables (> 100 char, ≥1 verbe) | "Tu sais quoi faire" |
| Done | ≥3 checkboxes binaires. **Tout critère CHIFFRÉ doit nommer son GRAIN** (l'unité comptée) | < 3 items / "Que ça marche bien" / **un nombre sans unité de comptage** (ex « 20 posts » sans dire post ≠ adset ≠ campagne) |
| TDD | Liste tests AVANT le code, avec résultat attendu | Tests écrits après le code |
| Edge cases | Table ≥ 3 lignes Situation/Comportement, domaine-spécifiques | Copier-collés génériques |
| Boundaries | ≥1 Always + ≥1 Never | Manque Always OU Never |
| Fallback | Mentionne "si"/"quand" + action alternative | Absent en M.core ou M.integration |
| Smoke | `start_cmd` optionnel (lance l'app) + ≥1 commande d'assertion **exécutable** (ex `curl -sf localhost:$PORT/api/x \| grep -q 'expected'`) rattachée à ≥1 critère de Done | Pas de commande exécutable **OU** pas d'assertion (grep / exit-code / status HTTP). |
| Timeout | **Optionnel.** Entier de SECONDES (`**Timeout:** 300`), plafonné à 600 s | Valeur non entière (ignorée, défaut 60 s) / champ posé « au cas où » sans assertion lente à couvrir |
| Rollback | Commande/action concrète | "À voir" / absent en M+ |
| Durée | Nombre + unité (ex: 45min, 2h) | "rapide" / "indéterminée" |

---

## Règle du GRAIN (critères de Done chiffrés)

**ALWAYS** : tout chiffre d'un critère de Done **nomme l'unité qu'il compte**. Un critère chiffré sans grain est **invalide** — le Speccer le refuse à l'étape 5.3, il ne doit pas remonter en review deux passes plus tard.

**Why** — 4 occurrences où la requête était juste dès le départ et la conclusion fausse quand même :
- KONBINI T80 (2026-07-29) : conclusion métier fausse **2 passes de suite** — post vs adset, puis post vs code projet.
- KONBINI T83 (2026-07-30) : le test remonte **20 posts**, la ventilation par plateforme n'en trouve que **18** — `account_name` ajouté au `GROUP BY` scinde les 2 posts poussés par deux marques en fragments mono-pub et **masque le double comptage**. Compter au grain d'AFFICHAGE plutôt qu'au grain MÉTIER sous-compte.
- Run 2026-07-29-001 : « MAILLE non explicitée », ×2.

**How to apply** : « 20 posts » → « 20 **posts distincts** (`post_id`), pas 20 lignes ni 20 couples post×marque ». Si le grain n'est pas exprimable en une parenthèse, le critère n'est pas prêt.

---

## Signaux backend

Liste autoritative des signaux backend dans les `Files` ou le `Goal`/`Prompt` d'une task, lue par le Runner. **Elle n'impose plus rien au Speccer** depuis T224 (2026-09-26) : ni Smoke obligatoire, ni stub, ni escalade de tier — la preuve live se fait au run (§d.0 de `shika-run.md`).

### Paths (fichiers touchés)

| Pattern | Exemple |
|---------|---------|
| `server/` | `server/src/routes/auth.ts` |
| `api/` | `src/app/api/documents/route.ts` |
| `routes/` | `app/routes/webhook.py` |
| `**/*.py` | tout fichier Python (backend par défaut) |
| `scripts/*.ts` (non-front) | `scripts/synthesize-learnings.ts`, jobs/CLI TS hors composants UI |

### Mots-clés (Goal / Prompt / Context)

`endpoint` · `route` · `webhook` · `SMTP` · `.env` · `os.environ` · `process.env` · `DATABASE_URL` · `ANTHROPIC_API_KEY`

### Champ `**Timeout:**` — budget d'UNE assertion Smoke

**Optionnel.** Un entier de **secondes**, qui remplace le budget par défaut d'une assertion du gate Smoke.

```markdown
**Timeout:** 300
```

| | Valeur |
|---|---|
| Défaut si le champ est absent | **60 s** |
| Plafond d'une valeur déclarée | **600 s** (au-delà : borné, et le bornage est annoncé) |
| Valeur illisible (`abc`, `0`) | champ **ignoré**, défaut 60 s, aucun crash |
| Précédence | `SMOKE_ASSERT_TIMEOUT_MS` (opérateur) > `**Timeout:**` (task) > 60 s |

**Quand le poser** : uniquement quand une assertion est *légitimement* lente et qu'on peut le dire — import Prefect, requête BigQuery, dry-run paginé par un rate-limit. Trois occurrences mesurées où le gate coupait une commande valide.

🚫 **Never** : ne pas s'en servir pour faire taire une assertion qui pend. Un timeout n'est **pas** un échec — c'est une mesure IMPOSSIBLE (`SMOKE_ASSERT_TIMEOUT`, verdict `error`, exit 1). Allonger le budget d'une commande qui ne conclut jamais ne fait que reculer le même verdict.

⚠️ Le champ borne **une** assertion, pas le bloc entier : cinq assertions à `**Timeout:** 300` peuvent coûter 25 minutes.

---

### Disjonction Smoke ⟂ Recettage

**Smoke** et **Recettage** sont **DISJOINTS** — deux gates distincts, deux moteurs :

| Gate | Cible | Moteur | Assertion |
|------|-------|--------|-----------|
| **Smoke** | backend (endpoint, env var, service) | **shell / HTTP** (`curl`, exit-code, `grep`) | commande exécutable rattachée au Done |
| **Recettage** | front (UI, DOM, interaction) | **Playwright** (navigateur) | snapshot / assertion visuelle |

Un Smoke (facultatif depuis T224, backend) et un Recettage (front) ne se remplacent pas : une task fullstack peut porter les deux. Ne **jamais** réutiliser le moteur Playwright pour un Smoke (Smoke reste shell/HTTP, pas navigateur).

⚠️ **Le dialecte d'une assertion Smoke est `bash`** (`scripts/smoke.ts`, `runAssertion` → `spawn('/bin/bash')`). La substitution de processus `<(…)`, `[[ … ]]` et `(( … ))` sont donc autorisés. Écrit ici parce que ça ne l'était pas : la ligne ci-dessus disait « shell » sans nommer de dialecte, le Speccer écrivait du bash, et le lecteur exécutait `/bin/sh` — strictement plus pauvre. T210 (2026-09-14) a rendu FAIL sur une assertion **parfaitement valide** qui n'avait pas pu s'exécuter, alors que les trois propriétés qu'elle vérifiait étaient tenues. Un gate qui rougit sur son propre lecteur pousse à réécrire le test pour le faire verdir, ce que `d.1bis` interdit. Corrigé par la PR #181.

### Règle code DB (schéma vérifié + test non-mocké)

Toute task dont le code touche la DB (select, filtre, migration, RLS) :

- **ALWAYS** vérifier les tables/colonnes citées contre la source de vérité du schéma (`src/types/supabase.ts`, `schema.prisma`, migrations) avant d'écrire la spec — cf. speccer §5.1ter.
- **ALWAYS** exiger ≥1 test d'intégration **non-mocké** OU un Smoke live. Des tests 100 % mockés n'exécutent jamais le select réel.

**Why** : KalioKool 2026-07-10 (`organizations.trial_ends_at` inexistante → fail-open) + 2026-07-12 (filtre `deleted_at` faux, jamais exécuté car mocké — rattrapé par le smoke live seul).

### Règle chemin récurrent (identité + machine)

Un smoke qui valide un chemin **récurrent** (cron, service, webhook, scheduled job) doit exercer **l'identité ET la machine du chemin réel** — pas un équivalent manuel. Un `rsync` lancé depuis le Mac (qui a la clé SSH) ne prouve RIEN sur le cron du serveur (qui ne l'a pas).

**Why** : pythia-lab T4→T14 (2026-07-08) — smoke vert sur l'équivalent manuel, cron serveur en échec silencieux 2 jours (clé SSH absente côté serveur).

**How to apply** : si la task installe/modifie un cron ou service, l'assert du Smoke déclenche le chemin réel (ex: `ssh server 'run-parts --test /etc/cron.d/x'`, forcer 1 exécution du job et vérifier son output) ou, à défaut, marque la task `needs_user_validation` — jamais `done` sur un équivalent manuel.

### Règle boundary-volume (coût de contexte caché)

Une boundary « Always: passer par le MCP/outil X » fait transiter le LIVRABLE par le contexte du runner — coût proportionnel au volume, invisible du tier (qui mesure la difficulté). **ALWAYS** estimer le volume traversant au spec ; au-delà de ~20K tokens, autoriser un chemin écrivant sur disque si les critères Done vérifient déjà l'invariant que la boundary protège.

**Why** : KalioKool 2026-08-01 — task tier S, livrable 110 Ko → ~30K tokens dans le contexte du runner via le MCP.

### Règle assert CLI (structure, pas mise en forme)

Un assert sur une sortie CLI matche la **structure**, jamais l'alignement : `grep -qE 'Pass Rate +100%'` (quantificateur `+` sur les espaces), pas `grep -q "Pass Rate               100%"`.

**Why** : BDO 2026-07-27 — smoke en échec sur l'espacement figé alors que les 2 conditions réelles étaient vertes (faux négatif, cousin de « asserts = invariants, pas littéraux »).

### Convention fixtures smoke

- **ALWAYS** taguer toute donnée écrite par un smoke avec une source `smoke*` (ex: `source: "smoke-T14"`).
- **ALWAYS** filtrer `smoke*` par défaut dans tout nouveau ledger/stat/rapport **dès sa création** (pas après coup).

**Why** : pythia-lab 2026-07-08 — fixtures smoke comptées dans les stats de prod → faux diagnostic opérateur (a trompé le main agent lui-même).

---

## Quality Gate — règles de validation

Le Speccer étape 5 vérifie cette checklist pour **chaque task** avant de passer à l'étape 6.

### Comportement par statut

- **Tous champs obligatoires présents + valides** → ✅ Task validée
- **1+ champ obligatoire manquant** → ⛔ BLOCAGE, boucle interactive pour compléter
- **Champ recommandé manquant** → ⚠️ Warning affiché, passage possible avec `--force`

### Validation qualitative (au-delà de la présence)

Pour chaque champ présent, vérifier qu'il respecte la spec :

| Check | Règle |
|-------|-------|
| Goal | > 20 char, verbe au début, ne pas commencer par "Améliorer" sans détail |
| Context | > 30 char, mentionne au moins un "pourquoi" |
| Files | Au moins 1 path, pas "le projet" |
| Prompt | > 100 char, contient au moins 1 verbe d'action |
| Done | Minimum 3 checkboxes |
| Edge cases | Minimum 3 lignes table |
| Boundaries | Au moins 1 Always, 1 Never |
| Fallback | Mentionne "si" ou "quand" + action alternative |

### Message d'erreur standardisé

```
⛔ TASK INCOMPLÈTE : {task_id} ({type})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Champs manquants (OBLIGATOIRES) :
• {champ1}
• {champ2}

Champs faibles (RECOMMANDÉS) :
• {champ3} : {raison}

Je te pose les questions manquantes maintenant.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. {champ1} :
   > [attends input]
```

---

## Anti-patterns à refuser

Le Speccer rejette ces patterns même si les champs sont remplis :

| Anti-pattern | Pourquoi refuser |
|--------------|------------------|
| "Task de tests séparée" pour tester une feature | Les tests sont DANS la task, pas à part |
| Critères de done non-binaires | "Que ce soit propre" = pas vérifiable |
| Files = "tout le projet" | Scope impossible à circonscrire |
| Prompt = "Tu sais quoi faire" | Pas autonome, nécessite contexte externe |
| Edge cases copier-collés génériques | Doivent être spécifiques au domaine de la task |
| "Durée : indéterminée" | Besoin d'une estimée même grossière |

