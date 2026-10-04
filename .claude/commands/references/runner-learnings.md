# Runner Learnings — justifications des règles de shika-run.md

*Ce fichier porte les narratifs "Why" (incidents, dates, mesures) des règles du Runner. Il n'est JAMAIS chargé pendant un run — il sert à la maintenance des règles (comprendre pourquoi une règle existe avant de la modifier). Chaque ancre correspond à la section de shika-run.md qui porte la règle.*

---

## §0.0 Préflight session (~300K tokens)

Mesure 2026-07-31 — 48 % des cache reads de 24h venaient de 4 sessions-fleuve (784M tokens relus / 3,1M générés) ; chaque message y coûte 2,5-4,5× une session fraîche. Un run est autonome par design : il ne perd RIEN à démarrer sans l'historique de conversation.

## §0.5 Base du run (jamais `main` en dur)

BDO 2026-07-24/25 : base réelle `deck/pedagogie-metier`, pull rebase et review `--base main` tous deux faux, ×2.

## §0.5 Clean-tree guard

Le stash implicite fait « disparaître » du travail non commité (spec perdu, run 2026-07-01).

## §0.5 Sessions parallèles dans le même checkout

3 dégâts distincts en un run (2026-07-30-001) : `index.lock` d'une autre session (opération légitime, ne jamais supprimer), commits d'une autre session embarqués sur ma branche, collision de `runId` (l'intent d'origine ne survit que dans un commit git — écrasé 2 fois par une session parallèle, dont une avec le même runId).

## §0.6 Remote gate client

KONBINI 2026-07-09 : MR !2 créée automatiquement sur le GitLab client, user a dû killer le push — même niveau d'interdit que l'auto-merge nocturne.

## §2 Délégation — premier sub-agent dans le même tour

Run 2026-07-01 : « je délègue T152/153/154 » puis rien — stall silencieux overnight, découvert par le user.

## §2 Délégation — « travaille dans ton cwd », jamais le path absolu

pythia-lab run 003 : l'agent a travaillé dans le repo principal, isolation contournée, main laissé sur une branche shika/*.

## §2 Délégation — spec commitée avant spawn worktree

Les worktrees partent du HEAD commité — une spec TASKS.md appendée sans commit est INVISIBLE pour eux (×4, KalioKool meta-bulletproof 2026-07-15).

## §2 Délégation — git dans le prompt ⇒ worktree obligatoire

BDO 2026-07-27 : reviewer-agent a checkout la base dans le repo principal → edits sur la mauvaise version, déployés en org. Le path relatif ne protège pas des opérations git.

## §2 Délégation — dépendance sur task `needs_review` (PRs stackées)

Validé Ziggy CRM2 2026-07-27, PRs 237←238←239.

## §2 Délégation — merger la base dans la branche amont avant de chaîner

Ziggy ACQ 2026-07-31 : `shika/ACQ-1` antérieure à la spec ACQ-2/3 → `smoke.ts` « task not found » dans le worktree aval.

## §2 Délégation — libérer la branche cible avant spawn

Ziggy ACQ-3 2026-07-31 : git interdit la même branche dans deux worktrees, le checkout de l'agent échoue.

## §2 Délégation — jamais de background pour un livrable FICHIER

