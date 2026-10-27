# Speccer Learnings — justifications des règles de shika-speccer.md

*Ce fichier porte les narratifs "Why" (incidents, dates, mesures) des règles du Speccer. Il n'est JAMAIS chargé pendant une session de spec — il sert à la maintenance des règles. Chaque ancre correspond à la section de shika-speccer.md qui porte la règle.*

---

## §4-S Boundary-volume (chiffrer le volume traversant)

KalioKool 2026-08-01 : task tier S, livrable 110 Ko → ~30K tokens dans le contexte du runner via le MCP. Le tier mesure la difficulté, pas le volume.

## §4-S / §2quater Prémisse qualifiant l'état de review d'une PR

2 occurrences Ziggy 2026-08-01 — near-miss de merge avec 2 P1 ouverts sur prémisse fausse (CLO-3 décrivait CRM4-2 « jamais reviewée » alors que son champ Review portait NEEDS_WORK).

## §5.1bis Asserts = invariants structurels, pas littéraux

KONBINI 2026-07-09 : `grep -q 2226` sur un count vivant casse dès que la donnée évolue. Un littéral n'est acceptable que sur une fixture contrôlée (taguée `smoke*`).

## §5.1bis Matcher la structure, pas la mise en forme

BDO 2026-07-27 : `grep -q "Pass Rate               100%"` (alignement figé) a fait échouer un smoke dont les conditions réelles étaient vertes — le bon assert est `grep -qE 'Pass Rate +100%'`.

## §5.1bis Les 5 pièges d'asserts exécutables (T79/T81/T83/T85, 2026-07-29→30)

Un smoke qui échoue sur sa propre génération produit un faux négatif crédible qui pousse à rouvrir un livrable correct. 5 pièges vérifiés en 3 jours :
- **1 puce = 1 assertion** : `smoke.ts` extrait le span de backticks et concatène — un `ET` entre deux commandes finit en argument littéral, une flèche `→` dans les backticks tronque l'extraction.
- **`start_cmd : n/a`** : exécuté comme une assertion, fait échouer la task (4 occurrences, corrigé 4× à la main).
- **Cohérence avec `Files`** : T79 — assert sur `account_id`, colonne absente de `bilan_campagne` ; + un assert contredisant les `Files` de sa propre task.
- **Dépôt sous gate §0.6 (clone client)** : `git diff --quiet` échoue par construction — le livrable EST une modification non commitée. Le bon assert vérifie : N fichiers attendus modifiés, rien de stagé, rien de commité en avance sur `origin` — prouve à la fois le livrable ET l'absence de fuite.
- **Sélecteurs dbt** : T83 — les 3 fichiers modifiés étaient en AMONT du mart sélectionné ; avec `--defer` ils auraient été résolus sur la prod et le gate serait passé VERT sans jamais compiler le code livré. D'où : sélectionner les modèles de `Files` nommément (ou `+modele+`), jamais le seul descendant `modele+`.

## §5.1ter Vérification schéma DB

KalioKool ×2 : 2026-07-10 `organizations.trial_ends_at` inexistante → régression fail-open ; 2026-07-12 filtre `deleted_at` faux jamais exécuté car `getActivationState` mocké — le smoke live a rattrapé ce que 10/10 tests TDD mockés ont raté.

## §5.3 Règle Smoke bloquante (retirée par T224, 2026-09-26)

Point de défaillance fondateur 2026-06-11 : 3 bugs runtime (backend pas redémarré, `load_dotenv()` absent, macron `Ū` non matché) passés en review verte — aucune validation live. User : « j'en ai marre c'est une vraie app, je vais pas faire du fail and retry ».

**Retrait (T224, 2026-09-26)** — le besoin de validation live reste, mais le Smoke écrit à la spec était le mauvais instrument. Mesure sur la fenêtre **01/07 → 26/09** : **71 tasks** smokées en FAIL ; sur les **60 FAIL lus**, **~27** (~45 %) venaient de l'assert lui-même (écrit avant que le livrable existe), pour **2 à 3 défauts réels** attrapés. Le speccer était la source de ces asserts cassés, et l'escalade XS/S → M sur signal backend gonflait le monotier (61 % de M). La preuve en conditions réelles passe au run, où le livrable existe : §d.0 de `shika-run.md` (T223). Garder l'obligation à la spec ferait écrire deux vérifications pour une. Un Smoke écrit volontairement reste joué en d.1bis.

