# Learning Log

> Journal des découvertes, optimisations et leçons apprises.
> **Format** : Entrées chronologiques inversées (plus récent en haut)

---

## 2026

### [2026-01-26] Analyse complète du projet et remplissage .claude/

**Catégorie** : Documentation

**Découverte** :
Analyse automatique du codebase pour remplir `.claude/` avec le contexte réel extrait du code.

**Points clés identifiés** :
- Rate limiting désactivé sur `/share/save` (share.py:18) - à réactiver
- Migrations Alembic non exécutées en production (Dockerfile:33-34)
- TODO non résolu : rate limiting par IP (share.py:64)
- Google OAuth partiellement configuré mais pas implémenté

**Stack détectée** :
- Frontend: React 18.3, TypeScript 5.6, Vite 5.4, TailwindCSS 3.4, Zustand 5.0
- Backend: FastAPI 0.115, Python 3.11, SQLAlchemy 2.0, PostgreSQL
- Tests: Vitest 2.1 + pytest 8.3 avec coverage
- Deploy: Docker multi-stage + Coolify sur gpx.ninja

**Action** :
- Fichiers `.claude/` remplis avec données réelles
- Points d'attention documentés dans CLAUDE.md section 10

---

### [2026-01-26] Initialisation du dossier .claude/

**Catégorie** : Documentation

**Découverte** :
Mise en place de la structure `.claude/` pour maintenir le contexte projet avec Claude Code.

**Impact** :
- Contexte projet toujours disponible
- Conventions documentées
- Commandes custom définies

**Action** :
Maintenir et mettre à jour régulièrement les fichiers de contexte.

---

<!-- Template pour nouvelles entrées -->

### [YYYY-MM-DD] Titre de la Découverte

**Catégorie** : [Bug Fix | Optimization | Architecture | Tool | Pattern | Security]

**Découverte** :
[Description de ce qui a été appris]

**Contexte** :
[Situation qui a mené à cette découverte]

**Impact** :
- [Conséquence 1]
- [Conséquence 2]

**Code/Exemple** (si applicable) :
```typescript
// Avant
const old = ...

// Après
const new = ...
```

**Action** :
[Ce qu'on fait suite à cette découverte]

**Références** :
- [Lien documentation]
- [Issue liée]

---

## Index par Catégorie

### Bug Fixes
- [Date] - [Titre] - [Lien](#)

### Optimizations
- [Date] - [Titre] - [Lien](#)

### Architecture Decisions
- [Date] - [Titre] - [Lien](#)

### Tools & Workflows
- [Date] - [Titre] - [Lien](#)

### Security
- [Date] - [Titre] - [Lien](#)

---

## Insights Récurrents

<!--
Patterns qui reviennent souvent - à transformer en règles ou best practices
-->

### Performance
- [ ] [Pattern identifié]

### Code Quality
- [ ] [Pattern identifié]

### DevOps
- [ ] [Pattern identifié]
