---
title: Init Archetypes
role: 3 archétypes de structure projet pour /shika-init
description: Spec des 3 archétypes (monolithe-simple / monolithe-layered / modular-monolith). Consulté par shika-init à l'étape 2.5 pour choisir le scaffolding adapté à la complexité du projet.
---

# Init Archetypes

Quand `/shika-init` bootstrap un projet, l'archétype détermine la **structure de fichiers** générée et les **conventions** appliquées par les autres skills (Speccer, Runner) ensuite.

> **Pattern "version meta du Speccer hybride"** (insight user 2026-05-03) : tier des TASKS (XS/S/M/L) au niveau task, archétypes (simple/layered/modular) au niveau projet. Même principe à 2 niveaux.

---

## Vue d'ensemble

| Archétype | Quand l'utiliser | Structure |
|-----------|------------------|-----------|
| **monolithe-simple** | 1 module clair, 1-2 fichiers, scope défini | flat |
| **monolithe-layered** | logique + UI, ou backend + frontend, séparation horizontale | layers fonctionnels |
| **modular-monolith** | 3+ modules indépendants, capable de planter isolément | `subprojects/X/` |

---

## Archétype 1 — Monolithe simple

### Quand
- Le projet a 1 module clair, scope défini
- 1 à 2 fichiers source principaux
- Pas de séparation backend/frontend
- Total estimé < 500 LOC à terme

### Exemples
- Script CLI Python qui parse un CSV et envoie en API
- Microservice unique (fonction Lambda, endpoint Cloud Run)
- Parser one-shot
- Outil de scrape ad-hoc
- Wrapper d'API (1 fichier exposant N méthodes)

### Structure générée

```
{project}/
├── CLAUDE.md
├── TASKS.md
├── AGENTS.md
├── README.md
├── package.json (ou pyproject.toml, requirements.txt, etc.)
├── src/
│   └── main.{py,ts,js}
└── tests/
    └── test_main.{py,ts,js}
```

### Convention

- Pas de sous-dossiers complexes
- 1 seul TASKS.md
- Speccer/Runner opèrent sur tout le projet (pas de scope réduit)

---

## Archétype 2 — Monolithe layered

### Quand
- Logique + UI (fullstack)
- Backend + frontend séparés
- App + lib réutilisable
- Total estimé 500-5000 LOC

### Exemples
- App Next.js fullstack (frontend + API routes)
- App mobile + API backend
- Dashboard admin avec tests
- SaaS one-tenant (Next.js + Postgres)

### Structure générée

```
{project}/
├── CLAUDE.md
├── TASKS.md
├── AGENTS.md
├── README.md
├── package.json
├── src/
│   ├── components/   (UI components)
│   ├── lib/          (logique métier)
│   ├── api/          (endpoints, si backend)
│   └── pages/        (Next.js pages, si applicable)
├── tests/
│   ├── unit/
│   └── e2e/
└── docs/
    └── architecture.md
```

### Convention

- Layers clairement séparés (UI / lib / API)
- 1 seul TASKS.md (le projet est encore une unité)
- Tests groupés par type (unit / e2e / integration)

---

## Archétype 3 — Modular monolith

### Quand
- 3+ modules indépendants identifiables
- Capable de planter isolément (test : "si X plante, est-ce que Y et Z continuent ?")
- Pipelines avec étapes distinctes
- Total estimé > 5000 LOC ou >10 fichiers principaux

### Exemples
- Pipeline B2B prospection (POOOL : enrichissement + matching + diffusion)
- CRM avec features distinctes (contacts + deals + reports)
- Outil de scrapping multi-sources (chaque source = un module)
- Dashboard agrégeant plusieurs services

### Test discriminant

> **"Si le module X plante, est-ce que les autres continuent ?"**
>
> - **OUI** → modular justifié
> - **NON** → monolithe layered suffit (couplage trop fort)

### Structure générée

```
{project}/
├── CLAUDE.md                  (overview global)
├── ROADMAP.md                 (Now/Next/Later cross-modules)
├── README.md
├── package.json (root, deps partagées)
├── shared/                    (data models, utils communs)
│   └── types/
└── subprojects/
    ├── {module1}/
    │   ├── CLAUDE.md          (overview module)
    │   ├── TASKS.md           (tasks du module)
    │   ├── AGENTS.md          (learnings du module)
    │   └── src/
    ├── {module2}/
    │   ├── CLAUDE.md
    │   ├── TASKS.md
    │   ├── AGENTS.md
    │   └── src/
    └── {module3}/
        └── ...
```

**Note importante** : pas de TASKS.md à la racine sauf si nécessaire (cross-cutting). Le ROADMAP.md root reste comme vue produit globale.

### Convention

- 3+ sous-projets minimum (sinon prendre layered)
- Chaque sous-projet a SES propres TASKS/CLAUDE/AGENTS
- TASKS.md root UNIQUEMENT pour cross-cutting (ex: refacto qui touche les 3 modules)
- Speccer/Runner détectent automatiquement le scope (cf. T111)
- Imports cross-modules limités (>5 par paire = mauvais découpage, signal de re-fragmentation)

---

## Algorithme de classification (pour shika-init étape 2.5)

```
Q1: Combien de modules indépendants identifiables ?
    1 → continue Q2
    2 → monolithe-layered
    3+ → continue Q3 (validation modular)

Q2: Le projet a-t-il une séparation horizontale (UI/logique, frontend/backend) ?
    OUI → monolithe-layered
    NON → monolithe-simple

Q3: Test discriminant — Si le module X plante, est-ce que Y et Z continuent ?
    OUI → modular-monolith
    NON → monolithe-layered (couplage trop fort)
```

---

## Promotion entre archétypes

Un projet peut **évoluer** d'un archétype à un autre :

| De | Vers | Quand |
|----|------|-------|
| monolithe-simple | monolithe-layered | Le projet grossit, séparation devient nécessaire |
| monolithe-layered | modular-monolith | Modules indépendants émergent (POOOL : 3 phases du pipeline qui peuvent planter isolément) |
| modular-monolith | (rester) | Continue à grossir mais reste modular ; nouveaux modules ajoutés dans subprojects/ |

**Outil de migration** : `/shika-migrate` (voir T112) pour passer monolithe → modular sans perdre l'historique.

---

## Anti-patterns

| Anti-pattern | Pourquoi refuser |
|--------------|------------------|
| Modular avec <3 modules | Crée de la complexité sans bénéfice. Layered suffit. |
| Modular avec couplage fort entre modules | Les modules ne sont pas vraiment indépendants. Layered est plus honnête. |
| Subprojects/ implicite (créé par accident) | Toujours via shika-init ou shika-migrate, jamais à la main. |
| 2+ niveaux de subprojects/ (subprojects/X/subprojects/Y) | Modular ne supporte qu'1 niveau de profondeur. Si besoin, créer un nouveau projet séparé. |
| TASKS.md root rempli en modular | Le tactical descend dans les sous-projets. Root réservé au cross-cutting. |

---

## Default si ambiguïté

Si l'user choisit "je-sais-pas" et que les questions de clarification ne tranchent pas → default = **monolithe-layered**.

C'est le plus flexible : peut être promu vers modular plus tard via `/shika-migrate`, ou simplifié en simple si surdimensionné.

---

*Source : insight user 2026-05-03 ("version meta du Speccer hybride") + research Sprint 0 12.B (modular monolith comme pattern pour projets qui s'écroulent).*
