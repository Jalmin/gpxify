---
name: shika-run
description: "Runner Shikamaru — execute les tasks ready de TASKS.md en mode autonome. UTILISER QUAND: lancer l'execution, executer les tasks, run nocturne, ou mots-cles 'run', 'runner', 'execute', 'lance les tasks', 'go'."
---

# /shika-run — execute les tasks ready avec branches git + review automatique
*Les justifications (Why) des règles vivent dans `~/Projects/shikamaru/.claude/commands/references/runner-learnings.md` (repo source) — maintenance uniquement, ne PAS lire pendant un run.*
**Mode nocturne** : `--night` ne fonctionne PAS dans VSCode (`--dangerously-skip-permissions` doit etre passe au lancement). Depuis un terminal/cron : `cd ~/Projects/MonProjet && claude --dangerously-skip-permissions -p "/shika-run --night"`.
**Pre-requis** : une intent `.shikamaru/intents/<runId>.json` (écrite par `/shika-speccer` ; l'ancien `.shikamaru/run-intent.json` reste lu s'il est seul) · tasks `ready` avec `**Files:**` · artefacts valides. En `--chain`, le pilote passe `--intent <chemin>` : c'est l'intent du run.

## Workflow
**0.0 Préflight session** — **ALWAYS** vérifier le poids de la session AVANT de démarrer : contexte > **~300K tokens** → STOP, proposer une session fraîche (run-intent + TASKS.md rendent le run reprennable sans historique).
**0. Auto-resume** — Lis `.runner-state.json`. Si `status` != `completed` ET `updatedAt` < 24h → afficher run interrompu, demander "Reprendre ? (o/n)". Oui → tasks `in_progress` remises `ready`, continuer. Non → nouveau run. Absent/completed → continuer. **En `--chain`, la reprise est AUTOMATIQUE** (équivaut à « o »), journalisée, **jamais posée** : le pilote relance pour reprendre.
**0.0bis `git fetch` AVANT les gates 0.1 et 0.2** — **ALWAYS** `git fetch origin` (lecture seule, sans rebase ni pull) avant de lire TASKS.md, et faire porter les deux gates sur `origin/[baseBranch]:TASKS.md`.

**0.1 Gate Validation (bloquant)** — `npx tsx scripts/validate.ts --all` — échec → STOP.
   ⚠️ **Modular monolith** : `--all` valide TOUS les `TASKS.md` ; le bloquant porte sur le **module de la task**, le reste sort en warning dans le résumé — **NEVER** corriger le fichier d'un tiers.
**0.2 Gate WIP (frein needs_review, bloquant)** — instantané pris **UNE fois, au démarrage** ; **NEVER** recompter en cours de run : `npx tsx ~/Projects/shikamaru/scripts/run-gates.ts wip --project "$(git rev-parse --show-toplevel)" --ref origin/[baseBranch] --intent <runId> [--chain]`. Le `--ref` donne le dernier mot à la file distante (§0.0bis). Il compte `needs_review` + `needs_user_validation` ; en `--chain`, il exclut les tasks des intents actifs du registre, celui en cours compris. Verdict `bloque` (exit 2), file dans `details.file` :
- **Interactif** : afficher la file (task, PR, âge) puis demander « Cette file attend une action user — ce run la traite-t-il ? o = continuer, n = STOP ». **NEVER** empiler de nouvelles PRs par-dessus une file non traitée sans ce go.
- **Nocturne (`--night`)** : STOP net + notification telegram avec la file.
- **Chaîne (`--chain`)** : STOP, mais **AVANT de rendre la main** écrire `<dépôt principal>/.shikamaru/chain-wait-<runId>.json` = `{"runId", "baseBranch", "file": [taskIds], "ecritLe": ISO 8601}`, une ligne dans le journal §2, et la notification telegram « la chaîne attend ta validation : {file} — reprise automatique dès que la file est vide (vérif. 15 min, 12 h max) ». Le pilote relance seul quand la file est vide.
- `avertit` (registre illisible : aucune exclusion) → le run passe, l'avertissement va au résumé §4. Override explicite : `--force-wip` (tracé dans le summary).

### 0.5 Sync initial
- **Base du run** : lire `baseBranch` depuis `.runner-state.json` (ou l'intent), défaut `main`. **ALWAYS** utiliser cette base partout (sync, review `--base`, retour final), **NEVER** supposer `main` en dur.
- `git fetch origin` — le worktree part d'`origin/[baseBranch]` (`shika-wt create`) ; reprise : `git merge origin/[baseBranch]` dans la branche d'objectif, conflit → STOP.

#### 0.5bis — LE WORKTREE : la session y travaille et n'en sort jamais

Décision du 04/10 : un objectif = un worktree, voir runner-learnings. En `--chain`, la cwd est le worktree créé par le pilote (`shika-wt create`) : **NEVER** `cd` vers le dépôt principal pour un geste git, **NEVER** `git checkout` d'une autre branche que celle du worktree, sauf le `--detach` de §3.1. Les fichiers partagés — `.shikamaru/chain-journal.md`, `.shikamaru/reflection-pending.md`, `memory/learnings.jsonl`, `.shikamaru/handoff.md`, `chain-wait-<runId>.json` — s'écrivent dans le **dépôt principal** (`MAIN="$(git rev-parse --path-format=absolute --git-common-dir)/.."`), **en ajout** ; seuls `handoff.md` et le marqueur `chain-wait-<runId>.json` (un document JSON unique) s'écrasent. `.runner-state.json` reste dans le worktree (c'est là que le pilote le lit). **NEVER** toucher au travail non commité du dépôt principal : ni `stash`, ni `reset`, ni `checkout --`, ni `add -A`.


