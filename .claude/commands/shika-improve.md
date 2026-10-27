---
name: shika-improve
description: "Self-improvement loop pour Shikamaru — analyse les sessions récentes, détecte friction patterns, propose améliorations aux SKILLs. UTILISER QUAND: après une session dense de discussion design, ou pass mensuel de drift detection. Mots-clés: 'améliorer Shikamaru', 'audit skills', 'retrospective', 'drift', 'self-improve'."
---

# /shika-improve

Self-improvement loop pour les SKILLs Shikamaru. Analyse sessions, détecte friction patterns, propose améliorations avec sign-off explicite.

## Scope

Cible UNIQUEMENT : `~/.claude/commands/shika-*.md`, `references/*.md`, `~/Projects/shikamaru/{CLAUDE,AGENTS}.md`, `.shikamaru/*.yaml|json`, `.shikamaru/reflection-pending.md` (lu + vidé en Phase 6). PAS les projets clients.

Sessions analysées : `~/.claude/projects/-Users-loicjalmin-Projects-shikamaru/*.jsonl` (5 dernières hors courante).

Findings pré-catalogués : `.shikamaru/reflection-pending.md` (écrit par `/shika-run` étape 3.3 — patterns récurrents >2 occurrences). Lu quel que soit le scope.

## Hard rules

| Règle | Pourquoi |
|-------|----------|
| **Sign-off explicite** | Pas d'auto-rewrite. Chaque finding présenté 1 par 1 via AskUserQuestion. |
| **Diff-based filtering** | Skip findings déjà acceptés (vs `improve-learnings.md`). |
| **1 question = 1 finding** | NEVER batcher des findings. |
| **Pas de bypass tier L** | Refonte skill critique → renvoyer vers décomposition manuelle. |
| **Pas d'auto-loop** | À la demande ou pass mensuel. Jamais en cron silencieux. |

## 6 Phases

| Phase | Action | Output |
|-------|--------|--------|
| 0. Scope | Choix : full (history + courant) ou current-only | `scope` |
| 1. Discovery (bg) | Sub-agent catalogue SKILLs + configs | Config map JSON |
| 2. History (bg, full only) | 2a: scan 5 sessions JSONL. 2b: audit findings précédents (verified/drifted/missing) | Findings + prior audit |
| 3. Live (fg) | Détection 9 signaux dans conversation courante + diff filtering | Live findings |
| 4. Cross-ref | 10 tiers + routing 4 destinations | Findings catégorisés |
| 5. Present | AskUserQuestion 1-par-1, par tier | Accept/Reject/Modify |
| 6. Apply | Edit fichiers + tracking improve-learnings.md | Changes table |

Phases 1, 2a, 2b en parallèle (3 sub-agents). Phase 3 en foreground dès scope connu.

### [PHASE 0] Scope

Charger `~/.shikamaru/improve-learnings.md` (adapt : dépriorise types rejetés, boost types acceptés).

Charger `.shikamaru/reflection-pending.md` s'il existe : chaque entrée devient un finding pré-catalogué `{type, titre, occurrences, cible}`, injecté en Phase 4 (cross-ref) au même titre que les findings live, soumis au diff-filtering vs `improve-learnings.md`. Mémoriser son chemin pour le cleanup Phase 6.

AskUserQuestion : "Historical + current" (full) ou "Current only" (rapide).

### [PHASE 1] Discovery Agent (bg)

Sub-agent `Explore` — catalogue tous fichiers shikamaru : skills, refs, CLAUDE.md, AGENTS.md, .shikamaru configs. Output JSON array `{path, role, lines, last_modified}`. READ-ONLY.

**Miroir global** : `~/.claude/commands/` est en COPIES RÉELLES (plus de symlinks depuis 2026-07-26 — le harness ne les suit pas). Checks Discovery : (1) `find ~/.claude/commands -type l` doit être vide, (2) `diff -q` copie↔source sur chaque skill — le drift copie/source est le mode de défaillance du miroir, pas l'absence de fichier.

Fallback si fail : scan hardcodé via `find`.

### [PHASE 2] History + Prior Audit (bg, full only)

