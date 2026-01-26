# Learning Log

> Journal des découvertes, optimisations et leçons apprises.
> **Format** : Entrées chronologiques inversées (plus récent en haut)

---

## 2026

### [2026-01-26] Implementation Backend PTP (Profile to Print)

**Categorie** : Feature / Architecture

**Decouverte** :
Implementation complete du backend pour la feature "Roadbook imprimable" permettant aux coureurs de trail de preparer leur course avec profil altimetrique enrichi et export PDF.

**Architecture implementee** :

1. **Base de donnees** :
   - Table `races` : stockage GPX + metadonnees course
   - Table `race_aid_stations` : ravitaillements avec km, elevation, type, services
   - Table `admin_settings` : configuration admin
   - Migration Alembic `002_add_ptp_tables.py`

2. **Services** :
   - `race_service.py` : CRUD complet pour les courses
   - `ptp_service.py` :
     - Parsing tableau ravitos via Claude Haiku
     - Integration API sunrise-sunset.org pour lever/coucher soleil

3. **API Endpoints** :
   - Admin (proteges par token) : login, CRUD races, parse-ravito-table
   - Public : liste courses, details par slug, sun-times

**Decisions techniques** :
- Auth admin simple (SHA256 + session token) plutot qu'OAuth
- Claude Haiku pour parsing (cout/performance optimal)
- GPX stocke en TEXT dans PostgreSQL (pas de fichier)
- Rate limiting sur endpoints sensibles

**Fichiers crees** :
```
backend/app/models/race.py
backend/app/models/ptp.py
backend/app/services/race_service.py
backend/app/services/ptp_service.py
backend/app/api/admin.py
backend/app/api/races.py
backend/app/api/ptp.py
backend/alembic/versions/002_add_ptp_tables.py
```

**Impact** :
- Backend pret pour le frontend
- Migration a executer en prod avant deploiement
- Variables env requises : ANTHROPIC_API_KEY, ADMIN_SECRET_URL, ADMIN_PASSWORD_HASH

**Prochaines etapes** :
- Phase 4-5 : Frontend Admin + Public
- Phase 6 : Profil enrichi avec chartjs-plugin-annotation
- Phase 7 : Export PDF avec html2canvas + jsPDF

---

### [2026-01-26] Refactorisation et nettoyage du projet

**Categorie** : Cleanup / Security

**Decouverte** :
Nettoyage complet du projet suite a la cartographie initiale. Corrections de securite et reorganisation des fichiers.

**Actions effectuees** :

1. **Securite CRITIQUE** :
   - Suppression des secrets Google OAuth de `.env.production.example`
   - Credentials reelles remplacees par placeholders

2. **Rate limiting** :
   - Reactivation sur endpoint `/share/save` (10/minute)
   - Etait commente depuis un debug precedent

3. **Organisation fichiers** :
   - Creation dossier `scripts/` pour les scripts shell (4 fichiers)
   - Deplacement `test_merge.py` et fichiers GPX test vers `backend/tests/`
   - Suppression dossier `src/test/` vide (redundant)

4. **Gitignore** :
   - Ajout `Sauvemacourse-test/` (donnees test personnelles)
   - Ajout `improvements/` (documentation obsolete)
   - Ajout templates (`project-template/`, `template-tailwind-css/`)

**Fichiers modifies** :
- `.env.production.example` - Secrets retires
- `backend/app/api/share.py:18` - Rate limit reactive
- `.gitignore` - 4 nouveaux patterns
- `.claude/CLAUDE.md` - Structure mise a jour
- `.claude/rules/*.md` - Status corrections mis a jour
- `.claude/context/cleanup-plan.md` - Plan de nettoyage cree

**Impact** :
- Securite amelioree (pas de credentials dans le repo)
- Structure projet plus propre et documentee
- Base pour les futures ameliorations

---

### [2026-01-26] Analyse complete du projet et remplissage .claude/

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