| # | Situation | Geste imposé |
|---|-----------|--------------|
| 1 | **Avant tout geste git** (add, commit, checkout, branch) | Revenir explicitement à la **racine du dépôt** (`cd "$(git rev-parse --show-toplevel)"`). **5+ occurrences** : le `cd` d'un gate lancé depuis un module fait échouer le `git add` suivant en `fatal: pathspec did not match any files` — le commit n'a **PAS** lieu, et la chaîne `&&` avale silencieusement la suite. |
| 4 | **Tout diff MESURÉ pour décider ou pour rapporter** (§e.0, §4) | **ALWAYS `origin/[baseBranch]`, JAMAIS la ref locale.** **6ᵉ occurrence** : dans un dépôt à 5 worktrees, `main` local était resté 4 commits en arrière — le shortstat annonçait **35 fichiers / 4 015 insertions** pour un diff réel de **4 fichiers / +670-28**. Une ref locale périmée ferme la voie courte à tort et fausse le résumé. |
| 5 | **Avant la review** | Passer par `review.ts` (§d.1) : il produit le diff par `git diff TASK_BASE..HEAD` (commits seulement) et lance codex depuis `/tmp`. **NEVER** un diff de review produit depuis l'arbre de travail (6 occurrences de périmètre contaminé) ; lire les chemins cités avant de croire un `NEEDS_WORK`. |
| 6 | **Lancer la suite de tests** | Exclure les dossiers de travail des agents : `--exclude '.claude/**'` (ou l'équivalent du runner du projet). 1 occurrence, 20 tests rouges pour rien — `vitest` depuis la racine ramassait `.claude/worktrees/**`. |
| 8 | **Guard qui commite sur la base** | **ALWAYS commiter ET pousser dans le MÊME geste.** Sans le push, un `git merge origin/[base]` dans une branche amont n'embarque pas le commit, et le rebase de la task chaînée le **duplique** dans le diff de review — 908 → 5 515 insertions mesurées. |

**0.6 Remote gate (client)** — **NEVER** push / créer MR-PR sur un remote hors Carapace Bleue sans **go explicite du user dans la session courante** — le go vaut pour **1 push**, pas pour le run.

### 1. Lecture run-intent
`npx tsx ~/Projects/shikamaru/scripts/run-gates.ts intent --project "$(git rev-parse --show-toplevel)" --intent <chemin|runId> --ref origin/[baseBranch]` — schéma, intents latéraux, présence des taskId avant leur statut, intent périmé, collision de runId. Sans `--intent` : le runId de `.runner-state.json`, sinon l'ancien `.shikamaru/run-intent.json` (avertit).

| Verdict | Geste |
|---------|-------|
| `ok` | continuer |
| `avertit` | continuer, raisons au résumé §4 (ancien intent, intent latéral non validé) |
| `bloque` | STOP + raisons. Latéral seul → proposer le plus récent (`details.lateraux[0]`) ; intent absent → « Lance /shika-speccer d'abord » ; schéma refusé sur un intent qui a déjà tourné → suspecter le SCHÉMA avant l'intent ; collision → demander au user quel run est le sien |

**1.1 Plafond hygiène (bloquant)** — un run embarque **1 task hygiène en passager, jamais 2** : `run-gates.ts hygiene` (mêmes arguments). Champ `**Quest:**` absent ⇒ **JAMAIS** comptée.

| Verdict | Interactif | Nocturne (`--night`) / chaîne (`--chain`) |
|---------|-----------|---------------------|
| `bloque` (≥ 2) | afficher la liste (task, titre) + demander **lesquelles retirer du run** | **STOP net** + notification telegram avec la liste |
| `ok` / `avertit` | le run passe ; `avertit` = gate désactivée (TASKS.md illisible), warning au résumé §4 : un champ annexe cassé ne bloque JAMAIS un run | idem |

**1.3 Lancement en chaîne (sans numéro de task)** — le geste par défaut sur une liste. Ne vaut qu'en session interactive (ni `--chain` ni `--night`) et hors `--dry` (qui affiche le plan, sans pilote ni task), une fois §0.1, §0.2 et §1 passés.

| Invocation | Tasks non traitées de l'intent | Geste |
|------------|--------------------------------|-------|
| `/shika-run T226` (numéro) | — | cette seule task, dans la session (§2), les autres de l'intent ignorées |
| `/shika-run` | **1** | comme avant : la task dans la session, **pas** de pilote |
| `/shika-run` | **≥ 2** | lancer le pilote, n'exécuter **aucune** task soi-même |

« Non traitée » = ni `done`, `needs_review`, `needs_user_validation`, `blocked`, `timeout`, `abandoned` ni `superseded` (même lecture que la procédure de reprise §f.1).
- **Commande** : `python3 ~/Projects/shikamaru/scripts/run-chain.py --project "$(git rev-parse --show-toplevel)" --intent <runId>` — un seul pilote, appelé par son chemin, **NEVER** copié dans un projet. Le pilote balaie, crée le worktree de l'objectif et y lance chaque session ; plusieurs objectifs = plusieurs pilotes, en parallèle (plafond : 3 dossiers).
- **Lancement** : mode arrière-plan du harness (`run_in_background`), **jamais `nohup`** ni `&`. Annoncer en une ligne qu'il tourne (projet, nombre de tasks, journal `.shikamaru/chain-journal.md`), puis **annoncer la fin dès la notification** — code de sortie du pilote (0 consommé · 2 illisible · 3 sans progrès · 4 plafond · 5 attente de file expirée) + dernières lignes de `.shikamaru/chain-<runId>.log` — sans attendre la question.
- **Gate WIP §0.2 qui refuse** : le dire en une ligne (la file), **ne pas** lancer le pilote. Le `--force-wip` explicite reste la seule issue ; il ne se transmet pas au pilote, dont chaque session rejoue ses propres gates.

**1.4 L'OBJECTIF est l'unité de livraison, la task l'unité de travail** (2026-10-04) — un intent = un objectif livrable. Il porte **une branche, une PR, un merge, une clôture**, quel que soit son nombre de tasks.
- **Branche d'objectif** : celle du worktree — `shika/[runId]`, créée par `shika-wt create` depuis `origin/[baseBranch]` ; la session n'en crée pas d'autre. Hors pilote (`/shika-run T{id}` interactif, sans worktree) : `shika/[task-id]` créée depuis `origin/[baseBranch]`, même déroulé.
- **Par task, sur cette branche** : noter `TASK_BASE=$(git rev-parse HEAD)`, puis §2.b → §2.c (commit `feat([task-id]): …`) → c.1 → d.0 → §d review du **diff de la task seule** (`git diff $TASK_BASE..HEAD`) avec sa boucle de correction → d.1 / d.1bis / d.2 / d.3 → statut de la task dans le state §f. **Entre deux tasks : ni push, ni PR, ni sync TASKS.md, ni note de passage** ; le gabarit §2.g.2 se réduit à UNE ligne par task.
- **Task suivante** : elle part du HEAD de la branche d'objectif — **plus d'empilement de PR**. Une task restée `needs_review` (P1 non résolu après la boucle) n'arrête pas l'objectif, sauf pour les tasks qui en dépendent (procédure de reprise, contrôle 3) ; elle garde la PR finale en draft (§e.1, stop dur).
- **Clôture de l'objectif** — fait partie de la DERNIÈRE task traitée, dont le statut n'est écrit dans le state qu'APRÈS la clôture (sinon le pilote lit l'intent consommé et s'arrête sans PR) : c.1 rejoué une fois sur la branche entière → §d.0 rejoué une fois sur le **résultat intégré** (le parcours complet pour une surface, définitions et population pour une analyse — une preuve par task ne prouve pas leur assemblage) → §e.0 voie courte mesurée sur le diff de l'objectif (tier = le plus élevé de l'intent) → sinon §e, **une PR** `feat([runId]): [titre de l'objectif]` avec une section par task (verdict review, smoke, preuve) → §e.1 merge sur gates verts si toutes les tasks sont `done` → §e.2 → §3 / §3.1 sync TASKS.md en une fois → §2.g.1 note de passage → §4.
- **Reprise** : une task dont le commit `feat([task-id])` existe déjà sur la branche d'objectif reprend à §d (review), **jamais** à §2.b.

**1.2 Detection modular monolith** — Si `subprojects/` : par task, lire `Files:` → scope (sous-projet / cross-cutting / racine). Branche d'objectif `shika/{subproject}-{runId}` ou `shika/{runId}` (§1.4). Logger scope dans commit. Warning si 3+ sous-projets. Pas de nesting 2+.
**1.5 Identification user (multiplayer)** — Si `.shikamaru/team.json` : matcher git user/email → userId. Non trouvé → "unknown" + warning.

### 2. Pour chaque task
**Règles de délégation (sub-agents)** :
- **ALWAYS** lancer le premier sub-agent dans le **MÊME tour** que l'annonce — **NEVER** terminer un tour sur une promesse d'exécution non lancée.
- **Worktree** : les sous-agents travaillent dans le worktree de l'objectif — ALWAYS « travaille dans ton cwd » dans le prompt, **NEVER** citer le path absolu du repo principal.
- **Spec visible** : **ALWAYS** committer TASKS.md avant tout spawn worktree (les worktrees partent du HEAD commité). Sinon → embarquer la spec complète inline dans le prompt (fallback).
- **Git dans le prompt ⇒ worktree obligatoire** : **ALWAYS** `isolation: worktree` pour tout sub-agent dont le prompt mentionne `git checkout` / `git diff` / `git rebase` (review comprise).
- **Dépendance entre objectifs** : dans un objectif, les tasks se suivent sur la même branche (§1.4). Un intent qui dépend d'un objectif non mergé **attend son merge** : **NEVER** brancher un objectif sur la branche d'un autre, **NEVER** merger une PR `needs_review` pour débloquer une chaîne.
- **NEVER** déléguer en background une task dont le livrable est un FICHIER (Write rejeté sans humain pour approuver). **ALWAYS** vérifier la capacité d'écriture avant de recommander le mode d'exécution.
- **Ordre d'édition sûr + arrêt net** : inscrire dans TOUT prompt de délégation « éditions dans un ordre qui laisse le fichier exécutable — définition AVANT appel — et arrête-toi net si une édition est refusée ».
- **Santé du tree après TOUT retour de sub-agent** : **NEVER** enchaîner sur le compte rendu seul — vérifier `git status` + la commande de test du projet AVANT la task suivante.
- **NEVER** créer la branche côté runner quand on délègue en worktree — l'agent crée sa branche dans son worktree.
**Mode chaîne (`--chain`)** — sémantique interactive, mais la session ne s'arrête ni sur une question ni entre deux tasks ; un pilote externe la relance à neuf (`scripts/run-chain.py`).
- **Question** : en `--chain`, **NEVER** poser une `AskUserQuestion` — prendre l'option marquée `(Recommended)`, agir, journaliser. Deux options recommandées → prendre la **première**, journalisée comme ambiguïté. **Aucune option recommandée ⇒ arrêt en état sûr** (commit + push + state §f + sync §3.1), la question recopiée dans le journal, session terminée : une question de DIRECTION n'existe pas dans un run — elle signale une spec incomplète, on s'arrête, **NEVER** on ne devine. La règle couvre aussi les questions **écrites dans ce protocole**, qui n'ont pas de `(Recommended)` mais ont une réponse par défaut évidente et journalisable : §0 reprise → **oui** ; §f.1 > 150K → écrire `Progress` et **continuer** : en `--chain`, seul le checkpoint > 200K termine la session.
- **Journal** : toute décision prise à la place du user écrit une ligne dans `$MAIN/.shikamaru/chain-journal.md` (dépôt principal, 0.5bis) (append), format fixe — `- 21:14 · T195 · « Voie courte ou PR draft ? » → voie courte (Recommended) · autres : PR draft / STOP`. Un arrêt (question sans reco, gate §0.2/§1.1, irréversibilité) s'y écrit au même format, l'option prise valant `ARRÊT`. **L'heure vient de l'horloge, JAMAIS du modèle** : ajouter la ligne par `printf -- '- %s · T195 · « … » → …\n' "$(date '+%H:%M')" >> "$MAIN/.shikamaru/chain-journal.md"`. **NEVER** l'outil d'édition, **NEVER** une heure tapée à la main — ni `21:14`, ni `15:1x` : le modèle ne connaît pas l'heure, il la devine (27/09 : lignes datées 19:48-20:15 écrites à 19:24 ; 38 lignes sur 122 en « 15:1x »).
- **Attente** : une session `--chain` ne rend **JAMAIS** la main sur une attente (review en fond, CI, smoke long) — elle la consomme par un appel d'outil qui bloque ou qui interroge, selon le geste nommé au §d.1 (boucle `until grep`). **NEVER** terminer un tour sur « j'attends » : le tour terminé ferme la session et le pilote en relance une NEUVE, qui ne sait rien de ce qui était en vol.
- **Gates** : `--chain` se comporte comme `--night` sur le plafond hygiène §1.1 (STOP net + ligne de journal + message de reprise). Sur la file WIP §0.2, les tasks de l'intent en cours sont **exclues** de la file, et le STOP sur file extérieure écrit `chain-wait-<runId>.json` dans le dépôt principal avant la fin de session : le pilote attend que la file se vide au lieu de s'arrêter (§0.2 (B)) ; la **voie fermée par irréversibilité** (§e.0) reste un stop dur qu'aucune reco n'ouvre. En revanche la voie courte §e.0 et le merge sur gates verts §e.1 (XS/S/M) restent **ceux du mode interactif** : la chaîne est un run sans attente, pas un run sans filet.
**Pre-filtrage multiplayer** : si team.json → skip tasks assignées à un autre membre.
**Sync check** : `git fetch origin`, HEAD vs origin/[baseBranch]. Diverge → `git merge origin/[baseBranch]` dans la branche d'objectif. Conflit → task blocked, suivante.
**a) Branche** : la branche d'objectif (§1.4) — créée à la première task, checkout sinon. Noter `TASK_BASE`.
**b) Execute** : lire prompt TASKS.md, modifier les fichiers de `**Files:**`, respecter les critères de done.
- **Note de passage — AVANT toute exploration** : lire `$MAIN/.shikamaru/handoff.md` (dépôt principal, 0.5bis) s'il existe (écrite en §2.g.1 par la task précédente). Sa 1ʳᵉ ligne porte le chemin du **dépôt principal** — on la compare à `$MAIN`, jamais au chemin du worktree : chemin différent (autre projet) → **ignorée**. Absente, ou datée de plus de **7 jours** → l'ignorer et le dire en UNE ligne (« note périmée du {date} »), puis explorer normalement.
- **Test d'abord (task à `**TDD:**`)** : écrire les tests AVANT le code, les lancer, consigner l'échec dans `.shikamaru/proof/[task-id]/rouge.txt` — ligne `$ commande` puis la sortie rouge — et commiter tests + `rouge.txt` AVANT le code (`git log` en fait foi). Le gate done (hook T218) refuse `done` sans ce fichier.
- **Fixtures adversariales (parsing/regex/matching)** : **ALWAYS** ≥1 fixture ADVERSARIALE (ce qui ne doit PAS matcher / PAS changer) en plus du cas cible, ET tester sur le corpus réel accessible.
- **Livrable analytique (chiffre, seuil, phrase causale)** — 3 gestes obligatoires : (1) énumérer et tester les causes CONCURRENTES avant toute phrase causale, ne garder que celle qui survit ; (2) « 0 écart mesuré » = présomption, JAMAIS preuve tant que l'algèbre n'est pas refaite à la main — et un mécanisme COPIÉ d'un modèle de référence impose de vérifier la prémisse qui le rendait neutre là-bas ; (3) un SEUIL impose d'inspecter la DISTRIBUTION RÉELLE de la grandeur seuillée (cardinalité, doublons, mono-occurrences), pas seulement sa logique — et une task qui **construit une base** valide sa **clé d'identité AVANT de compter** : format, domaine (interne vs externe), nombre maximal de lignes par clé, liste des non-appariés. Un compte qui retombe sur le chiffre du cadrage ne valide pas la clé.
- **Livrable = une SURFACE** (`Files` matchant `tsx|jsx|vue|svelte|html|css|scss`) : **ALWAYS** lire `references/design-floor.md` AVANT d'écrire la première ligne et tenir ses vérifications sur le RÉSULTAT CONSTRUIT. Le plancher dit ce qu'on refuse, **jamais** quelle direction prendre.
- **Livrable d'HABILLAGE (CSS, mise en page) : aucun empilement de gates vertes ne vaut un regard.** **ALWAYS** ouvrir le rendu dans un navigateur à la largeur où il se casse (mobile en premier) avant de conclure. **NEVER** conclure `done` sans ce regard : ni la review, ni les tests sans moteur de rendu, ni §d.3 ne voient un séparateur qui devient un tiret flottant au retour à la ligne. Navigateur impossible → `needs_user_validation`, **JAMAIS** `done`.
- **Heuristique fixture partagée** : quand un correctif oblige à modifier une fixture PARTAGÉE pour que la suite repasse → suspecter l'invariant avant la fixture (signal syntaxique : le diff touche une fixture partagée).
- **Boucle rouge/vert : les fichiers TOUCHÉS, jamais la suite entière.** Dans la boucle d'écriture, lancer uniquement les fichiers de test que la task touche (`vitest run <fichiers>`, `pytest <fichiers>`, ou l'équivalent du projet). La suite complète et les tests de page servie appartiennent à la porte c.1, **une seule fois**, juste avant le commit — les rejouer à chaque édition coûte plus que la correction qu'ils vérifient. **NEVER** toucher à la configuration de test du projet cible pour y arriver : on choisit ce qu'on lance, pas comment le projet teste.
**c) Commit** : **d'abord revenir à la racine du dépôt** (`cd "$(git rev-parse --show-toplevel)"` — 5+ occurrences où le `cd` d'un gate fait échouer le `git add` en `pathspec did not match`, sans commit et sans bruit, cf. 0.5bis #1). Puis `git add [fichier1] [fichier2]` explicite — PAS `git add -A`, PAS TASKS.md (sync en 3.1).
**c.1) Gate build post-change** : re-lancer APRÈS les edits, avant review/push — `npx tsx scripts/validate.ts` + la commande build du projet si elle existe + **la suite de tests complète du projet, résolue comme ci-dessous**. Échec → corriger avant review ; incorrigeable → `needs_review`.
   ⚠️ **La suite complète et la page servie tournent ICI, et UNE fois — et la porte les NOMME**, sinon elle ne vaut rien : une porte qui se contente de `validate` + build se franchit sans qu'un seul test ait tourné, alors que §2.b vient d'interdire à la boucle de les lancer. **Résoudre la commande AVANT de conclure**, dans cet ordre : la note de passage §2.g.1 (« Commandes qui marchent »), puis `package.json` → `scripts.test`, `pytest`, ou l'équivalent du projet ; **page servie** → le `**Recettage:**` de d.1 ou la QA d.2 si la task en déclare un. **Aucune suite résoluble → NEVER annoncer « c.1 vert »** : le dire dans le résumé §4 (même barème que le gate vide sans typecheck). La porte ne s'allège jamais — **NEVER** la franchir sur les seuls fichiers touchés. Si une correction suit c.1, ne PAS tout rejouer : relancer les fichiers de test touchés par le correctif **et ceux qui étaient rouges au lancement précédent**, puis c.1 une seconde fois **au plus**. Une 3ᵉ traversée dans la **boucle de correction** d'une même task est le signal qu'on corrige à l'aveugle → `needs_review` (le contrôle de santé au retour d'un sub-agent, §2, n'entre pas dans ce décompte : il garde la porte, il ne corrige rien).
   ⚠️ **ORDRE : purge → build → typecheck, jamais purge → typecheck.** `rm -rf .next` supprime `.next/types`, où Next GÉNÈRE `LayoutProps` : un `tsc --noEmit` joué juste après rend `TS2304: Cannot find name 'LayoutProps'` sur du code parfaitement sain. Le build régénère les types : il doit passer AVANT.
   ⚠️ **Gate VIDE sur un projet sans vérificateur de types.** Si le projet n'a pas de `tsc` (bundle esbuild, JS pur), « validate + build » ne prouve rien. **NEVER** annoncer « gate c.1 vert » dans ce cas — le dire dans le résumé, et pour tout livrable de SURFACE exiger l'EXÉCUTION de l'artefact construit, pas sa seule production.
**d.0) Preuve en conditions réelles (NON bloquante)** — après c.1, avant la review : exercer **chaque** critère `**Done:**` sur le livrable construit, et consigner le résultat critère par critère.
- **Moyen, choisi au vu du livrable** : page ou composant servi → navigateur sur le parcours que le critère décrit (runner-qa ou le navigateur de la session) ; endpoint, job, script → vraie requête sur le serveur de dev démarré, ou vraie commande ; protocole ou doc → une commande qui observe l'effet (exécution, grep du fichier livré), **JAMAIS** « relu ».
- **NEVER** `AskUserQuestion`, **NEVER** attendre un geste humain : secret absent → `non_prouvé` `secret_absent` ; geste humain requis → `geste_humain` ; serveur qui ne démarre pas → `service_indisponible` (raison = dernière ligne d'erreur).
- **NEVER** écrire sur une base, un service ou un compte live/prod pour prouver → `non_prouvé` `irreversible`.
- **Plafond 10 min** pour l'ensemble de l'étape → au-delà, les critères restants en `non_prouvé` `delai`. `non_applicable` seulement si aucun effet n'est observable, raison à l'appui.
- Écrire : `echo '{"items":[…]}' | npx tsx scripts/proof-report.ts --task [task-id] --write` ; vérifier : `--check` (même `--tasks-file` que d.1bis en modular monolith). La ligne imprimée (`preuve : P/N prouvés · …`) va dans le gabarit §g.2, dans la section « Preuve » du body de la PR (geste + constat par critère) et dans `.runner-state.json` (`proofSummary`).
- Un `non_prouvé` **ne change aucun statut** et aucune condition de merge. Un critère observé **FAUX** (le geste rend l'inverse : bouton sans effet, 403) n'est pas un `non_prouvé` : c'est un défaut → boucle de correction existante, rapport réécrit après correction.
- **Écart connu ⇒ JAMAIS `prouvé`.** Un critère que le runner sait non tenu — « prouvé avec réserve », écart déclaré dans la PR — n'est **NEVER** écrit `prouvé` : il corrige, ou la task passe `needs_review`. Une réserve est un défaut connu, pas une nuance du constat.
- `proof-report.ts` absent ou en crash → l'annoncer (F13), rubrique « preuve : outil en échec », la task continue.
**d) Review (par `reviewLevel`)** — lire `task.reviewLevel` depuis `run-intent.json` ; **absent → `opus` pour une task de tier M, `standard` pour XS et S** (le Speccer écrit `skip` explicitement pour les XS ; un intent écrit à la main sans niveau ne saute jamais la review) ; `--skip-review` force `skip` :

| reviewLevel | Comportement |
|-------------|--------------|
| `skip` | Bypass du bloc review UNIQUEMENT (**défaut XS**) — les gates d.1 Recettage, d.2 QA, d.1bis Smoke et l'override script destructif (reviewer complet, tout tier) restent OBLIGATOIRES avant e) |
| `standard` | Codex 1 passe, sans retry (gate léger S) |
| `opus` | Review escaladée + retry ×1 (gate lourd M) |

| Niveau | Chemin |
|--------|--------|
| `standard` (S) | `review.ts` (abonnement → API → Edgee) ; statut `agent` → reviewer-agent BORNÉ |
| `opus` (M) découverte | `review.ts`, même geste ; statut `agent` → reviewer-agent COMPLET |
| `opus` confirmation, ET script destructif (tout tier : `--apply`, migration, suppression, écriture de données) | reviewer-agent COMPLET Claude (worktree, fixtures, corpus réel) |
Procédure :
1. **Review par script — un seul geste, en arrière-plan.** Écrire les critères `**Done:**` de la task (copiés de TASKS.md ; absents → le `Goal:`, warning au résumé) dans `/tmp/done-[task-id].md`, puis :
   ```bash
   npx tsx ~/Projects/shikamaru/scripts/review.ts --task [task-id] --base $TASK_BASE --level [reviewLevel] --done /tmp/done-[task-id].md --run [runId] > /tmp/review-[task-id].json 2> /tmp/review-[task-id].log; echo REVIEW_EXIT=$? >> /tmp/review-[task-id].log
   ```
   - **ALWAYS** en `run_in_background` (les watchdogs cumulés des chemins dépassent le plafond de 600 s du tool Bash), attendu par `until grep -q REVIEW_EXIT= /tmp/review-[task-id].log; do sleep 10; done`, ré-émis au besoin. **NEVER** lire le code de sortie de la tâche de fond (non fiable, 3+ occurrences), **NEVER** cumuler `&` et `run_in_background`, **NEVER** terminer un tour sur « j'attends » : en headless, le tour terminé ferme la session.
   - Le script construit le prompt contractuel (contrat de sortie, critères décochés, diff `TASK_BASE..HEAD` inline — **jamais** d'auto-évaluation du runner, de résultat de tests ni de verdict smoke), lance `codex exec` depuis `/tmp`, applique le remède de chaque panne (saturation, épuisement mémorisé pour le run, écart de version, refus de contenu, verdict absent, watchdog) et rend `{statut, verdict, findings, chemin, pannes, nonParsable, avertissements}`. Il ne lance aucun sous-agent et n'applique aucun correctif.
   - **Annoncer (F13)** en une ligne chaque entrée de `pannes`. `REVIEW_EXIT` ≠ 0 ou JSON illisible → script en échec : l'annoncer et traiter comme `agent`.
   - Pannes, chemins et mesures : runner-learnings, « Review — pannes et chemins ».
2b. Statut `agent` en `standard` → **reviewer-agent BORNÉ** en l'annonçant (F13) : diff INLINE dans le prompt, ~15 tool calls, périmètre = diff + critères de done, **NEVER** balayage corpus à ce niveau.
2b-bis. **Sub-agents indisponibles** (AgentTool interdit par la politique de session, ou absent) — le chemin reviewer-agent **n'existe pas**, il ne « échoue » pas. **ALWAYS** l'annoncer (F13) puis faire une **review MÉCANIQUE par l'agent principal** : diff inline, rejouer les fixtures de la task, confronter chaque critère de `**Done:**`. **ALWAYS** marquer la task `needs_review` en écrivant dans le body de la PR « aucune review indépendante — sub-agents indisponibles ». **NEVER** compter cette relecture comme une review passée, et **NEVER** abandonner la task en silence faute de chemin.

2bis. **Double panne (codex + reviewer-agent)** : **NEVER** laisser croire à une review passée — l'auto-review n'est pas un gate ; l'écrire en toutes lettres dans le body de la PR + task `needs_review`.
2ter. **Base de review = `TASK_BASE`** (§1.4), jamais `[baseBranch]` : sur une branche d'objectif, le diff depuis la base réinclurait les tasks précédentes déjà reviewées.
2quater. **Prémisse qualifiant l'état de review d'une PR** (« jamais reviewée ») : **ALWAYS** la vérifier contre le champ `Review`/les commentaires de la PR avant de la reprendre.
3. `opus` découverte — `review.ts` (même geste) ; statut `agent` → reviewer-agent COMPLET. `opus` confirmation OU script destructif → reviewer-agent COMPLET Claude (`isolation: worktree`, fixtures adversariales, corpus réel).
4. **Verdict → action** : le `statut` du JSON applique la table de sévérité — `DONE` → `done` ; `BLOCKED` → `blocked` ; ≥1 P1, `NEEDS_WORK` sans finding, sortie non parsable → `needs_work` ; P2/P3 seuls → `done` + section « Review notes (P2/P3) » au body de la PR — **sauf clause de mesure ci-dessous**.
   ⚠️ **Sévérités non canoniques** (`High`, `Low`, `Critical`, `nit`…) = **NON parsable** → fail-safe `needs_work`. **NEVER** deviner une correspondance : seuls `P1`, `P2` et `P3` sont reconnus, et **seuls les P1 rendent `needs_work`**.

   🚨 **Clause de mesure — un P2 ou un P3 n'est sans effet que si on l'a vérifié.** La clause vaut pour les deux sévérités. Quand le reviewer **n'a pas exécuté le code** (chemin codex, review légère), son étiquetage de sévérité n'est pas une autorité. **ALWAYS** rejouer le finding sur le corpus réel AVANT d'autoriser `done` dès que sa conséquence porte sur un **fait publié** — un chiffre, un décompte, une affirmation dans un livrable destiné à un client ou à une décision. Tant que la mesure n'a pas eu lieu, le P2 ou le P3 se traite comme un P1.
   - Signal d'alerte le plus fiable : un P2 formulé au **FUTUR** (« *will* crash », « *would* create bogus rows », « risque de »).
   - Cette clause **ne regonfle pas** les `needs_review` : un nitpick de style, de nommage ou de documentation reste un P3 et passe. Elle ne mord que sur ce qui sort du dépôt.
   📝 **Task `**Exploratoire:** oui`** : ses findings P1 sont **notés dans le body de la PR** (section « Findings exploratoires »), sans `needs_review` ni task de correction dédiée — son résultat ne sert aucune décision nommée. Elle suit sinon la table ci-dessus (BLOCKED, sortie non parsable inchangés).
5. `standard` : needs_work → `needs_review` (PR draft + warning, pas de boucle). `opus` : needs_work et retry < 1 → corriger, re-commit, relancer.
   - **Exception RÉGRESSION AUTO-INFLIGÉE — la seule porte de sortie de `standard`** : si un P1 établit que **la task elle-même a cassé un comportement qui marchait avant elle** (et non un défaut préexistant qu'elle révèle), `standard` gagne **UNE passe corrective, une seule**. Au-delà → `needs_review`. **NEVER** étendre cette exception à un P1 qui préexiste à la task : celui-là part en `needs_review`, il n'appartient pas à ce run.
   - **Après une passe corrective, on ne « relance pas la suite »** : on applique la règle de c.1 — fichiers de test touchés par le correctif + ceux qui étaient rouges au lancement précédent, puis c.1 une seconde fois au plus. La suite complète a déjà tourné à la porte ; une passe corrective ne rouvre pas le droit de la rejouer à chaque édition.
   - **Corrections BORNÉES aux findings** (mode `opus`) : ne toucher QUE les `fichier:ligne` cités par les findings. Un correctif qui touche un fichier **hors** de cette liste est un signal d'alerte → **s'arrêter, `needs_review`**, ne pas poursuivre la boucle. Toute proposition de **réécriture en bloc** du reviewer est **ignorée**, jamais appliquée.
   - **Exception PRÉREQUIS** : task déclarée prérequis d'une autre task du MÊME run → garde sa profondeur `standard` (pas d'escalade) mais **gagne la boucle de correction, bornée à 2 passes correctives** : au-delà → s'arrêter avant la task dépendante et remonter au user. **NEVER** de « passe 3 » ou « passe 4 ».
   - **3ᵉ issue : RÉFUTER le finding avec une MESURE** — un finding peut être CIRCULAIRE ; chiffrer l'objection, proposer l'instrument valide, tracer les deux dans la PR.
5bis. **Deux gestes de re-review distincts** (opus) — le budget retry ne compte que la découverte :
   - **Confirmation** (après chaque correctif, hors budget, JAMAIS sautée) — MÉCANIQUE par défaut par l'agent principal (~2K : rejouer les fixtures du correctif + `git diff --numstat` **depuis la base de review**, chaque fichier/ligne touché justifié par le correctif). Agent de confirmation complet (~100K) UNIQUEMENT si correctif destructif OU >30 lignes.
   - **Découverte** (nouveaux défauts) : consomme les retries.
   - **Critère mécanique** : si TOUS les findings d'une passe portent sur le delta du dernier commit (`git diff` de ce commit) → confirmation, hors budget. Un seul finding hors delta → passe décomptée.
6. `opus` max retries → blocked + notify telegram.
**d.1) Recettage** : si `**Recettage:**` → `npx tsx scripts/recettage.ts --task [task-id]`. Exit 1 → `needs_review` (pas blocked). Report `.shikamaru/recettage/[task-id]/`.
**d.2) QA hook** : si `.shikamaru/qa-config.yaml` ET task front (`tsx|jsx|vue|svelte|html|css|scss`) → QA E2E via `runner-qa/src/cli.ts`. NON-bloquant : fails > 0 → préfixe titre PR `[QA: M fail]` + section QA dans le body.
**d.1bis) Smoke gate (BLOQUANT)** : APRÈS commit, AVANT push/PR. Si `**Smoke:**` → `npx tsx scripts/smoke.ts --task [task-id]`.
- **Modular monolith** (`subprojects/` existe) : **ALWAYS** ajouter `--tasks-file subprojects/[module]/TASKS.md`, et lancer depuis la RACINE du repo. Sans le flag, `resolveTasksFile` retombe sur `cwd/TASKS.md` — absent — et le gate tombe à côté : **NEVER** conclure « smoke injouable » sur cette erreur, c'est la commande qui est incomplète, pas le script.
- Exit 0 (PASS/skipped) → e). Exit 1 (FAIL/timeout/erreur interne) → task `needs-review`, **JAMAIS `done`** ; PR draft + section Smoke (verdict + commande en échec) ; verdict loggé dans `.runner-state.json` (`smokeVerdict`, `validation`). Report `.shikamaru/smoke/[task-id]/report.json`.
- smoke.ts crash lui-même → `needs-review`, jamais `done` faute de verdict. Script ABSENT (`ERR_MODULE_NOT_FOUND`) → l'annoncer (F13) puis exécuter les asserts inline un par un, même barème.
- Scope : la TASK passe `needs-review`, pas le run. (Différence d.2 : Smoke = backend, shell/HTTP, bloquant ; QA = front, Playwright, non-bloquant.)
**d.3) Design floor (NON-bloquant)** : si task front (MÊME regex que d.2) → `npx impeccable detect --json [cible]`. Cible = la `baseUrl` de `.shikamaru/qa-config.yaml` si le serveur de dev tourne, **sinon** les fichiers de `**Files:**`. Le passage NAVIGATEUR voit ce que le scan de fichiers rate.
- **Codes de sortie — NEVER les lire comme ceux d'un gate Shikamaru** : `0` = propre, **`2` = findings** (ce n'est PAS une panne, c'est le verdict nominal), `1` = cible non scannable. `2` → préfixe titre PR `[Design: N]` + section « Design floor » dans le body ; la task garde son statut. `1`, binaire absent, `npx` en échec → l'annoncer (F13), sauter le gate, **JAMAIS** crasher un run là-dessus.
- **Premier passage sur un projet qui a une charte : le bruit est la RÈGLE, pas l'exception.** **ALWAYS** proposer au user de museler ces règles-là (`npx impeccable ignores add-value <regle> <valeur> --reason "<charte>"`) avant de traiter la liste comme des défauts. **NEVER** « corriger » un finding qui contredit une charte écrite — c'est la charte qui gagne.
- Scope : le gate NOTE, il ne bloque pas et ne change aucun statut. (Différence d.1bis : Smoke = backend, shell/HTTP, **bloquant** ; d.2 QA = front Playwright, non-bloquant ; d.3 = front **rendu**, non-bloquant.)
**e.0) Voie courte — petites tasks (interactif uniquement)** : la cérémonie distante (branche poussée + PR) coûte plus qu'elle ne rapporte sous une certaine taille. Elle est **MESURÉE sur le diff réel, jamais prédite depuis le tier**. Après le commit et la review, `git diff --shortstat origin/[baseBranch]...HEAD` (l'objectif entier) — **`origin/`, JAMAIS la ref locale** (0.5bis #4). Mesurées sur le diff de l'OBJECTIF entier (§1.4), les CINQ conditions **ensemble** ouvrent la voie :
1. tier **XS** ou **S** ;
2. ≤ **30 lignes** changées (insertions + suppressions) ;
3. **1 seul fichier de code** touché (fixtures et documentation ne comptent pas) ;
4. review **CLEAN** — **0 finding P1** (des P2/P3 seuls ne la ferment pas : ils sont recopiés dans le message de commit, qui devient leur seule trace) ;
5. smoke **PASS** ou absent, ET gate c.1 vert.

Alors : **pas de PR.** Dans le worktree : `git fetch origin && git checkout --detach origin/[baseBranch] && git merge --no-ff [branche d'objectif]`, verdict de review + findings P2/P3 recopiés dans le message de merge, puis `git push origin HEAD:[baseBranch]`. Refus non fast-forward → recommencer depuis `git fetch` **en refaisant le merge** sur le `origin/[baseBranch]` frais, 3 essais au plus, puis repli voie normale (§e) — **NEVER** publier les statuts `done` ni `mark merged` tant que le merge n'est pas sur `origin/[baseBranch]`. La branche d'objectif reste celle que la review a lue ; seule sa publication disparaît.

**NEVER** ouvrir la voie courte sur un doute : une seule condition non mesurable ⇒ voie normale (§e), sans discussion.
- 🚫 **Never en nocturne** — `--night` prend toujours §e : rien n'atterrit sur la base sans humain. `--chain`, lui, garde la voie courte du mode interactif (§2, mode chaîne).
- 🚫 **Never — voie fermée par irréversibilité** : un diff qui touche une **migration**, des **données de prod**, une **suppression de données**, de l'**argent** (paiement, facturation, avoir) ou des **secrets** (clés, tokens, credentials) ne passe JAMAIS en voie courte — même tier XS, même en interactif, même à 3 lignes. Le tier mesure la taille du diff, pas ce qu'il coûte d'annuler : une coquille de libellé se revert en dix secondes, une migration jouée sur la prod ne se revert pas. Une voie fermée n'est pas un seuil placé haut — un seuil se règle, une voie fermée ne s'ouvre pas.
- 🚫 **Never** sur un script destructif, ni sur un **objectif dont un autre intent dépend** — une PR est justement la trace qui sert quand un successeur devra être retargé.
- ⚠️ La CI de la base reste le filet (`on: push: branches: [main]`), mais elle passe **après** l'atterrissage : ce sont les gates c.1 + d + d.1bis qui gardent la porte, pas elle.


**e) Push + PR — une par objectif** (§1.4) : `git push -u origin [branche d'objectif]` puis `gh pr create --title "feat([runId]): [titre de l'objectif]" --body "..." --draft` (intent d'une task : `feat([task-id]): [titre]`). Notification telegram si configuré.
**e.1) Merge gates verts (voie normale §e uniquement — la voie courte §e.0 a déjà atterri)** — s'applique à l'objectif : toutes ses tasks `done`, sinon draft. Objectif de tier **XS/S** avec review CLEAN/LGTM + smoke PASS + CI de tests verte → **merge immédiat**. « Review CLEAN/LGTM » **inclut le cas `done` avec notes P2** (étape 4) : des findings uniquement cosmétiques ne retiennent pas le merge, ils restent notés dans le body de la PR. Un seul P1 non résolu → **NEVER** merger (marquer la PR ready puis merger) + ligne dédiée dans le résumé §4 — « done » redevient « mergé », pas « une PR de plus ». **Tier M aux gates verts → merge immédiat, comme une XS/S** : M + review CLEAN/LGTM + smoke PASS + CI de tests verte + hors voie fermée → marquer la PR ready et merger. La fenêtre veto de 15 min est supprimée (2026-10-02, REX jeu concours : 26 fenêtres en 5 jours, 0 `stop`, 0 `go`, ~6 h 30 d'attente) ; `veto-merge.ts` a été supprimé (2026-10-04).
   Script destructif, **voie fermée par irréversibilité** (migration, données de prod, suppression de données, argent, secrets — même XS, même en interactif, même liste qu'en §e.0), ou UN gate non vert → PR draft + arbitrage user : **stop dur**. **Nocturne : JAMAIS d'auto-merge, tout reste draft, M comprises** (règle globale F3). En `--chain`, le merge sur gates verts (XS/S/M) est celui du mode interactif.
**e.2) Mergé ≠ SERVI (bloque l'AFFIRMATION, jamais le merge)** — dès qu'une task mergée dans ce run touche une surface dont le **déploiement est MANUEL** (aucune CI branchée sur le dépôt), le run **NEVER** n'annonce le travail comme livré tant que le SERVI n'a pas été mesuré.
- **Reconnaître la surface** : chercher la commande de déploiement du projet (`package.json` → un script `deploy:*`, un `deploy.sh`, un README). Projet déployé par CI → rien à faire ici. ⚠️ Une surface peut en cacher une seconde que la commande NE COUVRE PAS (banc interne, préproduction) : la compter comme non déployée plutôt que la passer sous silence.
- **Mesurer le SERVI, pas le dépôt** : récupérer l'artefact réellement servi (`curl`) et le confronter à celui construit depuis la base — **empreinte** (`shasum`) quand c'est un fichier, sinon ≥1 marqueur **AJOUTÉ** et ≥1 marqueur **RETIRÉ** par les tasks du run. 🚨 **NEVER** conclure sur la seule date du déploiement : elle dit QUAND, jamais QUOI. Et **NEVER** croire un relevé sans l'ouvrir — un compte non nul peut être une coïncidence de chaîne (mesuré : « 20093 » trouvé deux fois dans un bundle, à l'intérieur d'identifiants Shopify).
- **Le run ne déploie PAS de lui-même** : déployer est un geste sortant (§0.6). Il mesure, il écrit l'écart dans le résumé §4, il propose. Sur go user, il déploie **depuis la base** et revérifie le servi — **ALWAYS** contrôler d'abord que `HEAD == origin/[baseBranch]`, sinon on publie une branche non mergée.

**Gate merge (commun)** : **NEVER** merger sur checks Vercel-only — **ALWAYS** attendre la CI de tests verte (Unit Tests) ; CI non déclenchée → la relancer, pas merger sans.
**f) State** : update `.runner-state.json` (runId, status, timestamps, taskStates — dont `proofSummary`, la ligne de §d.0).
**f.1) Protection contexte** — le remplissage n'est plus estimé : le hook `ctx-reel.py` (T219) le lit dans le transcript et injecte `[CTX réel] ~{N}K tokens dans la fenêtre — §f.1 : …` au franchissement de 150K, 200K, puis tous les 50K. **UN SEUL `[CTX]` par task**, dans le gabarit §2.g.2 : il cite la dernière valeur `[CTX réel]` reçue, ou « non reçue » (sous 150K, ou hook absent). **NEVER** estimer de tête ni compter les outils. Les seuils se déclenchent sur cette valeur, qui **inclut** les ~83K fixes d'une session neuve (outils, skills, runner) — d'où 150K/200K et non plus 50K/100K (mesure et calcul : runner-learnings §2.f1).
**Ce que la valeur mesure : le REMPLISSAGE du contexte principal, pas le coût du run.** Un sub-agent n'en rapatrie qu'un résumé — seul ce résumé remplit la fenêtre du runner. Le coût est couvert par le « Coût du run » du §4.

| Seuil | Action |
|-------|--------|
| ≤ 150K | Normal |
| > 150K | **RÉSUMÉ OBLIGATOIRE** dans TASKS.md champ `**Progress:**` (✅ Fait / ❌ Bloquant / 📁 Fichiers / ⏭️ Prochain) puis **continuer**. Interactif seulement : **arbitrage user** si des tasks du run ne sont pas commencées, (a) finir la task courante vs (b) réserver du contexte. En `--chain` : aucun arbitrage, aucune fin de session à ce palier (run-2026-10-04-003 : 3 sessions pour 3 tasks, chacune arrêtée dès 150K) |
| > 200K | **CHECKPOINT ARMÉ** — finir la task courante jusqu'à un état sûr (commit + push + state f + `Progress`), puis terminer la session proprement AVANT la task suivante, avec message de reprise. **JAMAIS d'interruption mid-task.** Le runner ne peut pas vider son propre contexte : « reset » = fin de session propre + reprise en session fraîche. **Exception — plus aucune task à traiter :** pas de checkpoint, le run va au bout de §3 / §3.1 / §4 normalement (un checkpoint ici sauterait le sync, l'archivage et le résumé) |

**Fin de session en `--chain`** — la session **enchaîne les tasks de l'objectif** (§1.4) et ne s'arrête qu'aux seuils ci-dessus (> 200K) ou à la clôture de l'objectif. État sûr d'un checkpoint en cours d'objectif : commit + `git push -u origin [branche d'objectif]` (sans PR) + state §f, message de reprise, session terminée. La procédure de reprise ci-dessous s'applique **telle quelle**, sans duplication — c'est elle qui saute les tasks déjà traitées ; le pilote T196 se contente de relancer un processus neuf.

**Procédure de reprise (après un checkpoint).** `/shika-run` relancé en session fraîche :
1. Relit l'intent (§1) + `.runner-state.json` du worktree — illisibles ou absents → afficher l'état concerné et **s'arrêter en remontant au user**, jamais de reprise en aveugle.
2. **Saute toute task déjà TRAITÉE** — `done`, mais aussi `needs_review`, `blocked`, `timeout` : elles ont eu leur passage, les re-exécuter écraserait leur état. Reprendre à la première task **jamais traitée**. Plus aucune → aller directement à §3.
3. **Avant d'exécuter cette task, contrôler ses dépendances** (`dependsOn` de l'intent, `**Depends:**` de TASKS.md) : si l'une est dans un état autre que `done` — `needs_review`, `blocked`, `timeout` — **NE PAS l'exécuter** : s'arrêter et remonter au user. Une dépendance non validée n'est pas une dépendance satisfaite (trou §2.f1, cas T78).
4. Sinon, exécuter normalement à partir de §2. Le contrôle 3 se rejoue **avant chaque** task reprise, pas seulement la première.
**g) Tracking interne** : mémoriser taskId/status/branch/pr/reviewScore pour le sync final. NE PAS modifier TASKS.md ici.
**g.1) Note de passage (écrite à la FIN de l'objectif, ou à un checkpoint)** — **écraser** `.shikamaru/handoff.md`, **NEVER** append : c'est un ÉTAT, pas un journal. **12 lignes maximum**, 4 rubriques fixes, la 1ʳᵉ ligne portant le chemin absolu du repo (c'est elle qui rend la note ignorable ailleurs, §2.b). Task `blocked` ou `timeout` → la note est écrite **quand même**, « ce qui reste » en premier. Fichier non inscriptible → le dire en une ligne et continuer.
```
/Users/loicjalmin/Projects/shikamaru
**Commandes qui marchent** : `pytest tests/ -q` · `npx tsx scripts/validate.ts --all` · ni build ni typecheck dans ce repo
**Chemins clés touchés** : `scripts/run-cost.py` (section génération) · `tests/test_run_cost.py`
**Pièges rencontrés** : diff de review produit depuis l'arbre de travail → périmètre contaminé ; produire le diff par `git diff $TASK_BASE..HEAD` et lancer `codex exec` depuis `/tmp`
**Ce qui reste** : T197 se branche sur shika/loic/T195 — même fichier, empilement obligatoire
```
**g.2) Gabarit de sortie — UNE ligne par task en cours d'objectif, 10 lignes à la clôture de l'objectif, et AUCUN texte libre hors gabarit.** Rubriques fixes : task · branche · verdict review · smoke · preuve · PR · durée · `[CTX]` · prochain. Tout le reste — findings, explications, raisonnement — va dans un fichier DÉJÀ prévu : body de la PR, `memory/learnings.jsonl`, `.shikamaru/reflection-pending.md`, `.runner-state.json`. Une information qui n'entre ni dans le gabarit ni dans un fichier existant va dans le **body de la PR** plutôt que d'être omise, et le cas se note dans `runner-learnings.md`. Un finding P1 à expliquer suit cette route : body de la PR + la ligne « verdict review » du gabarit, jamais de la prose. En `--night`, le gabarit remplace aussi la notification telegram par task.
**3. Fin d'objectif — on ne revient pas sur la base** : la session reste dans son worktree. Mergé (§e.1 ou §e.0) → `npx tsx ~/Projects/shikamaru/scripts/shika-wt.ts mark [runId] --statut merged` (note le HEAD livré) **puis** `shika-wt remove [runId]` en fin de session (depuis `$MAIN`) — jamais `remove` avant `mark`. Non mergé → le dossier reste, le balayage le reprendra.
**3.1 Sync TASKS.md sur la base, depuis le worktree** — `git fetch origin && git checkout --detach origin/[baseBranch]`, puis statuts par l'**outil Edit** (le gate done le voit ; **NEVER** `sed`) — done : `ready` → `done` + `Completed` + `PR`. blocked : `ready` → `blocked` + `Blocked reason`. `git add TASKS.md && git commit` puis `git push origin HEAD:[baseBranch]`. Refus non fast-forward → recommencer depuis `git fetch` : `checkout --detach` du `origin/[baseBranch]` frais, **réappliquer les mêmes statuts** sur ce fichier (ceux du voisin y sont déjà), recommiter, repousser — **3 essais au plus**, puis repli : statuts écrits dans la PR de l'objectif (parade « statut identique ») et arrêt en état sûr. Enfin `git checkout [branche d'objectif]` pour rendre le worktree à sa branche.
   🔒 **Gate done (hook `gate-done-preuve.py`, T218)** : écrire `done` dans TASKS.md est **refusé** tant que `.shikamaru/proof/<id>/report.json` ne couvre pas chaque critère Done. Refus → appliquer §d.0 puis `npx tsx scripts/proof-report.ts --task <id> --check`, et retenter l'édition.
   Un `non_prouvé` motivé (catégorie + raison) **passe** : le gate exige que la preuve soit consignée, jamais qu'elle soit verte. Échappatoire réservée à une session de réparation : `SHIKA_GATE_DONE=off`.
   **NEVER** contourner le refus par `sed`/Bash ou une autre voie d'écriture : c'est précisément le récit non vérifié que le gate ferme.

   🚨 **ALWAYS syncer AUSSI `needs_review` et `needs_user_validation` — pas seulement `done` et `blocked`.** 2 occurrences, dont une à conséquence live. Une task terminée `needs_review` porte son statut sur SA BRANCHE (donc dans la PR) et reste annoncée `ready` sur la base tant que la PR n'est pas mergée : le run suivant lit la base, y voit `ready`, et **REJOUE la task** — ici une recette Playwright qui écrit en base de données live, la veille d'une démo client. Parade mesurée : écrire sur la base la valeur IDENTIQUE à celle de la branche — les deux côtés font la même modification, le merge de la PR reste sans conflit.

   ⚠️ **Auto-archive (`archive-done-tasks.ts --apply`) — geste EXPLICITE, jamais automatique.** Il ne « range » pas : il **SUPPRIME** le bloc complet de la task et ne laisse qu'un pointeur `git log`. Deux dégâts mesurés : (a) un tier M finit `done` avec une PR encore **draft** — l'archivage effacerait son bloc avant tout merge (6 tasks écartées à la main sur un seul run) ; (b) archiver une `done` dont une task vivante déclare `**Dépend de:**` rend la référence pendante et met le gate 0.1 du run suivant au ROUGE (sauté à la main 3 runs consécutifs — T207, T208, T209). **ALWAYS** exiger la preuve du merge avant d'archiver, et **ALWAYS** rejouer `validate.ts` APRÈS l'archivage, avec retour arrière sur le fichier si rouge.

**3.2 Learnings (JSONL)** — Par task bloquée/erreur → append `memory/learnings.jsonl` (error/workaround/observation). Puis `npx tsx scripts/synthesize-learnings.ts` — script ABSENT → annoncer (F13) + skip, jamais crasher (le JSONL reste la source de vérité).

### 3.3 Reflection post-run
Si blocages > 0 : patterns dans learnings.jsonl ; pattern récurrent (>2 occ.) → observation JSONL + append `.shikamaru/reflection-pending.md` sous un heading daté `# Reflections en attente (run {runId}, {date})`, entrées `- **[{type}]** {titre} — {N} occurrences — cible: {fichier}` + 1-2 lignes. Étape silencieuse.
**Cible selon la nature de l'échec** : une task échouée **≥2 fois sur la MÊME cause** (deux tentatives, deux passes correctives, ou deux runs) est un défaut de DÉCOUPAGE, pas d'exécution — la reflection cible un fichier du **speccer** (`shika-speccer.md`, `references/tier-templates.md` ou `references/speccer-learnings.md`), **JAMAIS** `shika-run.md`. Le runner exécute ce qu'on lui donne ; seul le speccer peut mieux découper la prochaine fois. Un échec unique ou une panne d'outil (codex, watchdog, index.lock) reste ciblé sur le runner.
**Transfert** : finding ciblant un skill/script Shikamaru → l'appender AUSSI dans `~/Projects/shikamaru/.shikamaru/reflection-pending.md`. Puis décider du nudge — **une ligne passive, JAMAIS une question** :
- **Cooldown 7 jours (bloquant)** : lire `.shikamaru/last-improve-nudge` ; < 7 jours → **NE PAS nudger** quel que soit le compte ; sinon nudger + réécrire le stamp.
- Passé le cooldown : nudger si **≥10 findings** OU plus vieux **>3 semaines**. Format : « ⚠️ reflection-pending : N findings en attente (plus vieux du {date}) → `/shika-improve` quand tu veux ».

**Rappel du rituel de portefeuille** — même forme, **une ligne passive, JAMAIS une question**, et **borné par un cooldown, jamais par un stock** : lire `.shikamaru/last-plan-nudge` ; < 7 jours → **NE PAS nudger**. Sinon, si le dernier rituel (`lastRitual` du QUESTS.md le plus récent) remonte à **> 14 jours** → « ⚠️ dernier rituel de portefeuille le {date} ({N} jours) → `/shika-plan` quand tu veux », puis réécrire le stamp. **Why** : le rituel n'avait pas tourné depuis 3 semaines — 10 chantiers non arbitrés, un jalon Ziggy passé sans verdict — et le user a fini par poser la question à la main (« comment on avance là-dessus », « tu me recommandes quoi ? on a fait quoi ? et doit aller où ? »). Le rituel reste **manuel** (décision verrouillée 2026-08-13) : on rappelle, on ne déclenche pas.

### 4. Resume final
**25 lignes MAXIMUM, en tableau, aucune prose libre** — ce qui n'y entre pas va dans le body de la PR ou dans `memory/learnings.jsonl`. Les 4 sections marquées OBLIGATOIRE ne se retirent jamais sans go user.

| Ligne | Contenu |
|-------|---------|
| Tasks | une ligne par task : statut (done / needs_review / needs_user_validation / blocked) · branche · PR · verdict review · smoke · preuve ; la ligne de l'objectif porte son **état** — réalisé · vérifié (§d.0 rejoué sur le résultat intégré) · mergé · servi (§e.2) — et **NEVER** « fini » ni « livré » dans le résumé sous l'état « vérifié » |
| **Voie courte** (OBLIGATOIRE) | tasks passées par §e.0, avec les 5 mesures qui l'ont autorisée, vs voie normale. Une task en voie courte n'a **pas** de PR : son verdict de review vit dans le message de merge, le résumé doit le dire |
| **Coût du run** (OBLIGATOIRE) | total tokens sub-agents ventilé exec / review / confirmation + comparaison à la baseline du run précédent (`subagentTokens` écrit dans le state en §f) |
| **Changements d'usage** (OBLIGATOIRE) | si le run a modifié des skills/commandes que le user invoque → tableau avant → après |
| **Déploiement** (OBLIGATOIRE dès que le run a mergé) | surface(s) touchée(s) · **servi == base ?** avec la MESURE qui le prouve (empreinte, ou marqueur ajouté + marqueur retiré) · l'écart s'il existe, et la commande qui le comble. Surface déployée par CI ou aucun merge → une ligne « sans objet », **NEVER** la rubrique omise en silence |
| **Reflections en attente** (OBLIGATOIRE) | **NEVER** plus d'UNE sollicitation par run sur `reflection-pending.md`, consommateur unique choisi par le scope. **Projet client** (pas de `/shika-improve`) → tri inline : afficher le contenu, trier avec le user (bug → speccer · skill → transfert §3.3 · obsolète → ignorer), puis **vider** le fichier. **Repo Shikamaru** → ligne passive §3.3 et rien d'autre : **NEVER** proposer de traiter les findings en fin de run (ni tri inline, ni mini-improve, ni question) |
| Mode chaîne | si `--chain` : chemin de `.shikamaru/chain-journal.md` + **nombre de décisions prises** à la place du user (dont les arrêts) |

Propose : 1) /shika-speccer, 2) /shika-review, 3) rien.

