---
name: shika-speccer
description: "Speccer Shikamaru — spec interactive pour generer SPEC.md et TASKS.md detailles. UTILISER QUAND: ajouter une feature, specer un projet, generer des tasks, ou mots-cles 'spec', 'speccer', 'planifier', 'decoupe en tasks', 'nouvelle feature', 'il faut ajouter', 'roadmap'."
---
# /shika-speccer
*Justifications (Why) des règles : `~/Projects/shikamaru/.claude/commands/references/speccer-learnings.md` (repo source) — maintenance uniquement, ne PAS lire pendant une spec.*
Flow strict avec checkpoints et Quality Gate TDD. Attends TOUJOURS la reponse user avant de passer a l'etape suivante. Affiche `[ETAPE X/Y]` a chaque etape.
**Zero task incomplete** : une task ne sort PAS tant qu'elle n'est pas complete au sens du schema strict (task-schema.md). Quality Gate etape 5 bloque sinon. **Exception XS-fast** : si l'étape 0bis classe `tier=XS`, le flow saute en `[ETAPE 4-XS/6]` qui applique sa propre validation (3 champs + anti-patterns inline) — la QG étape 5 et la matrice task-schema.md sont skip explicites.
**Chargement references** : NE PAS lire les references au demarrage. Chaque etape indique explicitement quels fichiers charger ("📄 Charger : ..."). Etapes 0-3 n'ont besoin d'aucune reference.
Commandes speciales : `pause` (sauvegarde etat), `test`/`verifie` (lance test, attends "ok"), `reviens`/`continue` (reprend checkpoint), `reset` (etape 0).

