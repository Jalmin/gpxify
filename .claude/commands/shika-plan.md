---
name: shika-plan
description: "Rituel du lundi outillé — scan du portefeuille, confrontation jalon vs réalité, triage des quêtes avec verdicts écrits dans les QUESTS.md. UTILISER QUAND: rituel hebdo, arbitrage de portefeuille, ou mots-clés 'rituel', 'portefeuille', 'quêtes', 'top-3', 'on fait quoi cette semaine'."
---

# /shika-plan

Rituel de portefeuille. Le scan mesure, **le user tranche** : ce skill n'arbitre jamais à sa place, il pose les questions dans le bon ordre et écrit les verdicts.

**v1 = manuel outillé** (décision verrouillée 2026-08-13). Aucune automatisation, aucun cron, aucun commit — le rituel s'exécute quand le user le lance.

## Hard rules

| Règle | Portée |
|-------|--------|
| **ALWAYS** 1 question à la fois, reco en 1ère position suffixée `(Recommended)` | étapes 2 et 3 |
| **ALWAYS** verdicts écrits SEULEMENT après confirmation explicite | étape 4 |
| **NEVER** de commit ni de push dans les repos scannés | étape 4 |
| **NEVER** prolonger une quête par défaut — prolonger est une décision explicite | étape 3 |
| **NEVER** toucher autre chose que les `QUESTS.md` (ni TASKS.md, ni code) | tout le rituel |

Afficher chaque étape avec son marqueur `[ETAPE X/4]`.

---

## [ETAPE 1/4] Scan

`npx tsx ~/Projects/shikamaru/scripts/portfolio-scan.ts` — même pattern d'invocation source-repo que `archive-done-tasks.ts` (étape 0 du speccer) : le script vit dans le repo Shikamaru, il est lancé depuis n'importe quel cwd.

Afficher la sortie **telle quelle** (état par repo, ratio de flux, drapeaux). Elle est en lecture seule.

| Situation | Comportement |
|-----------|-------------|
| Script introuvable | « Rituel à lancer depuis une machine avec `~/Projects/shikamaru`. » puis **STOP propre** — pas de crash, pas de rituel dégradé silencieux |
| Script présent mais échoue (exit ≠ 0, sortie vide) | Annoncer l'échec en 1 ligne, puis **mode dégradé** : demander au user l'état à la main (quêtes vivantes, jalons) et continuer le rituel. Un scan cassé ne bloque JAMAIS le rituel |

## [ETAPE 2/4] Confrontation — jalon vs réalité

Pour **chaque quête vivante** (hors `flux` : un service continu n'a pas de jalon de fin), confronter le jalon annoncé à ce que le scan mesure.

Deux natures de signaux, à ne pas mélanger :

| Signal | Origine | Traitement |
|--------|---------|-----------|
| Circuit breaker (jalon daté dépassé) | mécanique, calculé par le scan | **relayé tel quel**, pas de re-jugement |
| WIP > 3 chantiers vivants | mécanique (portefeuille entier, `flux` et `fond` exclus) | **relayé tel quel** — c'est une question, pas une interdiction |
| Dérive du ratio de flux (spec-ées ≫ livrées) | mécanique, seulement sur les semaines où le dénominateur existe | **relayé tel quel** ; `N/0` n'est pas une dérive, c'est une absence de mesure |
| « 2 rituels sans progrès » | **jugement humain** — le scan ne le calcule pas | **question posée au user** : « Q{n} a-t-elle avancé depuis le dernier rituel ({lastRitual}) ? » |

Sortie de l'étape : la liste des quêtes **flaggées**, chacune avec le signal qui l'a flaggée.

**Aucune quête flaggée → rituel court** : afficher l'état, faire confirmer le top-3 de la semaine, fin. Pas de triage à vide.

## [ETAPE 3/4] Triage

Pour chaque quête flaggée, **une question, un verdict**. Jamais deux quêtes dans la même question.

| Verdict | Sens | Ce qui est écrit |
|---------|------|------------------|
| **prolonger** | on continue, avec un jalon re-daté | `**Statut:** vivante` + `**Jalon:**` mis à jour (une prolongation sans nouvelle date reconduit le problème) |
| **pause** | on arrête pour l'instant, avec une condition de réveil | `**Statut:** pause — réveil : {date ou condition}` |
| **geler** | on n'y touche plus, sans date de retour | `**Statut:** gelée` |
| **tuer** | la quête est close, elle ne reviendra pas | `**Statut:** morte` |

Règles de formulation :
- 1 question = 1 quête, reco en **1ère option** suffixée `(Recommended)`.
- La reco se déduit du signal : circuit breaker → `pause` ou `prolonger` avec nouveau jalon ; 2 rituels sans progrès → `pause` ; WIP > 3 → mettre en `pause` la quête la moins engagée, pas la plus récente par réflexe.
- **Respecter le WIP 2-3 chantiers** sur tout le portefeuille : si le triage laisse plus de 3 chantiers vivants, le dire et poser la question de la quête à sortir.
- Un verdict `prolonger` sur une quête déjà prolongée au rituel précédent : le signaler (« 2ᵉ prolongation »), ne pas le refuser.

**User interrompt en cours de triage** → les verdicts déjà confirmés sont écrits (étape 4 sur ce sous-ensemble), le reste des quêtes reste **inchangé**. L'état est cohérent quête par quête, jamais à moitié écrit.

## [ETAPE 4/4] Écriture des verdicts

Après confirmation explicite du user, et **seulement** pour les quêtes tranchées :

1. Mettre à jour le `**Statut:**` de chaque quête concernée dans son `QUESTS.md` (+ `**Jalon:**` si le verdict est `prolonger`).
2. Mettre `lastRitual: {date du jour}` dans le frontmatter de **chaque** QUESTS.md touché.
3. Lister les repos modifiés, chemin par chemin.
4. **STOP.** Pas de `git add`, pas de commit, pas de push, pas de PR. Les fichiers restent modifiés dans leurs repos — le user commit s'il le veut, quand il le veut.

Toute écriture hors `QUESTS.md` (TASKS.md, code, config) : **demander d'abord**, ce n'est pas le périmètre du rituel.

## Portée

- ✅ **Always** : reco explicite en 1ère option · verdicts écrits après confirmation seulement · `lastRitual` mis à jour sur les fichiers touchés
- ⚠️ **Ask first** : toute écriture hors `QUESTS.md`
- 🚫 **Never** : commit/push automatique dans les repos · automatisation cron (v1 = manuel, verrouillé) · prolonger une quête sans décision explicite

## Voir aussi

- `references/quests-schema.md` — dialecte QUESTS.md (statuts, réveil, chantier vs flux, WIP)
- `scripts/portfolio-scan.ts` — le scan (lecture seule, 12 repos, ~2 s)
- `scripts/lib/quests-parser.ts` — parser de référence
