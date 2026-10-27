---
name: plan-critique
description: "Prompt Codex et contrat de sortie de la critique du plan — chargé par le Speccer à l'étape 4.5 uniquement (plan de 3 tasks ou plus, ou brief ambigu). Ne PAS lire au démarrage d'une session."
---
# Critique du plan — prompt Codex (un seul échange)

Le Speccer remplit les deux blocs `{…}`, écrit le tout dans `/tmp/plan-critique-{runId}.prompt`, et l'envoie tel quel à `codex exec` (étape 4.5). Rien d'autre dans le prompt : ni auto-évaluation du Speccer, ni justification du découpage.

```
Tu critiques un plan de travail AVANT son exécution. Tu ne lis aucun fichier : tout est ci-dessous.

BRIEF :
{brief verbatim : quoi · pourquoi · plus petite forme · ce qu'on ne fait pas · comment on saura}

PLAN (une entrée par task) :
{pour chaque task : ID — titre · Goal · Files · Done · Depends · Tier}

Réponds à six questions, sur le plan entier :
1. Chaque task est-elle nécessaire pour l'objectif du brief ?
2. Existe-t-il une voie plus simple pour le même résultat ?
3. Quelles tasks regrouper ?
4. Dans quel ordre les exécuter ?
5. Quelles hypothèses du plan sont fragiles ?
6. Quel test, joué tôt, tranche entre continuer et s'arrêter ?

Tes droits, écrits ici pour que tu les prennes :
- RETIRER une task qui ne change aucune décision ni aucun résultat ;
- FUSIONNER une task dans une autre ;
- REPORTER une task au backlog, à ne reprendre qu'après observation du premier résultat ;
- proposer une EXPLORATION courte d'abord (dans PLUS SIMPLE ou TEST DÉCISIF), quand une hypothèse fragile doit être levée avant d'engager le plan.
INTERDIT : AJOUTER une task. Une proposition d'ajout sera ignorée.
Retirer est un résultat normal : un plan plus court qui atteint l'objectif vaut mieux qu'un plan complet.

FORMAT DE SORTIE — exactement ceci, rien avant, rien après :
Une ligne par task du plan, dans l'ordre du plan :
Tx GARDER — raison
Tx RETIRER — raison
Tx FUSIONNER→Ty — raison
Tx REPORTER Ty — raison (Ty = la task dont le résultat décide de la reprise)
Puis, une ligne chacune :
ORDRE: Tx, Ty, …
PLUS SIMPLE: une phrase, ou « rien »
HYPOTHÈSES FRAGILES: Tx — hypothèse ; …, ou « aucune »
TEST DÉCISIF: Tx — le test et ce qu'il tranche, ou « aucun »
Dernière ligne, seule : PLAN_OK si toutes les tasks sont GARDER dans l'ordre du plan, sinon PLAN_REVU
```

## Lecture de la sortie (côté Speccer)
- **Valide** = une ligne `Tx VERDICT — raison` par task du plan, et dernière ligne non vide égale à `PLAN_OK` ou `PLAN_REVU`. Sinon → sortie invalide : repli sans critique (étape 4.5).
- Ligne d'ajout (task inconnue du plan) → ignorée, recopiée dans le bloc « Critique Codex » comme « ajout ignoré ».
- Toutes les tasks en `RETIRER` → ne rien appliquer, afficher la critique, demander à Loïc (seule question de l'étape).