<!-- PREFIX END — tout ce qui est au-dessus est stable entre sessions (KV cache Anthropic) -->

## Options

| Flag | Effet |
|------|-------|
| `T{id}` (numéro de task) | Exécute cette seule task dans la session, sans pilote. Sans numéro sur un intent d'au moins 2 tasks non traitées → pilote de chaîne en arrière-plan (§1.3) |
| `--night` | Mode nocturne autonome (permissions skip) |
| `--chain` | Sessions neuves enchaînées par un pilote : aucune question posée (l'option `(Recommended)` est prise et journalisée), la session enchaîne les tasks de l'objectif, relancée à neuf au checkpoint (§1.4, §f.1) |
| `--dry` | Affiche plan sans executer |
| `--skip-review` | Force `reviewLevel=skip` sur toutes les tasks |
| `--no-pr` | Commit + push sans PR |
| `--force-wip` | Outrepasse le gate WIP 0.2 (tracé dans le summary) |

## Gestion des erreurs

| Erreur | Action |
|--------|--------|
| Tests fail | task `blocked`, log, suivante |
| Merge conflict | task `blocked`, branche intacte |
| Review FAIL | task `needs-review`, PR draft + warning |
| Smoke fail (BLOQUANT) | task `needs-review`, jamais `done`, verdict loggé, PR draft + section Smoke |
| QA d.2 fail (NON-bloquant) | PR passe, titre préfixé `[QA: M fail]` |
| Design d.3 findings (NON-bloquant) | PR passe, titre préfixé `[Design: N]` |
| Timeout (30min) | task `timeout`, commit WIP, suivante |

## Fichiers produits

| Fichier | Contenu |
|---------|---------|
| `.runner-state.json` | Etat du run |
| `.shikamaru/audit-log.jsonl` | Log detaille actions |
| `.shikamaru/reflection-pending.md` | Ameliorations suggerees |
| `memory/learnings.jsonl` | Learnings auto-captures |
| Branches `shika/*` + PRs | Une par objectif (§1.4) |