**2a History Scan** : parse 5 derniers .jsonl, filtre messages user, matche patterns (corrections, praise, friction, feedback). Output JSON groupé par session.

**2b Prior-Improve Audit** : vérifie que les findings acceptés précédemment ont landé (Verified / Drifted / Missing). Cross-check rejets récurrents.

Fallback si fail : bascule current-only.

### [PHASE 3] Live Analysis (fg)

#### 9 signaux à détecter

| Signal | Quoi chercher |
|--------|---------------|
| Corrections | "non", "don't", "stop", redo |
| Praise | "yes", "exact", "perfect" |
| Friction | "again", retries, confusion |
| Capability gaps | User fait manuellement ce que le skill devrait faire |
| Behavioral patterns | Tone issues, over/under-explaining |
| Targeted feedback | Args passés à `/shika-improve` |
| Repeated workflows | Processus manuels répétés |
| Techniques discovered | Approches qui ont marché |
| User interaction patterns | Prompting styles qui marchent/pas |

Pour chaque match → finding `{id, type, quote, context, target_file, confidence}`.
- **high** : 3+ signals ou correction directe
- **medium** : 1-2 signals
- **low** : spéculatif

**Diff filtering** : check chaque finding vs `improve-learnings.md`. Skip si déjà accepté. Re-surface si rejeté 1-2×. Si rejeté 3+× → option "rejet définitif ?".

🚨 **NEVER classer un finding « périmé » sans avoir REJOUÉ le cas exact et constaté qu'il échoue.** Une correction supposée couvrante ne périme pas un finding : elle périme au mieux la variante qu'elle a traitée. **Why** : le run #10 (2026-09-01) a rangé « exit 0 de smoke.ts » parmi les ~40 % de findings périmés « toutes vérifiées corrigées dans le code ». La vérification avait porté sur la FAMILLE de bugs, pas sur chaque VARIANT — le variant « champ `**Smoke:**` dupliqué » ne l'était pas, et il a été reproduit sur fixture le 2026-09-02. Le fichier `reflection-pending.md` étant **vidé après tri**, un finding mal classé périmé disparaît **définitivement**. La vérification se fait sur le fichier cible réel (grep/lecture) ou par rejeu ; son résultat s'inscrit dans le pass.

🚨 **NEVER présenter une proposition sans sa mesure.** Critère d'admission en Phase 5 : un finding n'est présentable que s'il porte (a) un **nombre d'occurrences** daté, ET (b) un **coût constaté** ou un **écart mesuré** — pas une gêne supposée. **Why** : sur une liste de 3 améliorations proposées en fin de run, 2 ont été rejetées d'une ligne — « je vois pas ce que ça améliore dans la vitesse et l'efficacité le 1 / 2 idem / 3 go ». La seule retenue était celle adossée à 5 conditions mesurées sur le diff réel. Posture constante du user, formulée explicitement le 2026-09-09 : *« je finance la mesure, pas la croyance »*. Un finding sans mesure se **garde en attente** jusqu'à ce qu'on puisse la faire — il ne se présente pas « pour avis ».

### [PHASE 4] Cross-Reference + Categorization

#### 10 tiers (priorité décroissante)

| # | Tier | Quand |
|---|------|-------|
| 1 | Targeted | Feedback explicite en args |
| 2 | Critical | Règle SKILL violée 3+ fois OU drifted prior |
| 3 | Promotion | Pattern récurrent (3+× cross-sessions) à formaliser |
| 4 | Content Misplacement | Info dans le mauvais fichier |
| 5 | Improvement | Enhancement direct d'un SKILL existant |
| 6 | Technique | Approche qui a marché, à documenter |
| 7 | Maintenance | Config health (bloat, contradictions, staleness) |
| 8 | Reinforcement | Pattern qui marche, à renforcer |
| 9 | New Skill | Capability gap, workflow réutilisable |
| 10 | User Coaching | Suggestion pour le user (rare) |

**Tie-breaking** : tier avec numéro le plus petit gagne. NEVER escalader artificiellement.

#### Routing 4 destinations