## §6 Header project: + dialecte colon

- `project:` manquant dans le frontmatter : gate 0.1 du runner bloquant sans lui (KONBINI 2026-07-08).
- Dialecte `### T{id}: {titre}` (colon) : gate 0.1 échoué à chaque run Ziggy ×2 avec l'em-dash ; format colon validé empiriquement le 2026-07-22. L'em-dash n'est toléré qu'en LECTURE par les scripts T155.

## §0bis Sub-agent light — coût réel

Mesure 2026-08-02 : 35 575 tokens réels pour classer 1 task (estimation « ~300 tokens » fausse ×100 — l'overhead de spawn domine). Le mapping 3 questions est applicable inline ; réserver le spawn aux vrais ambigus.

## Phase 20 — données sources des fast paths

Analyse 416 tasks tier-tagged sur 5 projets : XS=24%, S=37%, M=39%, L=0%. Gain rétroactif estimé ~17h + ~10M tokens. Architecture 3-prompts validée par RouteLLM (ICLR 2025) et Addy Osmani (O'Reilly Sept 2025).

## §4b Regroupement par fichier touché — la revue Ziggy du 14/09 rejouée

Revue client du 14/09 sur le calculateur Ziggy : 30 écrans annotés. Le speccer découpait alors « par contrat mis à l'épreuve » (corps de la PR #504) — un critère de **test**, pas un critère de **task**. Sortie : **13 tasks** (MAQ-15A → MAQ-25), plus MAQ-26 pour un P1 reporté. Sur les deux jours, **29 PRs à 36 minutes machine et 4 touches humaines chacune, quel que soit leur contenu** : le coût d'une task est sa cérémonie, pas son contenu.

Rejeu des 13 tasks sous la règle « même groupe de fichiers touchés ⇒ même task », sur le champ `**Files:**` réel de chaque bloc (`Ziggy/TASKS.md`, lu le 2026-09-15) :

| Groupe | Remarques | Fichiers (sources + tests) |
|--------|-----------|----------------------------|
| **Tunnel de questions** — `parcours.ts`, `gouts.ts`, `actes.ts` | MAQ-15A, 16, 17, 19A, 22, 24, 25 | 6 |
| **Page publique + résultat** — `main.public.ts`, `resultat.ts`, `public.html`, `journee.ts` | MAQ-15B, 19B, 21 | 6 |
| **Saveurs** — `gouts.ts` + page | MAQ-18 | 3 |
| **Moteur seul** — `engine/ration/src/portions.ts` | MAQ-23 | 2 |
| **Moteur à cheval sur l'écran** — `portions.ts` + `parcours.ts` + `main.public.ts` | MAQ-20 | 4 |

**13 → 5 tasks. 8 PRs évitées, 32 touches humaines évitées, ~4 h 48 de machine** (8 × 36 min). Aucun groupe ne dépasse la grille M (`≤7` fichiers, `≤1200` lignes) : le plus large en tient 6. Les deux dernières lignes sont la raison d'être de l'**exclusion moteur/écran** — sans elle, MAQ-20 et MAQ-23 tombaient dans les groupes d'écran par leurs fichiers `playground/`, et le moteur de ration se serait fait modifier dans une task d'habillage.

Trois confirmations du rejeu, à garder :
1. **Le regroupement se fait par groupe de fichiers, pas par fichier isolé.** MAQ-16 (`parcours` + `gouts`) et MAQ-19A (`parcours` + `actes`) n'ont aucun fichier commun deux à deux, mais tiennent dans le même groupe par `parcours.ts`. Découper par fichier unique aurait rendu 8 tasks, pas 5.
2. **Le regroupement transitif est un piège — mesuré, pas supposé.** Fermeture transitive calculée sur les `Files:` réels : les 13 tasks forment **une seule composante connexe** (8 fichiers sources), donc **une task unique hors grille M** par le seul compte de fichiers (8 > 7). Le pont est `gouts.ts`, qui touche `parcours.ts` (MAQ-15A) ET `main.public.ts` (MAQ-18), puis `portions.ts` par MAQ-20. C'est le **fichier porteur** de la remarque qui décide du groupe, **jamais** la fermeture transitive.
3. **Erreur de l'énoncé de T214, corrigée ici** : son `Context:` annonce « quatre tasks dans `parcours.ts` seul (MAQ-17, 22, 24, 25) ». MAQ-25 touche `actes.ts`, **pas** `parcours.ts` — trois tasks seulement sont dans `parcours.ts` seul. MAQ-25 rejoint malgré tout le groupe 1 (`actes.ts` y voyage avec `parcours.ts` via MAQ-15A et 19A) : le compte final de 5 est inchangé.

## §5.1quater Task de rattrapage — la lecture d'abord

Occurrence fondatrice, KONBINI T165 (2026-08-19, une après-midi perdue). La spec ordonnait de combler « 10 jours manquants » de l'historique Google Ads. Ces 10 jours **avaient déjà été rattrapés 20 jours plus tôt** et étaient revenus vides : aucune campagne vidéo ne tournait. Trois défauts enchaînés, tous côté spec :

1. **Témoin bâti sur une table secondaire.** Le « manquant » était défini comme *pas de ligne vidéo ET pas de partition dans la table de DIMENSION*. Or un run de backfill DTS n'écrit **que les tables de faits** — la dimension n'a aucune partition sur 61 jours qui portent pourtant de la donnée. Le témoin ne pouvait structurellement jamais virer au vert pour un jour rattrapé par backfill.
2. **Comptage de lignes au lieu de présence.** Un `COUNT(*) GROUP BY date` ne voit pas un jour à 0 ligne (0 ligne = 0 groupe) : « vide » y est indistinguable de « jamais chargé ». La distinction est pourtant TOUT le sujet d'un rattrapage.
3. **Sémantique du geste affirmée sans preuve.** Le run-intent écrivait « un backfill AJOUTE des partitions manquantes, il n'écrase aucune valeur ». Faux : il réécrit la partition. Sans conséquence ce jour-là (vide → vide) mais un backfill sur un jour peuplé dont l'API ne rend rien l'aurait **vidé**.

Ce qui a tranché : **une requête en lecture seule sur `INFORMATION_SCHEMA.PARTITIONS`** (présence de la partition + `last_modified_time`), trois secondes, zéro mutation. Elle montrait les dates d'écriture des 29-30/07 et refermait le sujet. Elle est arrivée APRÈS le backfill parce que la spec prescrivait l'ordre « mesurer avec ce témoin → agir → re-mesurer ».

Coût réel : une mutation sur l'entrepôt d'un client sur prémisse fausse, 3 h 30 d'attente de runs inutiles, et l'écrasement du `last_modified_time` de 2 partitions sur 10 — c'est-à-dire la **destruction de la preuve directe** utilisée pour les 8 autres. L'assert Smoke, bâti sur le témoin faux, était insatisfiable par construction : gate rouge que le runner ne pouvait pas corriger sans arbitrage humain.

## §6 `reviewLevel: opus` écrit pour les M · §5.3 Done recopié · décision nommée ou exploratoire (T230, REX jeu concours 2026-10-02)

Source : `~/.ziggy-data/jeu-concours-celine/livrables-2026-10-02/rex-shikamaru-temps-doubles.md`, chaîne JCC du 01-02/10 (10 h 25 de runner pour 4 h 17 de premier passage, × 2,4).

- **Cause 6 — `standard` sur des M.** Le Speccer n'écrivait le niveau que pour XS (`skip`) et S (`standard`) : l'intent `run-2026-10-01-001` a lancé 6 tasks M en `standard`, niveau qui ne boucle pas. Résultat : 4 `needs_review`, 4 tasks de correction JCCF dédiées, 18 min d'arrêt de chaîne, 75 min d'attente pour la chaîne RV voisine. Les intents RV et BTQ, en `opus`, ont corrigé en session — 0 `needs_review` sur BTQ.
- **Cause 2 — Done recopié du cadrage.** Le critère du socle JCC-1 recopiait le compte du cadrage (2 367 foyers) : il ne pouvait pas rougir. La clé d'identité était fausse (un champ caché factice partagé par 4 répondants) ; découvert après 6 tasks aval, socle refait pour 2 h 14 (≈ 2 h évitables : le défaut se voyait en 10-15 min dans JCC-1). Une propriété de clé (unicité, lignes max par clé, non-appariés) l'aurait fait rougir.
- **Cause 4 — aucune décision nommée.** JCC-2B (carte des associations) et JCC-3 (typologie) ne nommaient aucune décision dans leur `Context` et n'en ont changé aucune : 1 h 53 avec leurs corrections (dont 30 min de veto). Départage : JCC-2C et JCC-3B nommaient une décision, et en ont servi une. Le signal existait à la spec. Pas de nouveau champ obligatoire : on resserre le « pourquoi » déjà exigé, le marqueur `**Exploratoire:** oui` n'étant que le repli. La garde de consommation existe parce que JCC-3B et JCC-7 ont réutilisé la typologie comme axe de profil : un exploratoire non corrigé ne doit pas fonder une décision.


## §6 Premier résultat seul en `ready` · runner : « fini » = vérifié sur le résultat intégré (T232, REX jeu concours 2026-10-02)

- **Dix tasks M spécifiées d'un coup.** L'objectif jeu concours a été découpé en 10 M avant qu'aucun résultat n'existe. Deux d'entre elles — la typologie (JCC-3) et la carte des 555 associations (JCC-2B) — n'ont changé aucune action : 1 h 53 avec leurs corrections. Spécifier les approfondissements APRÈS observation du premier résultat les aurait laissés en `backlog`, d'où ils ne seraient sortis que si le premier résultat les réclamait. Le statut `backlog` existe déjà : aucun statut créé.
- **« C'est fini » annoncé trop tôt.** Sur le calculateur Ziggy, le travail a été annoncé fini avant le parcours complet ; c'est ce parcours qui a trouvé CV2-8. Les preuves par task (§d.0) étaient vertes : aucune ne prouvait l'assemblage. D'où, côté runner, le rejeu de §d.0 sur le résultat intégré à la clôture d'objectif (§1.4) et l'état réalisé · vérifié · mergé · servi dans la ligne d'objectif du résumé (§4).

## §4.5 Critique du plan par Codex au lieu du classifieur de taille (T233, REX jeu concours 2026-10-02)

- **Dix M spécifiées à 10 h 13.** L'objectif jeu concours est sorti du Speccer en 10 tasks M ; une partie n'a changé aucune décision (typologie, carte des 555 associations : 1 h 53 avec leurs corrections, cf. §6 ci-dessus). Aucun contrôle de l'étape 4.5 ne pouvait le voir.
- **Un classifieur à sortie unique.** Q0-Q3 ne jugeaient que la taille (fichiers, lignes, « nouvelle abstraction ») : leur seule sortie possible était « scinder », jamais « inutile », « plus simple » ou « à regrouper ». Depuis le lot A (`shika-run.md` §1.4), un gros travail n'a plus à être scindé pour tenir dans une PR — c'est un objectif à plusieurs étapes sur une seule branche. Le rejet L n'avait plus d'objet ; le tier ne sert plus qu'à choisir le niveau de review.
- **Point faible assumé : deux modèles peuvent surspécifier ensemble.** D'où un seul échange (pas de négociation qui converge vers le plan le plus gros), le droit écrit de RETIRER, FUSIONNER, REPORTER, et l'interdiction écrite d'AJOUTER.
- **Décision que le résultat change** : garder ou retirer la critique après les 3 premiers plans critiqués, en comptant les tasks retirées ou fusionnées (`speccer-log.json`, `mode: "plan-critique"`).