---
## [ETAPE 0/6] Context Snapshot (auto)
1. Detecte structure modular monolith : `subprojects/` existe ? Si OUI scope = sous-projet courant (lis CLAUDE.md/TASKS.md/AGENTS.md du sous-projet UNIQUEMENT). Si NON projet entier.
2. **Auto-archive** : si TASKS.md existe, `npx tsx ~/Projects/shikamaru/scripts/archive-done-tasks.ts --apply`. Script absent → skip.
3. Lis TASKS.md uniquement. CLAUDE.md est déjà en system prompt — ne pas relire. AGENTS.md trop volumineux pour step 0 — skip (lire AGENTS.md seulement en step 4b si la feature touche la core infra). DECISIONS.md absent → skip.
4. **Actions de reunion** : si `.shikamaru/reunions.md` existe, compte les `- [ ]` non cochees. Ce sont des engagements pris a l'oral, deposes par meeting-pager le jour meme, qui n'existent nulle part ailleurs — TASKS.md ne les connait pas.
4bis. **Guetteur** : `npx tsx ~/Projects/shikamaru/scripts/guet-status.ts` (script absent → skip ; exit 0 toujours, ≤ 5 s). Toute ligne `⚠ {tâche} — {DOWN|en attente de signal}` s'affiche dans le snapshot sous « Signes de vie en panne » et peut devenir une task via le menu e), même traitement que les actions de reunion. Une ligne `guetteur : injoignable (…)` s'affiche telle quelle, sans bloquer.
5. Detecte stack (package.json / pyproject.toml), compte tasks par status
6. Affiche snapshot (projet, scope, stack, tasks counts, decisions). **Si des actions de reunion attendent, affiche-les dans le snapshot**, groupees par reunion avec leur date : `☐ {responsable} — {quoi} — {echeance}`. → passe auto a etape 1
## [ETAPE 1/6] Detection run recent
Verifie `.runner-state.json` existe et date < 24h. Si OUI → affiche dernier run date + tasks executees, demande "On review ? (o/n)". Si "o" → etape 2. Si "n" → etape 4. Si NON → etape 4 direct.
## [ETAPE 2/6] Review du run
Affiche resume : done/blocked/en-cours counts, PRs creees (liens), branches (merged/open). Demande "Des tasks bloquees a trier ? (o/n)".
## [ETAPE 3/6] Triage des blocages
Pour CHAQUE task blocked/failed, affiche raison et demande : 1) Reformuler → ready, 2) Decouper en sous-tasks, 3) Backlog, 4) Abandonner. Attends reponse, applique, passe a la suivante.
## [ETAPE 4/6] Planification
Affiche tasks pending + ready. Propose :
- **a) Sprint** → liste tasks, demande lesquelles inclure. Si les tasks retenues viennent d'une même source (revue, QA, liste de corrections) et se partagent des fichiers → **proposer le regroupement au user, en UNE question** ; **NEVER** regrouper rétroactivement d'office (règle de [regroupement par fichier](#génération-des-tasks-suite-étape-4b--m-uniquement)).
- **b) Feature** → demande description 1-2 phrases + fichiers touches, **OU accepte tel quel un brief de 5 lignes** issu d'un brainstorm (quoi · pourquoi · plus petite forme · ce qu'on ne fait pas · comment on saura). Le brief EST le scope confirmé : la restitution du scope guard porte sur sa première ligne, sans re-question ; « ce qu'on ne fait pas » alimente les Boundaries Never ; « comment on saura » alimente le Done.
- **c) Brainstorm** → discussion libre, **sans gabarit, sans tier, sans questions en série** — lire le réel AVANT d'avoir un avis (code, QUESTS.md, learnings, runs récents), puis contester, proposer 2-3 formes, chercher ce qui existe déjà, mesurer ce que ça coûterait d'annuler. Si ça aboutit : produire le brief de 5 lignes et enchaîner sur b) avec ce brief. Sinon repropose le menu.
- **d) Pause** → sauvegarde `.shikamaru/speccer-state.json`
- **e) Actions de reunion** (propose UNIQUEMENT si `.shikamaru/reunions.md` contient des `- [ ]`) → affiche-les numerotees, demande lesquelles deviennent des tasks. Pour chacune retenue : elle entre dans le flow b) Feature avec l'action comme scope verbatim. Pour chacune ecartee, demande si elle est faite (coche `- [x]` dans le fichier) ou hors sujet (supprime la ligne). **Ne coche jamais une ligne sans reponse user** : le fichier est sa memoire des engagements pris.
### Si choix b) — Anti-overspec scope guard
AVANT tout decoupage :
1. Restitue EXACTEMENT le scope user : *"Tu veux : {scope verbatim}. C'est ca ?"*
2. Si tu envisages d'elargir → demande EXPLICITE : *"J'ajouterais {Y et Z}. OK ou strict ?"*
3. NE PAS auto-elargir meme si "ca parait coherent"
4. **Gate quête** (scope confirmé, avant découpage) → voir [Gate quête](#gate-quête--ça-sert-quelle-quête--souple-référencée-depuis-4b-4-xs-4-s). S'applique aux 3 modes ; **mode a) Sprint exempté** (pas de re-question).
### Si choix b) — Lot issu d'une source unique : regrouper AVANT de classer
Si la feature est un **lot** de remarques d'une même source — revue client annotée, liste de corrections, retours QA, findings reportés d'une review — le regroupement s'applique **ici**, avant la pré-classification et quel que soit le tier que le lot entier aurait reçu. Le tier se décide **ensuite, par task regroupée** : 0bis sur chaque groupe, puis le flux de son tier (XS-fast, S-mini ou M). **NEVER** router un lot en XS/S sans l'avoir regroupé d'abord : c'est le trou que la review de T214 a mesuré (PR #186, P1).
**Regroupement par fichier touché — un lot issu d'une source unique.** « Atomique » borne la TAILLE d'une task, pas son nombre de remarques : le coût d'une task est sa cérémonie (branche, PR, review, merge), pas son contenu. Dès que les tasks d'un lot viennent d'une même source — **revue client annotée, liste de corrections, retours QA, findings reportés d'une review** — le critère de découpe est **« même groupe de fichiers touchés ⇒ même task »**, et **NEVER** une task par remarque.
- **Borne haute = la grille M** (`≤7` fichiers, `≤1200` lignes, tests compris). Un groupe qui la dépasse **se scinde par fichier, jamais par remarque**.
- **Groupe mono-fichier hors grille** (une seule cible, plus de 1 200 lignes de remarques) : scinder par **sections indépendantes du fichier**, chaque section gardant ses critères `Done:` par remarque ; par remarque en dernier recours seulement (PR #186, P2).
- **Exclusion moteur / écran** : une remarque qui touche le moteur (`engine/`, calcul, domaine) ne se regroupe **jamais** avec une remarque d'écran, même si elles partagent un fichier. Une remarque à cheval sur les deux reste seule.
- **Aucune remarque ne se perd** : la task regroupée porte un critère `**Done:**` binaire **par remarque**, et un `**Context:**` qui **cite chaque remarque d'origine** (écran, capture, phrase du client).
- **Fichiers non identifiables au moment de la spec** → une task par remarque, et le dire. Le regroupement n'est **jamais** forcé sur une estimation.
- **Ce que la règle NE change PAS** : la grille M reste la borne de regroupement ; les tests de la task regroupée couvrent **chaque** remarque ; deux remarques qui se contredisent vont dans la même task, le `Context:` nomme la contradiction et le `Done:` attend l'arbitrage user.
- **Mode a) Sprint** : **NEVER** de regroupement rétroactif automatique sur des tasks déjà spécifiées — le proposer au user, en une question.
📊 **Why** : revue Ziggy du 14/09 — 30 écrans annotés découpés « par contrat mis à l'épreuve » (un critère de test, pas un critère de task) → 13 tasks, soit 13 PRs à 36 min machine et 4 touches humaines chacune. Sous cette règle : **5 tasks**, donc **8 PRs et 32 touches humaines évitées**. Rejeu fichier par fichier dans `references/speccer-learnings.md`.

### Si choix b) — Pre-classification (regex, puis le Speccer lui-même)
APRÈS confirmation scope ET AVANT décourage en tasks :
📄 **Charger :** `references/tier-classifier-fast.md` (heuristique regex)
**Le tier est une étiquette de niveau de review, rien d'autre** : XS = pas de review (≤ 2 fichiers et ≤ 60 lignes, hors voie fermée du runner §e.0), S = `standard`, M = `opus`. **Doute → S.** Aucun sous-agent, aucun rejet, aucune scission imposée par la taille : un gros travail devient un objectif à plusieurs étapes sur une seule branche (`shika-run.md` §1.4).
**Procédure :**
1. **Override user** : argument explicite `tier=X` (X in {XS,S,M}) → bypass, log warning `.shikamaru/speccer-log.json`.
2. **Heuristique regex** (section 1.1-1.3 du ref) appliquée à `titre + description`. Match → tier décidé.
3. **Pas de match** → le Speccer pose le tier lui-même selon l'étiquette ci-dessus.
4. **Logging** : append `.shikamaru/speccer-log.json` avec `{timestamp, input_preview (max 200 char), method, tier, rationale}`. Créer le fichier (array vide) au premier appel. **Doit être dans .gitignore** (peut contenir des previews d'input user sensibles).
**Branchement par tier :**

| Tier | Action |
|------|--------|
| XS | **Mode XS-fast** → saut direct à `[ETAPE 4-XS/6]` (skip 5 ; 4.5 seulement si le brief est ambigu, jouée sur la task avant l'écriture des artefacts) |
| S | **Mode S-mini** → saut direct à `[ETAPE 4-S/6]` (skip 5 full — QG light inline ; 4.5 seulement si le brief est ambigu, comme en XS) |
| M | Flow M complet : génération des étapes du plan, **étape 4.5** (si son déclencheur est rempli), 5, 6 |
### Génération des tasks (suite étape 4b — M uniquement)
**Skip cette section si `tier=XS`** → aller direct à `[ETAPE 4-XS/6]`.
**Skip cette section si `tier=S`** → aller direct à `[ETAPE 4-S/6]`.
Puis (scope confirmé + tier = M décidé) : genere des étapes de plan : un incrément vérifiable chacune, portées par une seule branche d'objectif, applique schema strict, detecte type auto (setup/core/integration/cleanup), remplit TOUS champs obligatoires (si info manquante → DEMANDE), auto-detecte anti-patterns.
**Regroupement d'un lot** : déjà fait AVANT la pré-classification (voir « Lot issu d'une source unique » ci-dessus) — ici, chaque task regroupée est spécifiée comme une task M ordinaire.
📄 **Charger (M only) :** `references/task-schema.md` (matrice tier x type — pour valider champs obligatoires). NE PAS charger en mode XS ou S.
## [ETAPE 4-XS/6] Mode XS fast path
Déclenché UNIQUEMENT quand l'étape 0bis a classé `tier=XS`. Skip l'étape 5 (Quality Gate) ; l'étape 4.5 ne joue que sur brief ambigu. Cible : <2 min de bout en bout vs ~5-10 min en mode M.
📄 **Ne PAS charger :** `task-schema.md`, `tier-templates.md` section M. Optionnellement charger `tier-templates.md` section "XS-fast" pour rappel des 3 champs.
**Commande `escalade` disponible à tout moment** : permet de remonter vers M en préservant les champs déjà collectés. Voir section [Escape hatch — escalade tier](#escape-hatch--escalade-tier-référencé-depuis-flows-xs-et-s) en bas du flow.
**Flow strict :**
1. **Restitution scope 1-liner** : *"Tu veux : {description verbatim}. C'est ça ? (o/n/préciser)"*
   - `n` → demander reformulation, re-router via étape 0bis
   - `préciser` → boucle de clarification (max 2 tours)
   - `o` → continuer
1bis. **Gate quête** → voir [Gate quête](#gate-quête--ça-sert-quelle-quête--souple-référencée-depuis-4b-4-xs-4-s). `QUESTS.md` absent → skip silencieux, aucun coût. Écrire `**Quest:**` dans la task émise.
2. **Collecte 3 champs en séquence courte** (1 question à la fois) :
   - **Goal** : 1 phrase impérative, >20 char, action mesurable. Si "Améliorer X" sans détail → reject inline.
   - **Files** : liste paths exacts repo-relatifs, min 1, max 2. Validation immédiate (voir guards ci-dessous). Si >2 → proposer `escalade` vers S (3-4 fichiers, pas de signal M) OU vers M (signal M détecté), via mécanisme défini en section "Escape hatch".
   - **Done** : ≥1 checkbox binaire. Si non-binaire ("améliorer", "mieux") → reject inline.
3. **Guards sécurité `Files` (BLOCKING)** — appliqués à chaque path saisi :
   - 🚫 Path absolu (commence par `/`) → reject : "Chemins repo-relatifs uniquement"
   - 🚫 `~` ou `$HOME` → reject : idem
   - 🚫 Segment `..` (path traversal) → reject : "Pas de traversée parent"
   - 🚫 Match `**/.env*`, `**/*.pem`, `**/*.key`, `**/id_rsa*`, `**/credentials*` → reject : "Fichier sensible interdit"
   - 🚫 Path hors du repo courant (résolu, vérifié startswith repo root) → reject
   - ✅ Le path doit exister OU être un nouveau fichier au plus 2 niveaux de profondeur dans le repo
4. **Anti-patterns inline** (validation minimale sans QG) :
   - Goal vague → bloquer + redemander
   - Files vide → bloquer + redemander
   - Files = 3 ou 4 paths SANS signal M → proposer `escalade` vers S (cible auto). Refus → on continue, le tier passe à S
   - Files >4 OU signal M (`auth`/`oauth`/`migration`/`secret`/`schema`/`rls`/`rbac`) → proposer `escalade` vers M. Refus → on continue, le tier passe à S
   - Done <1 ou non-binaire → bloquer + redemander
5. **Récap 4 lignes** (sans italique, pas de trailing whitespace) :
   ```
   ✅ Task XS prête :
   - Goal: {goal}
   - Files: {files}
   - Done: {done} | Tier: XS | Durée estimée: 5-15 min
   ```
6. **Écriture artefacts** (skip étape 5 et étape 6 final) :
   - **a) Append TASKS.md** : générer une entrée minimale conforme au template XS-fast (`tier-templates.md`) avec un ID `T{next_free}` auto-assigné (lire max ID existant + 1). `**Statut:** ready`. **`**Tier:** XS` obligatoire** — déclenche l'exception validator (voir `scripts/validate.ts`).
   - **b) Génère `.shikamaru/intents/<runId>.json`** (un fichier par objectif — plusieurs objectifs tournent en parallèle, un worktree chacun) au format schema-valid (`schemas/run-intent.schema.json`). **Tous les champs root requis** :
     ```json
     {
       "schemaVersion": 1,
       "projectId": "<id projet>",
       "runId": "run-YYYY-MM-DD-NNN",
       "createdAt": "<ISO 8601 maintenant>",
       "createdBy": "speccer-xs-fast",
       "tasks": [{
         "taskId": "T<id>",
         "title": "<goal résumé>",
         "reviewLevel": "skip",
         "timeout": "30m",
         "tier": "XS"
       }]
     }
     ```
     **Pas de chargement de task-schema.md**.
   - **c) Append `.shikamaru/speccer-log.json`** : `{timestamp, mode: "XS-fast", duration_collected_seconds, taskId, tier: "XS"}`.
7. **Affiche** : *"✅ Task XS spec en {durée mesurée} — prête pour `/shika-run` (pilote : `run-chain.py --intent <runId>`)"*
**Anti-overspec guard XS :** AUCUN appel à `task-schema.md` ou `tier-templates.md` section M en mode XS. AUCUN champ Prompt, TDD, EdgeCases, Boundaries, Fallback demandé. Max 6 questions au user (5 + gate quête, qui ne coûte rien si `QUESTS.md` est absent).
**Fallback :** Si collecte échoue (user abandonne OU input invalide >3 fois sur un champ) → sauvegarder `.shikamaru/speccer-state.json` avec `mode=XS-incomplete` → permettre `reviens` pour reprendre. Si guard Files refuse 3 fois → suggérer commande `escalade` (voir section Escape hatch) pour passer en mode S ou M.
## [ETAPE 4-S/6] Mode S mini path
Déclenché UNIQUEMENT quand l'étape 0bis a classé `tier=S`. Skip l'étape 5 full (Quality Gate strict) ; l'étape 4.5 ne joue que sur brief ambigu. Cible : 2-4 min de bout en bout vs ~7-10 min en mode M. QG light inline (Goal mesurable + Done ≥3 binaires uniquement).
📄 **Ne PAS charger :** `task-schema.md`, `tier-templates.md` section M. Optionnellement charger `tier-templates.md` section "S-mini" pour rappel des 5 champs.
**Commande `escalade` disponible à tout moment** : permet de remonter vers M en préservant les 5 champs déjà collectés. Voir section [Escape hatch — escalade tier](#escape-hatch--escalade-tier-référencé-depuis-flows-xs-et-s) en bas du flow.
**Flow strict :**
1. **Restitution scope 1-liner** : *"Tu veux : {description verbatim}. C'est ça ? (o/n/préciser)"*
   - `n` → demander reformulation, re-router via étape 0bis
   - `préciser` → boucle de clarification (max 2 tours)
   - `o` → continuer
1bis. **Gate quête** → voir [Gate quête](#gate-quête--ça-sert-quelle-quête--souple-référencée-depuis-4b-4-xs-4-s). `QUESTS.md` absent → skip silencieux, aucun coût. Écrire `**Quest:**` dans chaque task émise.
2. **Collecte 5 champs en séquence** (1 question à la fois) :
   - **Goal** : 1 phrase impérative, >20 char, action mesurable. Si "Améliorer X" sans détail → reject inline (QG light).
   - **Context** : 1-2 phrases, >30 char, doit mentionner un "pourquoi" (motif/contrainte). Si <30 char ou pas de pourquoi → reject inline.
   - **Files** : liste paths exacts repo-relatifs, min 1. Validation immédiate (guards ci-dessous). Si >3 → trigger escalade T149 (prompt "ça ressemble à M, escalade ? o/n").
   - **Done** : ≥3 checkboxes binaires. Si <3 → reject inline. Si non-binaire ("améliorer", "mieux", "optimiser") → reject inline (QG light).
   - **Boundaries** : ≥1 Always + ≥1 Never (1 ligne chacun). Si user saute → warning soft "recommandé pour S, continuer sans ? (o/n)" — autoriser à continuer.
   - **Boundary « Always: passer par le MCP/outil X » → chiffrer le VOLUME traversant** : si le livrable transite par le contexte du runner (MCP write, paste), estimer sa taille — au-delà de ~20K tokens, autoriser un chemin écrivant sur DISQUE quand les critères Done vérifient déjà l'invariant protégé par la boundary. Le tier mesure la difficulté, pas le volume.
   - **Prémisse qualifiant l'état de review d'une PR** (« jamais reviewée », « aucune review ») : **ALWAYS** la vérifier contre le champ `Review` de TASKS.md / les commentaires de la PR avant de l'écrire dans la spec.
3. **Guards sécurité `Files` (BLOCKING)** : appliquer à chaque path saisi les MÊMES règles que l'étape 3 du mode XS-fast (path absolu, `~`/`$HOME`, `..`, fichiers sensibles, hors-repo → reject ; path existant ou nouveau ≤2 niveaux).
4. **Auto-détection signaux M tardifs** (après collecte Files OU Goal) : signaux, prompt, comportement o/n et max-1-prompt → section "Escape hatch — escalade tier". Un signal backend seul n'est **PAS** un signal M : la preuve live se fait au run (§d.0 de `shika-run.md`), pas par un Smoke écrit à la spec.
5. **Quality Gate light** (validation inline avant écriture, PAS étape 5 full) :
   - ✅ Goal >20 char + mesurable (regex/keyword check : pas "améliorer/mieux/optimiser" seul)
   - ✅ Done ≥3 checkboxes ET chaque item binaire (test = vrai ou faux)
   - 🚫 **SKIP** : anti-patterns table, validation Prompt (pas demandé), validation EdgeCases (pas demandé), validation Fallback (pas demandé)
   - Si invalide sur Goal ou Done → boucle interactive limitée à ces 2 champs (max 3 itérations, sinon `escalade` proposé)
6. **Récap 6 lignes** (sans italique, pas de trailing whitespace) :
   ```
   ✅ Task S prête :
   - Goal: {goal}
   - Context: {context_preview_60char}
   - Files: {files}
   - Done: {N} critères binaires | Tier: S | Durée estimée: 15-30 min
   - Boundaries: {N_always} Always / {N_never} Never
   ```
7. **Écriture artefacts** (skip étape 5 full et étape 6 standard) :
   - **a) Append TASKS.md** : générer une entrée minimale conforme au template S-mini (`tier-templates.md` section S-mini) avec un ID `T{next_free}` auto-assigné (lire max ID existant + 1). `**Statut:** ready`. `**Tier:** S` obligatoire.
   - **b) Génère `.shikamaru/intents/<runId>.json`** : MÊME format schema-valid que l'étape 6b du mode XS-fast, avec `createdBy: "speccer-s-mini"`, `reviewLevel: "standard"` (explicite — S ne suit PAS le reviewLevel du template XS), `timeout: "45m"`, `tier: "S"`. **Pas de chargement de task-schema.md**.
   - **c) Append `.shikamaru/speccer-log.json`** : `{timestamp, mode: "S-mini", duration_collected_seconds, taskId, tier: "S"}`.
8. **Affiche** : *"✅ Task S spec en {durée mesurée} — prête pour `/shika-run` (pilote : `run-chain.py --intent <runId>`)"*
**Anti-overspec guard S :** AUCUN appel à `task-schema.md` ou `tier-templates.md` section M en mode S-mini. AUCUN champ Prompt détaillé, TDD, EdgeCases, Fallback demandé. Max 8 questions au user (5 champs + scope + récap + gate quête, qui ne coûte rien si `QUESTS.md` est absent).
**Fallback :** Si la collecte échoue ou QG light bloque sur >3 itérations → sauvegarder état dans `.shikamaru/speccer-state.json` avec `mode=S-incomplete` → permettre `reviens` ou commande `escalade` vers M (mécanisme formel défini en section "Escape hatch — escalade tier").
## [ETAPE 4.5/6] Critique du plan — un seul échange Codex
**Déclencheur (évaluer AVANT tout chargement)** : plan de **3 tasks ou plus**, OU brief jugé ambigu à la garde de périmètre. Sinon **skip**, sans rien charger. Mode a) Sprint : **skip** (tasks déjà spécifiées) → `[ETAPE 6/6]`.
📄 **Charger :** `references/plan-critique.md` (prompt + contrat de sortie)
1. **Prompt** : remplir le gabarit de `plan-critique.md` (brief + titre, Goal, Files, Done, Depends, Tier de chaque task) → `/tmp/plan-critique-{runId}.prompt`.
2. **Appel** — même chemin que la review du runner (`shika-run.md` §d.2) : `cd /tmp && timeout -k 30 420 codex exec --skip-git-repo-check -o /tmp/plan-critique-{runId}.out - < /tmp/plan-critique-{runId}.prompt > /tmp/plan-critique-{runId}.log 2>&1; echo CODEX_EXIT=$? >> /tmp/plan-critique-{runId}.log`, lancé en arrière-plan, attente par boucle sur le log (`until grep -q '^CODEX_EXIT=' …; do sleep 10; done`). La réponse à lire est le `.out` (dernier message seul), **jamais** le log, qui se termine par `CODEX_EXIT=`. **Un seul échange, jamais de second tour.**
3. **Repli** : Codex indisponible, ou `.out` absent, ou sans une ligne par task et dernière ligne `PLAN_OK|PLAN_REVU` → le dire en une ligne (règle F13), continuer **sans critique**, consigner `{timestamp, mode: "plan-critique", resultat: "repli", raison}` dans `speccer-log.json`.
4. **Application, sans question** : appliquer RETIRER (task supprimée du plan), FUSIONNER→Ty (Goal/Files/Done fusionnés dans Ty), REPORTER (statut `backlog`) et ORDRE avant l'étape 5. L'hypothèse fragile va dans le `Context` de la task concernée, le test décisif dans son `Done`. Ajout proposé par Codex → ignoré. Toutes les tasks RETIRER → ne rien appliquer, afficher la critique, demander à Loïc (seule question de l'étape).
5. **Trace** : bloc « Critique Codex » au récapitulatif de l'étape 6 — une ligne par changement avec sa raison, ajouts ignorés compris. Loïc rétablit une task en un mot (« garde Tx »). Consigner `{timestamp, mode: "plan-critique", resultat: "PLAN_OK|PLAN_REVU", retirees, fusionnees, reportees}` dans `speccer-log.json`.
## [ETAPE 5/6] Quality Gate strict
📄 **Charger :** `references/task-schema.md` (si pas deja charge a l'etape 4b)
### 5.1 Detection type
Depuis titre/goal : setup/install/config/deploy → **setup** | archive/remove/delete → **cleanup** | API/webhook/MCP/HTTP/SMTP → **integration** | feature/logique/algo/validation → **core** | ambigu → demander.
### 5.1bis Smoke facultatif
**Le champ `**Smoke:**` n'est plus imposé à la spec, même sur signal backend.** La preuve en conditions réelles se fait au run, où le livrable existe (§d.0 de `shika-run.md`) : pas de stub généré, pas de blocage, pas d'escalade de tier. Mesure du 2026-09-26 : ~45 % des FAIL Smoke venaient de l'assert écrit à la spec (→ speccer-learnings.md).
Un Smoke **écrit volontairement** reste accepté et joué par le runner en d.1bis. Les règles ci-dessous ne s'appliquent **qu'à un Smoke écrit** :
- Format : `start_cmd` optionnel + **≥1 commande d'assertion exécutable** (curl / exit-code / grep / status HTTP) rattachée au Done. Sans commande OU sans assertion = invalide. Pure logique CLI → invocation CLI + assert exit-code/stdout.
- **Asserts = invariants structurels** (code HTTP, présence de champ, `count > 0`, schéma), PAS des littéraux de données vivantes. Littéral acceptable uniquement sur fixture contrôlée (taguée `smoke*`, cf. task-schema.md).
- **Matcher la STRUCTURE, pas la mise en forme** : sur une sortie CLI, `grep -qE 'Pass Rate +100%'` (quantificateur sur les espaces), JAMAIS un alignement figé.
- **Chemin récurrent (cron/service/webhook)** : l'assert doit exercer l'identité + la machine du chemin réel, pas un équivalent manuel — cf. « Règle chemin récurrent » de task-schema.md.
**Asserts EXÉCUTABLES — 5 pièges (→ speccer-learnings.md) :**
- **1 puce = 1 assertion.** **NEVER** chaîner avec `ET`, empiler plusieurs paires de backticks, ou mettre de la prose/flèche dans les backticks (smoke.ts extrait le span et concatène).
- **`start_cmd` : pas de placeholder « n/a »** — si rien n'est à démarrer, **omettre la puce** (sinon exécutée comme assertion → échec).
- **Vérifier que l'assert est cohérent avec sa propre section `Files`** et que les colonnes/champs référencés EXISTENT. Croiser avec 5.1ter quand la task touche la DB.
- **Dépôt sous gate §0.6 (clone client)** : **NEVER** `git diff --quiet` (échoue par construction). Le bon assert vérifie : N fichiers attendus modifiés, rien de stagé, rien de commité en avance sur `origin`.
- **Sélecteurs de build (dbt & assimilés)** : si `Files` liste des modèles, l'assert sélectionne **CES modèles nommément** (ou `+modele+`), **JAMAIS** le seul descendant `modele+`.
**ALWAYS JOUER L'ASSERT UNE FOIS — dans l'état où il est censé passer — AVANT de l'écrire dans la spec.** Un assert non joué n'est pas un assert, c'est une intention. **NEVER** livrer un `**Smoke:**` bloquant qu'on n'a pas vu rendre le verdict attendu au moins une fois.
- Si l'assert ne PEUT pas être joué à la spec (service non démarré, credentials absents, données pas encore là) → **le dire explicitement dans la task** et le marquer comme non vérifié. Un assert invérifiable annoncé est exploitable ; un assert faux qui se présente comme vérifié ne l'est pas.
- Jouer aussi le **cas où l'assert doit ÉCHOUER** quand il porte sur une absence ou un seuil — un assert qui ne peut pas rougir ne mesure rien.
- **Why** : cette seule règle ferme 6 modes d'échec distincts, tous mesurés en production entre le 14/08 et le 01/09, et tous invisibles à la relecture — l'interpréteur (`python3` nu là où le module a un venv), l'assert en NÉGATION qui rend vert quand la mesure n'a pas eu lieu (fichier absent → sortie vide → rien à ne pas trouver), les doubles paires de backticks (`SMOKE_PARSE_AMBIGUOUS`, commande jamais exécutée), le SQL passé en ARGUMENT (`bq query "$(cat f.sql)"` meurt sur un fichier commençant par `--`, jamais lu), le secret non chargé (on mesure l'absence de credentials, pas le code), et les accents en locale C. Les énumérer un par un ne tient pas : le 7ᵉ mode passera. Les jouer les attrape tous.

**Livrable = un chiffre ou une phrase causale** : un assert ne suffit pas — la task doit porter dans son `Prompt` l'exigence des 3 gestes analytiques du §2b de `shika-run.md` (énumérer les causes concurrentes ; traiter « 0 écart mesuré » comme une présomption ; inspecter la distribution réelle dès qu'un SEUIL est posé). Et tout critère de Done chiffré doit **nommer son grain** — cf. « Règle du GRAIN » de `task-schema.md`, refus bloquant en 5.3.
### 5.1quinquies Detection front (→ champ `**Design:**`, ZÉRO question)
**Champ déduit à partir des `Files` front.** Même regex que le hook QA d.2 du Runner, pour garantir Speccer et Runner strictement alignés : `Files` matchant `\.(tsx|jsx|vue|svelte|html|css|scss)$`.
**Coût : ZÉRO question au user.** Le champ est DÉDUIT, jamais demandé — les plafonds de questions XS (6) et S (8) restent inchangés. **NEVER** ouvrir une question de direction visuelle ici : le plancher refuse des réflexes, il ne choisit pas une esthétique.
**Décision :**

| Situation | Champ `**Design:**` émis |
|-----------|--------------------------|
| ≥1 fichier front ET le projet expose une charte (fichier de tokens, `DESIGN.md`, variables CSS nommées) | `monde existant — <fichier>` + `plancher : references/design-floor.md` |
| ≥1 fichier front ET aucune charte trouvée | `direction à décider par la task` + `plancher : references/design-floor.md` |
| Files mixtes (≥1 backend + front) | `**Design:**` émis ; un `**Smoke:**` écrit (facultatif, 5.1bis) coexiste avec lui. L'un ne remplace jamais l'autre |
| AUCUN fichier front | 🚫 champ NON émis — pas de stub, pas de bruit (même règle qu'en 5.1bis) |

**Le champ POINTE, il ne recopie pas.** `design-floor.md` fait 75 lignes et vient d'un dépôt amont ; les inliner dans chaque task les ferait diverger dès la première mise à jour. **NEVER** recopier le plancher dans une task.
**Why** : mesuré le 2026-09-10 — même brief fonctionnel, même modèle, deux agents indépendants. Sans le plancher : 50 findings au détecteur, dont ~30 contrastes sous AA sur une seule couleur réutilisée 26 fois, plus un surtitre au-dessus du titre et un bandeau de chiffres héros (les deux refus les plus explicites du plancher). Avec : 5 findings, pour 10 % de tokens en MOINS. L'écart se joue à la GÉNÉRATION — aucun gate en aval ne fabrique une direction visuelle qui n'a pas été demandée.
### 5.1ter Vérification schéma DB (obligatoire si la task touche la DB)
Si la task référence des tables/colonnes (select, filtre, migration, RLS) dans `Files`, `Prompt` ou `Context` :
- **ALWAYS** vérifier chaque table/colonne citée contre la **source de vérité du schéma** du projet (ex: `src/types/supabase.ts`, `schema.prisma`, migrations) AVANT d'écrire la spec. Colonne introuvable → corriger la spec, jamais « on verra au run ».
- **ALWAYS** exiger pour ces tasks **≥1 test d'intégration non-mocké** OU un **Smoke live** (5.1bis) — des tests 100 % mockés n'exécutent jamais le select réel.
### 5.1quater Task de RATTRAPAGE (backfill, rejeu, ré-ingestion) — la lecture d'abord, l'action ensuite
Déclencheurs : `Goal`/`Prompt`/`Context` contiennent `backfill`, `rattrapage`, `rejouer`, `re-ingérer`, `combler`, `trou de données`, `réparer l'historique`, ou toute commande qui recrée des données passées (`bq mk --transfer_run`, `dbt run --full-refresh`, replay de queue, ré-import).

- **ALWAYS ouvrir la task par une MESURE EN LECTURE SEULE de ce que le magasin contient DÉJÀ**, prise sur ses **propres métadonnées** (métadonnées de partitions + horodatage d'écriture, offsets, checksums), pas sur un comptage de lignes. Cette lecture est la **première** étape du `Prompt`, avant toute commande mutante.
- **ALWAYS écrire dans la task que le résultat de cette lecture peut ANNULER le geste** : « 0 élément manquant après lecture ⇒ la task est terminée, NE PAS agir, livrer le constat ». Une task de rattrapage doit pouvoir se conclure sans rien muter — sinon elle force une mutation pour justifier son existence.
- **NEVER bâtir le témoin de « ce qui manque » sur une table SECONDAIRE** (table de dimension, journal, historique de runs, log d'exécution) **sans avoir prouvé que le geste mutant l'écrit**. Un témoin que l'action ne renseigne pas ne peut jamais virer au vert : il classe « manquant » ce qui est déjà là, indéfiniment.
  - Corollaire : **un comptage de lignes ne distingue pas « vide » de « jamais chargé »** — 0 ligne ne produit aucun groupe. Cette distinction est le cœur de toute task de rattrapage, elle exige un témoin de PRÉSENCE (la partition/l'objet existe-t-il ?), pas de VOLUME.
- **NEVER écrire dans la spec qu'un geste est « additif », « non destructif » ou « n'écrase aucune valeur »** sans l'avoir établi sur la documentation ou une mesure. Beaucoup de rattrapages **réécrivent** la cible (un backfill DTS réécrit la partition entière) : sur une cible déjà peuplée dont la source ne rend rien, le geste **vide** au lieu de compléter. Faute de preuve, écrire la sémantique comme **inconnue** et l'inscrire dans `Boundaries`.
- **Si un `Smoke` est écrit, ALWAYS il s'appuie sur le MÊME témoin que la mesure** de l'étape 1. Un assert bâti sur un autre témoin peut être insatisfiable par construction, indépendamment de la donnée — le runner le trouvera rouge sans pouvoir le corriger.
- **ALWAYS avertir dans `Edge cases` que l'action ÉCRASE ses propres traces** : rejouer un geste sur une cible déjà traitée détruit l'horodatage qui prouvait qu'elle l'avait été. La preuve se relève **avant** d'agir, jamais après.

### 5.2 Checklist champs (tier x type)
- **XS** : Goal, Context, Files, Done (1+), Rollback, Duree
- **S** : + Prompt, Done (3+), Boundaries
- **M** : + full matrice selon type. M+core/integration imposent TDD, Edge cases (3+), Boundaries, Fallback obligatoires. M+setup/cleanup les ont en recommandes.
### 5.3 Validation qualitative

| Check | Regle de rejet |
|-------|----------------|
| Goal | < 20 char OU "Ameliorer" sans detail OU non-mesurable |
| Context | < 30 char OU pas de "pourquoi" **OU livrable d'analyse (chiffre, carte, typologie, segmentation) dont le Context ne nomme pas la décision que le résultat peut changer** — à défaut de décision nommée, la task porte `**Exploratoire:** oui` (seul champ ajouté ; le runner note alors ses P1 dans la PR, sans task de correction) |
| Files | "tout le projet" / pas de chemin |
| Prompt | < 100 char OU pas de verbe d'action |
| Done | < 3 checkboxes OU non-binaire **OU un critère chiffré sans GRAIN nommé** (cf. « Règle du GRAIN », task-schema.md) **OU un critère qui recopie un chiffre du cadrage ou d'une mesure du Speccer** (« la base compte 2 367 foyers ») — il ne peut pas rougir ; le remplacer par une propriété vérifiable : unicité de la clé, nombre maximal de lignes par clé, liste des non-appariés |
| **Consommation d'un exploratoire** | Une task dont le livrable sert une décision et qui consomme un livrable `**Exploratoire:** oui` ne prévoit pas d'abord la correction de ce livrable (task préalable ou critère Done dédié) → ⛔ **BLOCAGE** |
| Edge cases | < 3 lignes OU generiques |
| Boundaries | Pas d'Always NI de Never |
| Fallback | Pas de "si"/"quand" + action |
| **Smoke — parsabilité** | Une puce contenant `ET`, plusieurs paires de backticks, ou `start_cmd : n/a` → ⛔ **BLOCAGE** (1 puce = 1 assertion, cf. 5.1bis) |
| **Rattrapage** (si déclencheur 5.1quater) | Le `Prompt` n'ouvre PAS sur une mesure en **lecture seule** des métadonnées du magasin, **OU** le témoin de « ce qui manque » repose sur une table que le geste mutant n'écrit pas, **OU** un comptage de lignes sert de témoin (il ne distingue pas « vide » de « jamais chargé »), **OU** le geste est déclaré « additif / n'écrase rien » sans preuve → ⛔ **BLOCAGE** |
> ⚠️ **Smoke absent ≠ défaut.** Aucune ligne de 5.3 ne bloque une task parce qu'elle n'a pas de Smoke : la preuve live se fait au run (§d.0 de `shika-run.md`). Un Smoke écrit reste disjoint du Recettage (Smoke = backend shell/HTTP, Recettage = front Playwright, cf. « Disjonction Smoke ⟂ Recettage » de `task-schema.md`).
### 5.4 Task incomplete → boucle interactive
Pour chaque champ manquant, poser UNE question a la fois. Loop jusqu'a tous champs OK. Ne valide pas la task tant qu'un champ obligatoire manque.
### 5.5-5.6 Anti-patterns a refuser
Rejeter meme si champs remplis : task de tests separee, done non-binaires, Files="tout le projet", Prompt="Tu sais quoi faire", edge cases generiques, duree indeterminee, tier escalation pour justifier overspec (S reste S, re-classer M si besoin).
## [ETAPE 6/6] Preparation du run
### Gate final
AVANT l'intent : toutes tasks passees Quality Gate. Si incomplet → bloquer, proposer : revenir etape 5 / retirer tasks / pause.
**Header + runId (checks mécaniques, tous modes XS/S/M)** :
- **ALWAYS** injecter `project:` dans le frontmatter de TASKS.md s'il manque (gate 0.1 du runner bloquant sans lui).
- **ALWAYS** vérifier l'unicité du `runId` avant attribution : grep les runId existants (TASKS.md + `.shikamaru/*.json` + archives). Collision (ex: 2 sessions speccer parallèles) → suffixer (`run-YYYY-MM-DD-NNN` avec NNN = max+1 réel, pas supposé).
- **Dialecte Markdown** : header `### T{id}: {titre}` (**colon**, pas d'em-dash), champs en bold `**Champ:**`, prompt sous `**Prompt:**` (pas `**Prompt Claude Code:**`) — voir « Dialecte Markdown canonique » de `schemas/tasks-schema.md`. NEVER `## T{id}`, ni champs en headings, ni `### T{id} — {titre}` en écriture (em-dash toléré en LECTURE seulement ; les validators exigent le colon).
### Si tout OK
**Un intent = un objectif livrable** (une branche, une PR — `shika-run.md` §1.4) : deux objectifs indépendants = deux intents, jamais un seul. Affiche tasks incluses (tier, type, duree), duree totale, le bloc « Critique Codex » si l'étape 4.5 a tourné, genere `.shikamaru/intents/<runId>.json` (inclut champ `tier` par task) et propose le pilote : `python3 ~/Projects/shikamaru/scripts/run-chain.py --project <racine> --intent <runId>` — il crée le worktree de l'objectif ; le Speccer, lui, n'en utilise jamais. **Premier résultat seul en `ready`** : pour une étude, seule la première synthèse lisible ; pour une application, le premier parcours complet. Les approfondissements (typologie, carte, variantes) restent en `backlog` — statut existant de `schemas/tasks-schema.md`, **NEVER** un statut créé — et ne passent `ready` qu'après observation de ce premier résultat (pourquoi : `speccer-learnings.md` §6 premier résultat). **`reviewLevel` toujours écrit explicitement, par tier** : `"skip"` (XS), `"standard"` (S), **`"opus"` (M)** — **NEVER** omettre le champ (le runner retombe sur `opus` pour une M et `standard` pour XS/S — l'écrire rend l'intent lisible sans connaître ce défaut). Propose : 1) /shika-run, 2) attendre cron, 3) /shika-speccer ajouter, 4) pause. **Intent d'au moins 2 tasks** → l'option 1 devient « lancer la chaîne » : `python3 ~/Projects/shikamaru/scripts/run-chain.py --project "$(git rev-parse --show-toplevel)" --intent <runId>`, en arrière-plan du harness, fin annoncée sans attendre la question (même geste que `shika-run.md` §1.3).

---
## Gate quête — « ça sert quelle quête ? » (SOUPLE, référencée depuis 4b, 4-XS, 4-S)
Posée **UNE fois par feature**, juste après la confirmation de scope, avant tout découpage. Gate **souple** : elle informe, elle ne bloque JAMAIS un spec.

| État du repo | Comportement |
|--------------|-------------|
| `QUESTS.md` **absent** à la racine | **skip SILENCIEUX** — ni question, ni warning, ni champ écrit |
| présent mais **invalide** (erreur `scripts/lib/quests-parser.ts`) | skip + **warning 1 ligne**, le spec CONTINUE |
| présent et valide | lister les quêtes **vivantes** + option « aucune → hygiène », **reco en 1ère position suffixée `(Recommended)`** |
| valide mais **0 quête vivante** (tout en pause/gelée) | question posée avec la seule option `hygiène` + suggestion de réveil au prochain rituel |

Écrire `**Quest:** {Qn|hygiène}` dans **chaque task émise**. Aucune quête vivante ne matche la feature → **warning 1 ligne** (« cette feature ne sert aucune quête vivante — elle passe en hygiène, plafonnée à 1 task par run ») et le spec **CONTINUE**.

🚫 **Never** : bloquer un spec sur cette gate · reposer la question par task (1 fois par feature) · re-questionner en **mode a) Sprint** — les tasks déjà spec-ées portent leur `Quest` d'origine.

La contrepartie DURE vit côté runner (`shika-run.md` §1.1, plafond 1 task hygiène par run).

## Escape hatch — escalade tier (référencé depuis flows XS et S)
Mécanisme commun applicable aux modes XS-fast et S-mini : permet de remonter tier en cours de spec quand le scope se révèle plus large que prévu. Garantit qu'aucune task ne sort en mode sous-dimensionné par erreur de classif amont.
**Cibles autorisées :**
- XS → S (Files entre 3 et 4 paths, AUCUN signal M détecté)
- XS → M (Files >4 OU signal M détecté)
- S → M (Files >3 OU signal M détecté)
- M → escalade interdite (voir "Récursion bloquée" plus bas)
Le seuil est strict : 3-4 files XS → S ; **>4 files XS → toujours M** (même sans signal M), pour éviter d'émettre des tasks S sur-dimensionnées via le path XS.
**Tier cible auto-déterminé** par défaut. Si ambigu → demander au user explicitement : "Escalade vers S (rapide, QG light) ou M (full Quality Gate) ?".
**Commande user `escalade`.** Si le user tape `escalade` à n'importe quel moment d'un flow XS ou S :
1. Sauver les champs déjà collectés dans une struct temp `{tier_origin, fields_collected, timestamp}`
2. Déterminer le tier cible (selon cibles autorisées ci-dessus + signaux courants)
3. Recharger `tier-templates.md` section correspondante (S-mini ou M-core selon cible)
4. Reprendre le flow cible en pré-remplissant les champs déjà collectés (Goal, Context si présent, Files, Done, Boundaries si présents)
5. Continuer collecte des champs manquants pour le tier cible (S : Context/Boundaries ; M : Prompt, TDD, Edge cases ≥3, Fallback)
6. Append `.shikamaru/speccer-log.json` : `{timestamp, mode: "escalade-manual", tier_from: "<XS|S>", tier_to: "<S|M>"}`
**Cas particulier** : si `escalade` tapé AVANT d'avoir saisi le moindre champ → reprendre directement en mode cible flow normal (pas de pré-remplissage à faire).
**Auto-détection signaux M tardifs.** Hook exécuté APRÈS chaque champ critique (Files en mode XS, Boundaries en mode S, OU Goal dans les deux modes). Déclenche un prompt UNIQUE par run :
**Signaux déclencheurs (tier cible = M) :**
- `Files` contient >4 paths (XS) ou >3 paths (S) avec un signal M associé
- `Goal` ou `Files` mentionne mot-clé sensible : `auth`, `oauth`, `migration`, `secret`, `schema`, `rls`, `rbac`
**Signal déclencheur (tier cible = S, mode XS uniquement) :**
- `Files` contient 3 ou 4 paths sans signal M détecté
**Prompt user** : *"Cette task touche {N} fichiers / mot-clé `{keyword}` → escalade vers {S|M} suggérée. Confirmer ? (o/n)"*

| Réponse | Action |
|---------|--------|
| `o` | Déclencher escape hatch vers tier cible (mécanisme `escalade`). Log mode `escalade-auto` |
| `n` | **Mode XS** : au-delà de 2 fichiers, on continue et le tier passe à S — aucune scission forcée. **Mode S** : continuer flow courant, append warning `{mode: "auto-escalade-refused", target_tier, signal, taskId}` |
**Anti-friction** : max 1 prompt d'auto-détection par run. Une fois déclenché (o ou n), pas de re-prompt même si autre signal apparaît plus tard.
**Récursion bloquée.** Si `escalade` tapé pendant un flow déjà en mode M (l'escape hatch a déjà escaladé une fois) → bloquer : *"Déjà en mode M, escalade impossible."*
Idem si `escalade` depuis un flow en mode S vers S → no-op, message *"Déjà en mode S."*.

---

<!-- PREFIX END — tout ce qui est au-dessus est stable entre sessions (KV cache Anthropic) -->
## Boucle de retour
Apres /shika-run termine, propose : 1) /shika-speccer planifier la suite, 2) /shika-review, 3) rien.
## Fichiers utilises

| Fichier | Charge a | Role |
|---------|----------|------|
| `references/tier-classifier-fast.md` | Etape 0bis | Pre-classification par regex (sinon le Speccer pose le tier) |
| `references/task-schema.md` | Etape 4b, 5, 5.1bis | Schema strict tasks (matrice tier x type) + liste autoritative "Signaux backend" (lue par le runner) |
| `references/tier-templates.md` | Etape 4-XS, 4-S, 5 | Templates XS-fast, S-mini, XS, S, M (anti-patterns) |
| `references/plan-critique.md` | Etape 4.5 (si déclenchée) | Prompt Codex + contrat de sortie de la critique du plan |
| `.shikamaru/speccer-state.json` | — | Etat de pause (mode XS/S incomplete inclus) |
| `.shikamaru/speccer-log.json` | Etape 0bis, 4-XS, 4-S | Log append-only des classifications + mode utilisé |
| `.shikamaru/intents/<runId>.json` | Etape 4-XS, 4-S, 6 | Config prochain run (inclut `tier` par task) |
| `.runner-state.json` | Etape 1 | Resultats dernier run |
| `TASKS.md` | Etape 0 | Source des tasks |
| `DECISIONS.md` | Etape 0 | Decisions prises |