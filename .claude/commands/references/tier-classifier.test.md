---
title: Tier Classifier — Tests du pre-classifier
description: Cas de test du pre-classifier rapide (étape 0bis, tier-classifier-fast.md) — regex puis sub-agent light. Exécutables manuellement.
---

## Tests pre-classifier hybride (T146)

> Valide le **pre-classifier rapide** (`tier-classifier-fast.md`, étape 0bis) : heuristique regex d'abord, sub-agent light en fallback. Le classifieur formel de l'étape 4.5 et le rejet L ont été retirés par T233-T234 (2026-10-04) : seuls restent les cas qui ne rendent pas L.

### Comment exécuter

1. Pour chaque cas, appliquer les regex de `tier-classifier-fast.md` **dans l'ordre 1.1 → 1.2 → 1.3** (M, puis XS, puis S) sur le champ `Input`. Premier match gagne, on s'arrête.
2. Aucun match → `null` → lancer le sub-agent light (section 2 du même fichier) et comparer son JSON `{tier, rationale}`.
3. Le test vérifie **deux choses** : le `tier` attendu **et** la `méthode` attendue. Un bon tier obtenu par la mauvaise méthode = **échec** (c'est l'économie de tokens qui est cassée).

### Groupe A — heuristique regex pure (aucun appel sub-agent)

| # | Input | Méthode | Tier | Pattern qui doit matcher |
|---|-------|---------|------|--------------------------|
| A1 | `Fix typo dans README.md` | regex | XS | `\b(typo\|fote\|coquille\|accent)\b` (1.2) |
| A2 | `Refactor auth middleware OAuth2` | regex | M | `\b(refactor\|...)\b` **et** `\b(auth\|oauth\|...)\b` (1.1) |
| A3 | `Migration schema Postgres v2` | regex | M | `\b(migration\|schema\|...)\b` (1.1) |
| A4 | `Ajouter champ téléphone au formulaire contact` | regex | S | `\b(ajouter?\|add) .*\b(champ\|field\|...)\b` (1.3) |
| A5 | `Update date dans footer.html` | regex | XS | `\b(date\|version\|numéro)\b` (1.2) |

### Groupe B — hybride (regex retourne `null` → sub-agent light tranche)

| # | Input | Méthode | Tier | Rationale attendue |
|---|-------|---------|------|--------------------|
| B1 | `Update parser logic for new format` | sub-agent | **méthode seule** | Q1=non (pas de step-by-step). Q3 (>60 lignes, borne T207) n'est **pas** déductible de l'input — « new format » ne dit rien du volume — donc le mapping §2.1 rend `S` (Q3=oui) ou `XS` (Q3=non) selon une estimation que l'input ne porte pas. Ce cas assert donc `method=sub-agent`, **pas** le tier — seul cas du groupe B dans ce régime depuis que T167 a rendu B3 déterministe. L'input n'est PAS modifié : c'est une fixture partagée avec la Section 5 de `tier-classifier-fast.md` (voir « Duplication connue » en bas) |
| B2 | `Implement caching layer for API responses` | sub-agent | M | Q1=oui — nouvelle abstraction à concevoir |
| B3 | `Réécrire la fonction de calcul de TVA d'un seul fichier (~80 lignes) pour appliquer les nouveaux taux fournis` | sub-agent | S | Aucun match 1.1-1.3. La portée est **dans l'input** : Q1=non (taux fournis, aucune conception), Q2=non (« un seul fichier »), **Q3=oui** (« ~80 lignes ») → `S` par la branche `Q1=non ET (Q2 OU Q3)`. Seul cas couvrant Q3 seul |
| B4 | `Extraire la logique de calcul du panier dans un module dédié` | sub-agent | S *(par la règle d'ambiguïté)* | Aucun pattern 1.1-1.3 ne matche (`extraire` n'est pas `refacto`). Q1=non. **⚠️ T207 a déplacé Q2 de « plus d'1 fichier ? » à « plus de 2 fichiers ? »** : les 2 fichiers de cet input (source + nouveau module) répondent désormais **non**, et Q3 (>60 lignes) n'est pas déductible de l'input. Le cas n'est donc plus tranchable — `ambiguity` : *« l'extraction dépasse-t-elle 60 lignes ? »*. Attendu maintenu à `S` par la règle **doute → S**, pas par une branche du mapping |
| B5 | `Passer le délai de cache de 60 à 300 secondes` | sub-agent | XS | Aucun match (`passer` n'est ni `update` ni `mettre à jour`). Q1=non, Q2=non, Q3=non → `XS` — seule branche du mapping non couverte ailleurs |

### Groupe C — cas adversariaux (ce qui ne doit PAS matcher)

Le pre-classifier est du **matching de texte** : sans cas négatifs, on ne teste que la moitié du comportement.

| # | Input | Méthode | Tier | Ce que le cas prouve |
|---|-------|---------|------|----------------------|
| C2 | `refondre le système de paiement` | regex | **M** | C'est `\bsystème\b` (1.1) qui tranche → **M**. Aucun rejet par la taille : un gros travail devient un objectif à plusieurs étapes |
| C3 | `Documenter le système d'authentification dans le README` | regex | M | Faux positif **assumé** : une task de pure doc sort en M sur `système` + `auth`. Biais assumé : il ne coûte qu'un niveau de review plus lourd. Le Speccer prévoit le cas (« Goal contient `auth` mais c'est juste de la doc → demander quand même ») |
| C4 | `Corriger la validation du formulaire` | regex | S | Le signal 1.3 élargi matche désormais `validation`. Ce cas **assert l'élargissement** : s'il repart au sub-agent, la correction T167 a été perdue |
| C5 | `Mettre à jour la documentation` | sub-agent | — | `\b(update\|mettre? à jour) .*\b(date\|version\|valeur\|constante)\b` (1.2) ne matche pas : `documentation` n'est dans aucune liste. « mettre à jour » seul n'est **jamais** un signal XS |
| C7 | `Rename const FOO en BAR dans utils.ts` | regex | XS | Semble ambigu, mais `\b(rename\|renommer\|renomme)\b` (1.2) est déterministe. Ne doit **jamais** atteindre le sub-agent |
| C8 | `Marquer le panier comme invalide après 30 minutes` | sub-agent | — | Borne HAUTE de l'élargissement : `invalide` ne doit **pas** matcher 1.3 (pas de frontière de mot avant `valid`). Un match ici = regex trop large |
| C9 | `Documenter le validateur d'adresse email` | sub-agent | — | Borne HAUTE, seconde forme : `validateur` ne doit **pas** matcher (pas de frontière après `valid`) |