T81 2026-07-30 : 158K tokens et 36 outils de travail réel brûlés, rapport rendu, aucun fichier créé (Write rejeté d'office sans humain pour approuver), relance morte sans réponse → travail intégralement perdu.

## §2 Délégation — santé du tree après tout retour de sub-agent

T74 2026-07-28 : l'agent a appliqué la ligne appelant `_seuil_numerique(...)` puis son édition définissant la fonction a été refusée → `NameError` dans `load_config`, pytest ET build à terre. Rien n'était commité, `git checkout --` a suffi — mais le runner n'avait aucune étape pour s'en apercevoir et la task suivante partait d'un tree cassé.

## §2 Délégation — cwd avant tout spawn

Run 2026-07-29-002, gravité haute : cwd dérivée vers un clone CLIENT après un assert → le reviewer a créé une branche dans un dépôt sous gate §0.6. 0 commit / 0 push constatés — le garde-fou a tenu par chance.

## §2 Délégation — ne pas créer la branche côté runner (worktree)

×2 : git refuse le checkout d'une branche déjà utilisée par un autre worktree ; le commit de l'agent atterrit sur `worktree-agent-*` et doit être récupéré à la main.

## §2b Fixtures adversariales (code)

Run 2026-07-28 : 3/3 tasks vertes sur leurs fixtures cibles, 3/3 NEEDS_WORK en review pour des régressions ADJACENTES — tasks fantômes, suppression destructive latente, shadowing ; le seul reviewer qui a testé le corpus réel a trouvé les P1.

## §2b Fixtures adversariales — version analytique

- **Causes concurrentes** : T78 2026-07-28 — les 4 mesures étaient exactes à l'unité et confirmées par 2 reviewers ; les DEUX verdicts NEEDS_WORK ont porté sur l'explication (« volume de saisie » puis « comptes publicitaires différents »), toutes deux réfutables en une requête. La vraie cause — `type=socialdisplay` côté saisie vs `type=brandcontent` côté mesures — n'est apparue qu'au 2ᵉ tour. Un doc client faux-mais-reproductible est le cas le plus coûteux.
- **« 0 écart mesuré » = présomption** : T83 2026-07-30 — non-régression mesurée à 0 écart sur 69 lignes / 4 métriques / 3 plateformes, et pourtant le `GREATEST` transposé changeait la valeur de tout post mono-pub où `org < paid` — vrai par la donnée du jour, faux par construction ; il était neutre dans le modèle source parce que SA définition était déjà un `GREATEST`.
- **Seuil ⇒ distribution réelle** : T76 2026-07-28 — un seuil relatif de 10 % sur un compteur de 26 unités = « perdre 3 agences ». Introuvable sur fixtures : il a fallu dumper le référentiel client pour y trouver `Signature`/`Signature-com`, `WPP`/`WPP Media`, `INDEP ` à espace final et 9 agences à une seule task.

## §2b Heuristique « déplacer la preuve au lieu de l'invariant »

T76 passe 3 : une validation fausse cassait ~40 tests, la fixture partagée `min_rows` a été remontée 1→20 pour les faire passer ; le reviewer a identifié ce geste comme LE tell — « le commit a déplacé la fixture au lieu de l'invariant », « le seul témoin du défaut a disparu de la suite ».

## §2.c1 Gate build post-change

KalioKool codex P2 : le gate 0.1 tourne AVANT les edits et ne couvre pas les erreurs build-only. Cache stale : route supprimée encore référencée dans `.next/types` (KalioKool 2026-07-17).

## §2.d Profondeur proportionnée au tier

Feedback coût 2026-07-28 : 3 tasks XS/S ont coûté ~700K tokens de review, gate lourd appliqué partout. Élargissement codex à la découverte M (2026-08-01) : 8+ reviews dont 2107 lignes/900s, 6 P1 + 3 P2 réels, 0 bascule silencieuse.

## §2.d.2 Check codex en deux temps (watchdog ≠ codex utilisable)

La panne HTTP 400 « model requires a newer version of Codex » (CLI v0.133.0) a survécu 3 runs sur 2 jours (2026-07-29-002, KONBINI 2026-07-30-002, Ziggy 2026-07-30-001) parce que le check ne testait que la présence du watchdog — le chemin cross-model était HS sans que personne le voie.

## §2.d.2 Watchdog 900s

Sur un diff analytique codex rejoue les requêtes BigQuery pour vérifier les chiffres — 900s (CRM4-2) et 1200s (ACQ-1) réellement mesurés ; à 60s comme à 300s la review meurt en plein milieu sans verdict. Le watchdog protège du hang, il ne doit pas tuer une review légitime.

## §2.d.2bis Double panne review

Ziggy 2026-07-30-001 : les deux chemins morts (CLI HS + sub-agent interdit), gate silencieusement dégradé en auto-review.

## §2.d.2quater Prémisse de review dans une spec

2 occ. Ziggy 2026-08-01, dont un near-miss de merge avec 2 P1 ouverts (CLO-3 décrivait CRM4-2 « jamais reviewée » alors que son champ portait NEEDS_WORK).

## §2.d.5 Exception PRÉREQUIS

T75 (tier S, donc `standard`, donc pas de boucle) était le prérequis dur de T76 ; ses 3 P2 portaient exactement sur le câblage et la carte de types dont T76 dépendait — appliquer le règlement à la lettre faisait hériter T76 d'un chemin de production mort-testable. On paie la boucle, pas la profondeur (feedback coût 2026-07-28).

## §2.d.5 Réfuter un finding avec une mesure

Ziggy 2026-07-31 : codex demandait d'ajouter `first_visit_source` aux strates de standardisation, alors que ces champs dérivent de l'objet dont l'absence EST l'outcome mesuré — 100 % de NULL sur les sessions non tracées. Sans cette issue, la seule sortie conforme est d'appliquer un remède qu'on sait faux.

## §2.d.5bis Confirmation vs découverte

- Confirmation mécanique par défaut : 4 confirmations-agent = ~380K tokens sur le run 2026-07-28, dont 3 pour des correctifs simples. Le seuil (destructif OU >30 lignes) aurait quand même escaladé le correctif T157 où l'agent complet a trouvé un trou réel (NOT_CONFIRMED 2026-07-28).
- Découverte consomme les retries : T69 = 5 passes trouvant chacune un défaut réel nouveau, souvent introduit par le correctif précédent — budget épuisé + arbitrage user à chaque fois.
- Critère mécanique delta-du-dernier-commit : sur T75/T76, les 5 passes de confirmation ont produit 10 findings quasi tous nés du correctif précédent (plancher → érosion silencieuse → borne → config légale non chargeable → phrase fausse). La question « découverte ou confirmation ? » s'est posée 3 fois, l'arbitrage est remonté au user 2 fois faute de critère écrit.

## §2.d.3 Agent complet sur script destructif

C'est ce niveau qui a attrapé le P1 destructif d'archive-done-tasks (2026-07-28) et le NOT_CONFIRMED T157.

## §2.d.1bis Smoke gate — script absent

Ziggy 2026-07-27 : crash sur `ERR_MODULE_NOT_FOUND`. Cause racine traitée : shika-update propage désormais les scripts.

## §2.e Gate merge (CI Unit Tests)

KalioKool #704 : mergée sans Unit Tests → régression sur main ; gate appliqué à la main sur #706, 2ᵉ occurrence du pattern CI-partielle.

## §2.f1 Run séquentiel — arbitrage à 150K, checkpoint à 200K (ex-50K/100K)

T78 2026-07-28 : tier S, 30 min estimées, ~94K à elle seule via 2 passes de review + vérification indépendante des verdicts — T77, tier M `opus`, jamais commencée au STOP HARD. Le « commit WIP, reset context » ne dit pas comment reprendre un run dont la task 2 dépend d'une task 1 restée en `needs_review`.

**Refonte 2026-08-08 (T172) — deux défauts distincts, deux corrections.**

*1. Le barème mesurait le coût, pas le remplissage.* Un sub-agent comptait 10K alors qu'il ne rapatrie qu'un résumé (~1-2K) dans le contexte du runner : ses tokens internes sont dépensés dans SON contexte, pas dans celui du principal. Le compteur punissait donc précisément le geste qui protège le contexte — déléguer. Rejoué contre T78 : les ~94K de reviews déléguées valent quelques K au nouveau barème (2×1K + outils locaux), aucun seuil franchi. Le coût reste mesuré, mais au bon endroit — le « Coût du run » du §4, qui existe pour ça.

*2. Le STOP HARD frappait mid-task, sans procédure de reprise.* Un plafond qui tombe au milieu d'une task laisse un WIP non reviewé et une chaîne de dépendances dans un état que rien ne décrit — c'est exactement ce qui a laissé T77 jamais commencée. **Décision user 2026-08-08 : suppression pure du STOP HARD**, remplacé par un checkpoint à une frontière de task. Ce qui borne une task qui dérive, ce sont les gates existants (retries de review, `blocked`, timeout), pas un plafond de contexte. La reprise est désormais écrite (§f.1), y compris le trou d'origine : une task dont la dépendance est restée `needs_review` n'est PAS exécutée — on remonte au user.

**Recalage 2026-10-04 — l'échelle avait changé, pas les seuils.** 50K/100K ont été fixés sur l'ancien barème, qui comptait le travail à partir de zéro. T219 a remplacé l'estimation par le remplissage réel, qui **inclut** le socle fixe d'une session — et a gardé les seuils « inchangés ». Mesure sur les 56 sessions `--chain` du 01 au 04/10 (transcripts claude-b, Opus 5.5, fenêtre 1M, 1 seule compaction) : une session neuve démarre à **83K** (médiane ; 66-95K selon les MCP chargés). Le checkpoint à 100K tombait donc après ~17K de travail, soit après la première task quelle qu'elle soit (constaté sur run-2026-10-04-001 : 2 sessions pour 2 tasks).

Calcul du nouveau seuil, sur les mêmes 56 sessions :
- **Une task** ajoute 47K (médiane), 85K (p75), 104K (p90), 129K (max).
- **Une relance** coûte ~35K de relecture (intent, state, TASKS) et 6 min (médiane) avant le premier Edit, plus la réécriture du cache du socle.
- **Plafond** : 300K, la limite au-delà de laquelle la règle globale propose déjà une session fraîche (coût par message ×2,5-4,5).
- **Checkpoint = plafond − task p90 ≈ 200K** : une task lancée sous 200K finit sous 300K dans 9 cas sur 10 (pire cas mesuré : 329K). Une session enchaîne ainsi 2 à 3 tasks médianes, 1 seule grosse. Au-delà, continuer coûte plus en relecture de cache (≈ 50 tours × l'écart de contexte) qu'une relance n'en économise.
- **Résumé à 150K** = un palier avant, pour que `Progress` soit écrit avant le checkpoint.

Nuance qui justifie le mot « checkpoint » plutôt que « reset » : le runner ne peut pas vider son propre contexte. La seule action réelle à sa portée est de finir proprement et de rendre la main pour une session fraîche.

## §3.2 Learnings — script absent

Ziggy 2026-07-27 : `synthesize-learnings.ts` absent du projet → annoncer (F13) et skip, le JSONL reste la source de vérité.

## §3.3 Nudge reflection-pending — cooldown 7 jours

Le compte est celui d'un ACCUMULATEUR alimenté par tous les projets clients : à plusieurs runs par jour, n'importe quel seuil de comptage est franchi en quelques heures et re-franchi le lendemain — c'est la fréquence de la SOLLICITATION qu'il faut borner, pas le stock. Historique : le seuil ≥3 visait 8 findings restés 16 jours (constaté 2026-07-26) ; il a produit l'effet inverse — 3 sollicitations par jour (feedback user 2026-08-01).

## §4 Coût du run obligatoire

La bascule silencieuse codex→Claude (mi-juillet) + le gate lourd uniforme ont fait dériver la consommation 2 semaines sans signal — la dérive doit se voir en 1 run, pas sur la facture (feedback user 2026-07-28).

## §4 Un seul consommateur de reflection-pending

Les 3 mécanismes qui coexistaient (nudge §3.3, tri inline, mini-improve) se déclenchaient ENSEMBLE sur le repo Shikamaru, et le tri inline n'avait aucun seuil : il partait à chaque run, sur tous les projets. « On me demande de faire des shika-improve 3 fois par jour » (feedback user 2026-08-01). Côté client le tri inline reste justifié : sans lui les reflections pourrissent (alerte KalioKool restée 1 mois sans suite).

## §0.2 Gate WIP — frein needs_review

Enquête productivité 2026-08-12 (135 runs, 6 semaines) : depuis fin juillet le runner empilait des PRs par-dessus une file non traitée — needs_review 11 % → 39 % des statuts terminaux, 15 items en attente user au 12/08, W33 effondrée à 2 PRs mergées en 3 jours pour une conso quasi inchangée (coût par PR ×15). Le goulot n'est pas la vitesse des runs (médiane git 1,7 h → 1,0 h) mais la bande passante de review du user : produire plus de PRs quand la file déborde DÉTRUIT du throughput au lieu d'en créer. D'où le frein : on vide avant de remplir. Verbatim fondateur : « je veux qu'on arrête ce cycle infernal qui produit plus rien que des PR » (2026-08-12). Rapport : artifact « Où sont passés les 75 % ? ».

## §2.d.2a Deuxième chance review via Edgee

Panne de crédits codex ~31/07 → 08/08 : bascule directe sur le reviewer Claude → conso ×2-3, boucle de findings, needs_review ×3,5 (enquête 2026-08-12). Même rechargé, codex sature aux pics (learning KONBINI run-007, 2026-08-12 00:06, 4 runs parallèles). Un étage intermédiaire absorbe les deux cas : `edgee launch codex review` route le MÊME flow codex via Edgee avec fallback/reroute vers un autre modèle (settings par clé, one-shot user). Claude reste le dernier recours, plus le premier fallback.

## §2.d.5 Boucle prérequis bornée à 2 passes

T78 (KONBINI, 2026-07-29) : 4 passes de review sur une task tier S — l'exception prérequis donnait une boucle de correction sans borne, et chaque passe re-consomme review + confirmation. L'alternative prévue (s'arrêter avant la task dépendante et remonter au user) existait déjà ; la borne la rend obligatoire au-delà de 2 passes correctives.

## §2.e.1 Merge gates verts (interactif)

Enquête 2026-08-12 : « done » avait cessé de vouloir dire « mergé » — les tasks aux gates tous verts restaient en draft et gonflaient la file (22 PRs ouvertes sur Ziggy dont 19 drafts, zombies de juin). En interactif, une XS/S review CLEAN + smoke PASS + CI verte n'a rien à attendre du user : c'était déjà l'esprit des merges post-run de juillet (« go Loïc »), sans la friction par task. Décision user 2026-08-12. Le nocturne reste 100 % draft (règle F3).

## §2.d.2a Saturation multi-modèles OpenAI

2026-08-12 ~11h20 : review #98 pennylane — `gpt-5.6-sol` PUIS `gpt-5.6-terra` tous deux « at capacity » en quelques minutes (pic de charge global, même signature que le learning « codex sature » de la nuit). Une alternance de modèle suffit hors pic (KONBINI 2026-08-11 : sol saturé → terra CLEAN) mais pas EN pic : au-delà d'une alternance, le seul étage qui tient est un modèle NON-OpenAI — d'où Edgee en 2a-bis, et pas de boucle de retry côté runner.

## §2 / §f.1 Mode chaîne (`--chain`)

Mesure du 2026-09-13 (git + transcripts, fenêtre Ziggy 2026-09-12 11h30 → 2026-09-13 15h30, puis KONBINI DC Studio) : la task n'est pas plus lente — ≈40 min machine, stable depuis août. Ce qui mange le week-end, c'est le nombre de cycles et la présence humaine dans chacun. **18 sessions** pour UNE task, 17 relances à la main, **3,5 h** où la machine attendait Loïc sans rien faire. Sur KONBINI, 85 questions en 5 jours dont 3 posées le soir : **3 nuits mortes sur 5 jours**, le run repris le matin.

Ce qui autorise « prendre la reco sans demander » : sur ces mêmes runs, l'option marquée `(Recommended)` a été choisie **23 fois sur 24**. La 24ᵉ n'était pas un désaccord de fond mais un cas où aucune option n'était recommandée — d'où la règle inverse, non négociable : **aucune reco ⇒ arrêt en état sûr, jamais de devinette**. Une question sans reco dans un run signale une spec incomplète ; c'est le speccer qu'elle concerne, pas le runner.

Pourquoi pas `--night`, qui existait déjà : le nocturne STOP net sur la moindre file, interdit la voie courte §e.0 et tout auto-merge — il est taillé pour « personne ne regardera avant demain matin », pas pour « Loïc est là mais n'a pas à être sollicité ». `--chain` garde les filets de l'interactif (voie courte, merge XS/S sur vert) et ne retire que l'attente. Ce que le runner savait déjà faire — reprendre en session fraîche (procédure de reprise §f.1), empiler des PRs sur une dépendance non mergée (§2) — n'est pas dupliqué : `--chain` ajoute seulement un déclencheur de checkpoint après chaque task, et la boucle externe vit dans `scripts/run-chain.py` (T196).

## §2.b / §2.g / §f.1 / §4 Note de passage et plafond de prose

Ventilation du 2026-09-13 sur Ziggy — **4,31 M tokens de sortie en 18 sessions**, fenêtre du 12/09 11h30 au 13/09 15h30, mesurée par la section « génération » de `scripts/run-cost.py` (T198). Où part ce que le modèle écrit :

| Cible | Part | Ce que ça dit |
|-------|------|---------------|
| réflexion seule | 32,1 % | le travail, incompressible |
| bash d'exploration | **21,4 %** | **refait à neuf à chaque session** — la machine redécouvre le repo qu'elle vient de quitter |
| texte adressé à Loïc | **18,9 %** | ≈ 45 k par task, pour un lecteur qui répond « go merge » |
| code produit + code de test | **13,3 %** | le livrable |

Chiffres **re-mesurés le 2026-09-13 après T201**, qui a sorti l'écriture de fichier de l'exploration. Sur la même fenêtre et le même code, avant → après : bash d'exploration **23,91 % → 21,40 %** (−2,51 pts, −108 015 tokens), code produit 7,89 → 9,40, code de test 2,82 → 3,77, compta 6,11 → 6,15, docs 0,69 → 0,70. Les 108 015 tokens quittés se retrouvent **à l'unité** dans les quatre cibles d'arrivée : l'invariant de somme est vérifié des deux côtés, pas supposé.

⚠️ Une **première** mesure de T201 donnait 21,31 % (−2,60 pts, −111 818 tokens), et c'est ce chiffre qui figure encore dans le critère `Done:` de la task. Il était sur-compté de **0,09 point** : la passe de confirmation a trouvé deux faux positifs de plus — `[[ "$a" > "b" ]]`, où le `>` compare au lieu de rediriger, et `<<\EOF`, dont le délimiteur échappé n'était pas reconnu, si bien que le CORPS du heredoc était relu comme du shell. Les deux sont corrigés et portent chacun leur fixture (`test_28`, `test_29`). **Le chiffre relevé ici est celui qui sort après correction — la règle n'a pas été ajustée pour retomber sur le critère.**

Les gates, eux, coûtent 1 à 5 % chacun : **ce n'est pas là qu'est le temps**. Deux règles en sortent, et une seule d'entre elles ne suffirait pas — la note fait baisser l'exploration, le gabarit fait baisser la prose.

- **Note de passage** (`.shikamaru/handoff.md`, écrasée, 12 lignes, 4 rubriques) : elle ne remplace pas l'exploration, elle en retire la part *redondante* — les commandes qui marchent, les chemins déjà touchés, les pièges déjà payés. Écrasée et non accumulée, parce que c'est un ÉTAT : un journal qui grossit redevient du contexte à relire. Le chemin du repo en 1ʳᵉ ligne est la parade au checkout partagé, où deux projets se disputent le même `~/.claude`.
- **Gabarit de 10 lignes** : ce qui est retiré du chat n'est jamais perdu, il est *déplacé* dans un fichier nommé (body de PR, `learnings.jsonl`, `reflection-pending.md`, `.runner-state.json`). La règle « ce qui n'entre nulle part va dans le body de la PR » existe pour qu'aucune information ne tombe entre deux chaises.
- **`[CTX]` par task et non par outil** : la ligne par outil coûtait à peu près autant qu'elle informait, et le seul moment où elle change une décision est la fin de task — là où le checkpoint s'arme.

**Ce qui jugera ces deux règles** : `scripts/run-cost.py`, section génération, sur le prochain run réel d'au moins 2 tasks — part « texte au user » ≤ 7 %, part « bash exploration » en baisse par rapport à **21,4 %**. Mesure de jalon de la quête Q2.

✅ **La réserve de T198 est levée — et le chiffre qui la portait était faux (T201, 2026-09-13).** T198 annonçait « 6,98 des 21 points de bash exploration sont de l'écriture par heredoc ». La règle écrite, puis mesurée, en donne **2,51**. Le 6,98 comptait comme « écriture » trois familles qui n'appartiennent pas à l'exploration du dépôt :

| Famille sur-comptée par T198 | Ce qu'elle est vraiment |
|------------------------------|-------------------------|
| `git commit -m "$(cat <<EOF…)"` | de la `compta`, et la priorité de table la tenait **déjà** |
| `pytest … > f`, `codex … > f` | `lancement_tests` / `lancement_review`, déjà classés |
| Redirection **hors dépôt** (`/tmp`, `/dev/null`) | de l'exploration, et elle y reste : rediriger vers `/tmp`, c'est regarder, pas produire |

⚠️ **La leçon de méthode, payée TROIS fois dans la même task — et chaque passe a sur-compté, jamais sous-compté.** T198 a compté un MOTIF (`>` dans le texte de la commande) sans rejouer la table de priorité ni le fenêtrage du rapport : 6,98 annoncés. La première version de T201 a refait la même erreur d'un cran plus bas — une regex textuelle comptait `NR>=1495`, `() => {}` et les `>` du corps d'un heredoc comme des écritures, soit **1,21 point de faux** sur 3,81 annoncés. La deuxième, passée au découpage en jetons, en a encore laissé **0,09** : `[[ "$a" > "b" ]]` (le `>` y compare) et `<<\EOF` (délimiteur échappé non reconnu, donc corps du heredoc relu comme du shell). Reste **2,51**. Un détecteur de ce genre converge **par le haut** : tant qu'un cas adversarial n'a pas été rejoué sur le corpus, le chiffre publié est un plafond, pas une mesure. Deux conclusions, toutes deux vérifiées sur le corpus :

- Un `>` ne se reconnaît **pas** au motif. `chemin_ecrit()` découpe en jetons de shell (`shlex`, `punctuation_chars`) et retire le corps des heredocs — c'est ce qui distingue une redirection d'un chevron dans du texte, et qui rattrape au passage `> 'src/a b.ts'` avec son espace.
- **Le seul instrument valide est le rapport lui-même, avant/après, sur la même fenêtre.** Un script d'enquête ad hoc sur les `.jsonl` sur-compte d'environ 1 point (il ignore le bornage de sessions) : il sert à *localiser* une famille, jamais à *chiffrer* un delta.

**Limite connue de la règle, mesurée et assumée** : la classification est une fonction pure de la commande, sans la racine du dépôt sous la main — un chemin relatif est réputé dans le dépôt, un chemin absolu dehors. Elle sous-compte donc les écritures en chemin absolu vers le dépôt : **768 tokens sur la fenêtre, soit 0,02 pt**. Négligeable, et dans le bon sens (sous-compter la production plutôt que la gonfler).

## §2.b / §2.c.1 / §5 La suite complète tourne une fois, à la porte

**MAQ-28 sur Ziggy, le 2026-09-15.** La task a duré **35 minutes**, dont **19 minutes de tests** — 54 % du temps — répartis sur **20 lancements**, pour **4 éditions de code**. La suite complète, qui prend **4 min 25**, a été jouée **trois fois** ; les tests de page servie, 3 min 23, une fois. Deux des trois traversées de la suite vérifiaient un correctif dont le périmètre tenait dans deux fichiers de test.

La règle « mesurer fichier par fichier, pas avec un worktree jetable » existait déjà en réflexion — elle n'était écrite nulle part dans le protocole, donc le runner relançait tout à chaque tour, par défaut et sans y penser. Ce que la règle sépare désormais : la **boucle** (fichiers touchés seulement, §2.b) et la **porte** (suite complète + page servie, une fois, §2.c.1). Sur une suite de 4 minutes, chaque relance non ciblée coûte plus cher que la correction qu'elle est censée vérifier.

⚠️ **La porte ne s'allège pas.** La tentation symétrique — « puisqu'on cible, cibles aussi à c.1 » — est explicitement refusée : la suite complète tourne **au moins une fois** avant tout commit, c'est elle qui attrape ce que le périmètre du correctif ne laissait pas prévoir. Ce qui est borné, c'est le nombre de traversées (**deux au plus** par task, la seconde seulement si une correction suit c.1), pas leur existence. Une 3ᵉ traversée dans une même task ne se négocie pas : c'est le signal qu'on corrige à l'aveugle → `needs_review`.

⚠️ **Ce que la règle n'autorise pas** : toucher à la configuration de test du projet cible (parallélisme, `testMatch`, timeouts) pour rendre la suite plus rapide. Le runner choisit **ce qu'il lance**, jamais **comment le projet teste** — cette frontière-là appartient au projet, pas au run.

## §e.1 Merge d'une M après 15 minutes sans veto (2026-09-26, T221-T222)

Enquête temps du 2026-09-26 : **102 h de « go » en 10 semaines** (30 % du temps de Loïc), avec la reco de l'agent prise 69 % du temps. Le runner ne mergeait seul que les XS/S, alors que 78 % des tasks classées de septembre sont M : chacune attendait un « merge ? ». Loïc passe une semaine de portier à veto : le runner annonce le merge sur Telegram (`scripts/veto-merge.ts notify`), et un commentaire `stop` sur la PR dans les 15 minutes le bloque.

Deux contraintes ont fixé la forme. Le veto passe par un commentaire GitHub et non par une réponse Telegram, parce que le robot des sessions consomme déjà `getUpdates` et qu'on lui volerait ses messages. `watch` est borné à 540 s pour tenir sous le plafond de 600 s d'un appel d'outil, d'où la boucle « rappeler tant qu'il sort 5 ».

Les voies fermées par irréversibilité et le nocturne restent des stops durs : le veto remplace le « go » sur ce qui se revert en dix secondes, jamais sur ce qui ne se revert pas.

**Fenêtre supprimée le 2026-10-02** (REX jeu concours, §3 cause 1) : 26 fenêtres en 5 jours, **0 `stop`, 0 `go`**, ~6 h 30 d'attente cumulée. Loïc n'a jamais exercé le veto ni raccourci la fenêtre : elle ne filtrait rien et coûtait 15 min par M. Une M aux gates verts se merge désormais tout de suite, comme une XS/S ; la voie fermée par irréversibilité et le nocturne restent des stops durs. `scripts/veto-merge.ts` reste dans le dépôt, plus appelé.

Le runner a d'abord tenté d'écrire cette règle seul : le classifieur du mode auto l'a refusé comme auto-modification des règles de merge. La règle a été écrite sous validation manuelle de Loïc — c'est le bon endroit pour qu'un humain signe.

**Le `go` qui ferme la fenêtre (2026-10-01).** Ziggy, chaîne du calculateur (RV-5a, RV-5b, RV-6, trois M à la suite) : Loïc était devant l'écran, la PR de RV-5b avait ses gates verts, et il a demandé à merger tout de suite pour enchaîner. Le script ne connaissait que `stop` et l'échéance : la seule façon de gagner les minutes restantes était de merger à la main sous le nez du runner. Sur une chaîne de trois M, la fenêtre coûte 45 minutes d'horloge même quand l'humain a déjà dit oui. Un commentaire exactement `go` posé dans la fenêtre rend donc GO sans attendre. Trois garde-fous : même égalité stricte que `stop` (un « go pour moi » dans une phrase ne merge rien), un `go` antérieur à l'annonce ne vaut pas pour une PR ré-annoncée, et un `stop` de la même fenêtre gagne quel que soit l'ordre. Le runner ne poste jamais `go` lui-même : il a le même compte GitHub que Loïc, le script ne peut pas les distinguer, c'est la règle écrite qui tient.

**Mesure de fin de test le 2026-10-03** : heures de « go » évitées vs la baseline de 102 h / 10 semaines, nombre de VETO posés, et M mergées à tort (revert ou correctif dans les 48 h).

## §d.0 Preuve en conditions réelles, choisie au run (2026-09-26, T223)

Enquête debug du 2026-09-26 : **118 épisodes** du 01/07 au 26/09, dont **31 (26 %)** où c'est Loïc qui a découvert qu'une task `done` était cassée. KONBINI le 30/08 : recette « 9/9 en prod » alors que le bouton principal ne marchait pas (« depuis mercredi on code dans le vide »). France Agricole le 22/08 : 4 tasks de déploiement mergées sur un site qui répondait « Forbidden ».

Le Smoke écrit à la spec vérifie **avant que le code existe** : sur **60 FAIL lus**, ~27 venaient de l'assert lui-même, 2 à 3 seulement étaient des défauts réels. La preuve se choisit donc au run, quand le livrable existe et qu'on voit par quel geste (navigateur, requête, commande) le critère s'observe.

Elle ne bloque jamais : le 05/09, **3 runs Equicty** sont restés arrêtés sur un secret absent et un geste humain. Une preuve impossible se **consigne** (`non_prouvé` + catégorie fermée + raison factuelle), elle n'arrête rien et ne change aucun statut. Ce qui reste traité comme un défaut, c'est un critère observé FAUX — celui-là passe par la boucle de correction, pas par le rapport.

`scripts/proof-report.ts` porte le contrat : une entrée par critère Done, dans l'ordre d'apparition (cases cochées comprises), `geste` + `constat` pour un prouvé, `categorie` + `raison` pour un non prouvé. Le `--check` refuse un rapport qui saute un critère — c'est ce qui empêche de ne prouver que les critères faciles.

## §3.1 Gate done — le disque, pas le récit (2026-09-26, T218)

Occurrence fondatrice : le 13/09 (run-2026-09-13-001), T192 et T193 sont passées `done` avec « Smoke PASS » déclaré dans le résumé, sans aucun rapport sur disque. Rien ne distinguait une vérification faite d'une vérification racontée. Forme reprise du hook gateguard d'ECC : *refuser, puis laisser repasser* une fois le fait écrit.

Réorientation du 26/09 : la version spécifiée le 15/09 exigeait un Smoke **PASS**, donc rendait bloquante la vérification écrite à la spec — celle dont la mesure du 26/09 montre ~45 % de FAIL dus à l'assert lui-même, pour 2 à 3 défauts réels sur 71 tasks en échec (cf. speccer-learnings, T224). Le gate garde désormais le rapport de preuve de T223 : il exige qu'il EXISTE et couvre chaque critère, `prouvé` ou `non_prouvé` motivé. Il ne bloque que le runner qui n'a rien consigné, et ne pose jamais de question. Fail-open sur toute erreur interne : un bug du hook ne doit jamais geler une session.


## Remplissage du contexte mesuré par `run-cost.py` (2026-09-26, T220)

Le 31/07, 48 % des cache reads de 24 h venaient de 4 sessions-fleuve (784M tokens relus pour 3,1M générés) — et la règle « session fraîche au-delà de ~300K » n'était instrumentée nulle part : `run-cost.py` ne lisait que `output_tokens`. La section « Remplissage » lit `input + cache_read + cache_creation` de chaque réponse dédoublonnée, dans la même passe que la génération (même population : `remplissage.reponses` = `generation.reponses_par_session`).

L'ancien détecteur de sessions dégradées (script supprimé, il lisait un CSV Edgee mort depuis le 20/06) portait trois motifs, désormais lisibles ici : **explosion de contexte** = `remplissage.max` ; **boucle d'erreur** = franchissements 150K/200K/300K rapprochés (quelques tours d'écart) ; **ratio dégradé** = comparer le remplissage à la section Génération de la même session (beaucoup relu, peu écrit).

## §d / §2.b / §d.0 Sept décisions du REX jeu concours (2026-10-02, T229)

Source : REX de la chaîne JCC (Ziggy, 01-02/10) — 10 h 25 de runner pour 4 h 17 de premier passage (× 2,4).

- **`opus` par défaut pour M** : l'intent `run-2026-10-01-001` portait 6 tasks M en `standard` ; « standard : pas de boucle » les a sorties en `needs_review`, d'où 4 tasks de correction dédiées (JCCF), 18 min d'arrêt, 1 relance du pilote, et 75 min d'attente pour la chaîne voisine RV. Les intents RV et BTQ, en `opus`, ont corrigé en session : 0 `needs_review` sur BTQ.
- **`codex exec` depuis `/tmp`** : 10 reviews lancées depuis `/tmp` à 54 s et 54 000 tokens au plus ; 10 lancées depuis le dépôt ou un worktree, dont 4 entre 656 000 et 1 551 000 tokens (4,3 M d'abonnement) et une review expirée parce que codex relançait pytest pendant 10 min. Les reviews courtes rendent des findings aussi fondés (JCC-2C, JCC-3, JCC-4). Le prix : le reviewer ne lit plus rien hors du diff.
- **Clé d'identité validée avant de compter** : le socle JCC-1 comptait sur un champ caché factice partagé par 4 répondants ; découvert après 6 tasks, refait pour 2 h 14 (≈ 2 h évitables, 10-15 min de contrôle dans la task de socle).
- **Exploratoire** : JCC-2B et JCC-3 ne nommaient aucune décision et n'en ont changé aucune — 1 h 23 de corrections hors veto. Une task sans décision ne justifie pas de task de correction.
- **Écart connu jamais `prouvé`** : 93 critères « prouvé » sur 93 pour les 17 tasks JCC, dont 12 revenues NEEDS_WORK ; 0 `non_prouvé` sur 32 rapports. N° 18 : écart déclaré dans la PR ; n° 19 (JCC-4) : « prouvé avec réserve » alors que l'annonce « au moins 0,90 » tombait (4 thèmes sur 13 entre 0,67 et 0,73).
- **Trois sévérités** : 109 P1 pour 1 P2 sur 74 logs de review — l'échelle ne triait rien. P1 = bug, faille ou résultat publié faux ; P2 = règle de spec non tenue sans effet sur un chiffre ; P3 = forme. Seul P1 bloque ; la clause de mesure garde P2 et P3 (un `[P3]` a déjà porté un défaut réel le 2026-09-11, et un P2 mal étiqueté a publié du faux 5 fois).
- **Preuve d'exécution non réclamée** : hors JCC, 9 P1 réfutés disaient « preuve absente du diff » (PR #633, #634, #646, #648) — le contrat interdit de donner les résultats au reviewer, qui signalait leur absence. 54 % de P1 réfutés hors JCC (21 sur 39) contre 14 % sur JCC.
- **Test d'abord consigné (T231)** : sur JCC-1, `prepare.py` a été écrit, exécuté et patché AVANT son fichier de tests ; la seule pratique qui a payé sur le REX jeu concours (JCCF-4 : « rouge sur l'ancien motif : 5 failed, puis vert ») n'était imposée nulle part, et le runner ne lisait pas le champ `**TDD:**` des gabarits M. Le gate done exige désormais `rouge.txt` (commande + sortie d'échec) pour toute task qui déclare `**TDD:**` ; T231 s'y est soumise elle-même (5 failed sur l'ancien hook, commit des tests avant celui du hook).

## §0.5bis / §3 / §3.1 Un objectif = un worktree (2026-10-04, T235-T236)

**Révoque la décision du 2026-09-12** (« pas de worktree dédié au runner, pas de verrou ») : le runner colocataire du checkout principal accumulait les règles de cohabitation (#2, #3, #7, #9, gardes de branche, `index.lock`) sans fermer le trou.
- **2 h 56 le 01/10** : premier arrêt évitable de la chaîne — une seule chaîne à la fois parce qu'une seconde aurait partagé le checkout ; T188 (parallèle) attendait précisément ce prérequis.
- **`/tmp/ziggy-*`** : des worktrees faits à la main hors de tout registre, jamais balayés — d'où `shika-wt` (T235) : création, signe de vie, plafond de 3 dossiers, balayage après merge ou 48 h sans signe de vie.
- **Inventaire du 04/10** : le pilote lisait une intent à nom fixe, écrivait `chain.log` / `chain-wait.json` à noms fixes et lisait l'avancement dans le TASKS.md local ; le runner faisait `git checkout [baseBranch]` en §3.1 et §e.0. Deux chaînes simultanées se marchaient donc dessus sur 5 fichiers et sur le checkout lui-même.
- **Ce qui remplace** : la session ne sort jamais de son worktree ; le sync TASKS.md se fait en `checkout --detach origin/<base>` + `push HEAD:<base>`, avec 3 essais sur refus non fast-forward en réappliquant ses statuts sur le fichier frais (ceux du voisin sont déjà dedans). Les fichiers partagés vont au dépôt principal, en ajout ; log et marqueur sont suffixés du runId ; l'avancement se lit sur `origin/<base>`, que les deux chaînes alimentent.
- **Gardé** : #1 (racine avant git), #4 (`origin/` pour mesurer), #5 (review depuis `/tmp`), #6 (exclure `.claude/**` des tests — les worktrees y vivent désormais), #8 (commit + push du guard sur la base).