| Destination | Quand |
|-------------|-------|
| **Memory** | Fait/contexte non-comportemental |
| **CLAUDE.md** | Règle universelle toutes sessions |
| **Skill** | Procédure multi-étapes OU workflow réutilisable (même < 3 étapes) |
| **Hook** | Règle violée 3+× (advisory 80% → déterministe 100%) |

Si ambigu → adversarial debate (2-3 sub-agents, 50 mots max chacun). User tranche en phase 5.

Si destination=Hook → générer le JSON config complet (event, matcher, command).

### [PHASE 5] Present Findings

Ordre : drifted items → re-surfaced → puis par tier (1→10), puis par confidence (high→low).

Pour chaque finding via AskUserQuestion : tier, confidence, description, destination, proposed change, hook config si applicable. Options : **Accept** / **Reject** / **Modify**.

Pause après 5 findings si 8+ total : "Continue ou apply maintenant ?"

**Rule-writing standards** : NEVER/ALWAYS pour règles critiques, lead avec WHY, précis (pas de "try to"), concis.

### [PHASE 6] Apply Changes

- Group changes par fichier, 1 Edit par fichier
- **Task corrective (routing « task », fixes scripts/code)** : gabarit OBLIGATOIRE à 5 champs — `{fichier:ligne exact, erreur/symptôme VERBATIM, fix proposé (regex/diff si connu), périmètre de vérification élargi (« vérifier les autres occurrences de X »), fixture ADVERSARIALE attendue (ce qui ne doit PAS matcher/changer)}`. Why : session 2026-06-11 résolue en 1 shot grâce aux 4 premiers champs ; le 5ᵉ ajouté après le run 2026-07-28 (3/3 tasks fixture-vertes → NEEDS_WORK pour régressions adjacentes que des fixtures adversariales auraient attrapées).
- Memory : créer `feedback_<topic>.md` avec frontmatter + Why + How to apply, update MEMORY.md index
- CLAUDE.md : edit section appropriée, NEVER/ALWAYS en haut
- Skill : créer ou edit `~/.claude/commands/<name>.md`
- Hook : append dans `~/.claude/settings.json`, NEVER replace hooks existants

Update `~/.shikamaru/improve-learnings.md` avec acceptance rates, modified signals, patterns, rejected list.

**Cleanup meta-loop** : si `.shikamaru/reflection-pending.md` a été chargé en Phase 0 → le vider/supprimer (findings tracés dans `improve-learnings.md`, qu'ils soient acceptés ou rejetés). Évite le re-surfaçage infini par le nudge de `/shika-run` étape 4.

**Clôture OBLIGATOIRE** : un pass qui a modifié des skills/scripts/TASKS.md N'EST PAS terminé tant que (1) le commit n'est pas fait OU explicitement décliné par le user (déclin TRACÉ dans improve-learnings), ET (2) la propagation n'est pas lancée OU explicitement différée. **NEVER** bumper la VERSION du miroir sans celle de la source. **Why** : run #8 (2026-07-31) a appliqué 14 findings puis s'est arrêté sans commit ni propagation — 24h d'incohérence miroir(-0)/source(-3)/clients(-3), T159/T160 invisibles des worktrees, découvert par le run #9.

Proposer commit optionnel. Affiche Changes Applied table + **ligne « Coût du pass »** : total `subagent_tokens` des sub-agents lancés (discovery/history/audit) — la dérive de coût doit se voir par pass, pas sur la facture (feedback user 2026-07-28).

## Anti-patterns à refuser

| Anti-pattern | Pourquoi |
|--------------|------------------|
| Auto-rewrite sans sign-off | Dérive silencieuse |
| Re-surfacer findings acceptés | Bruit, érosion confiance |
| Batch findings dans 1 question | User tranche 1 chose à la fois |
| Routage "skill" sans procédure claire | Skills morts |
| Tier escalation pour overspec | Si Improvement, NEVER mettre Critical |

## Rollback

`git revert <commit shika-improve apply>` — modifs groupées par fichier pour revert ciblé.

## Frequency

- **À la demande** : après session dense (>1h, friction visible)
- **Pass mensuel** : `/shika-improve --monthly`
- **NEVER** auto-loop scheduled