> **C5, C8 et C9 n'assertent pas de tier**, seulement le **non-match** de la regex et le passage au sub-agent. C8 et C9 sont les bornes hautes de l'élargissement T167 : sans elles, on ne teste que la moitié d'un élargissement de regex.

### Récap & cibles — pre-classifier

| Groupe | Cible | Importance |
|--------|-------|------------|
| A (5 cas) | 5/5 par regex, **zéro** appel sub-agent | Critique — c'est l'économie de tokens de T146 |
| B (5 cas) | **5/5 passent par le sub-agent** (`null` en sortie de regex), JSON `{tier, rationale}` valide. Tiers assertés : B2→`M`, B3→`S` (Q3 seul), B4→`S` (par ambiguïté depuis T207), B5→`XS`. **B1 assert la méthode seule** (son tier dépend d'une estimation de lignes que l'input ne porte pas) | Important — couverture réelle du fallback, 2 branches du mapping |

> **Trou de couverture ouvert par T207, à refixturer.** La branche `Q1=non ET Q2=oui` (Q2 **seul**) n'est plus couverte par aucun cas : B4 la couvrait avec 2 fichiers, et le nouveau Q2 (« plus de 2 fichiers ? ») ne se déclenche qu'à partir de 3. Il faudrait un input portant explicitement ≥3 fichiers et peu de lignes. **Ni inventé ni corrigé ici** : changer l'input de B4 serait modifier une fixture pour faire repasser la suite, alors que c'est l'invariant qui a bougé.
| C4 | `S` par regex | **CRITIQUE** — assert que l'élargissement T167 tient |
| C8/C9 | non-match | **CRITIQUE** — bornes hautes, `invalide`/`validateur` hors périmètre |
| C3/C5/C7 | non-match ou piège documenté | Important — bornes connues de l'heuristique |

### Si un test pre-classifier échoue

| Échec | Cause probable | Fix |
|-------|----------------|-----|
| Un cas du groupe A part au sub-agent | Pattern 1.1-1.3 trop étroit ou ordre 1.1→1.3 non respecté | Corriger la regex concernée dans `tier-classifier-fast.md`, jamais dans ce fichier |
| Un cas du groupe B est tranché par la regex (méthode ≠ sub-agent) | Un pattern 1.1-1.3 a été élargi et capture désormais l'input | Vérifier que c'est voulu : le groupe B ne teste plus le fallback si la regex le court-circuite |
| Le sub-agent retourne autre chose que `{tier, rationale}` | Prompt section 2.1 modifié | Restaurer le JSON strict ; sortie invalide → `null`, jamais un tier deviné |
| Sub-agent indisponible / timeout | — | Marquer `skipped` (jamais `failed`) **tout le groupe B (B1-B5)** et **C5/C8/C9** — seuls cas nécessitant le sub-agent pour aboutir. Restent exécutables : tout le groupe A, plus **C2/C3/C4/C7**, tranchés par regex. **C4 doit rester exécutable** : depuis T167 c'est une assertion regex pure, et c'est le seul cas qui protège l'élargissement aux formes fléchies — le skipper reviendrait à désarmer la régression principale de T167 pendant toute panne du sub-agent |

> **Duplication connue.** Les inputs A1-A5, B1-B2 et C7 reprennent la table « Section 5 — Exemples canoniques » de `tier-classifier-fast.md`. Elle y est illustrative (pas de protocole d'exécution, pas de cas négatifs) ; ici elle est exécutable. Les deux listes doivent rester alignées — à la prochaine modification de l'une, collapser vers ce fichier.
