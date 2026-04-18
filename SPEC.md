---
schemaVersion: 1
project: GPXIFY
type: fullstack
lastUpdated: 2026-04-18
---

# SPEC.md — GPXIFY

## Overview

Plateforme d'analyse GPX pour sports d'endurance (trail, ultra, randonnee). Permet aux athletes d'analyser leurs traces GPX avec profils d'altitude, statistiques detaillees, fusion de traces, et tables de ravitaillement calculees automatiquement. Inclut une feature roadbook imprimable (PTP — Profile to Print) pour les courses de trail.

Application full-stack (SPA React + REST API FastAPI), deployable en Docker sur Coolify, utilisation anonyme possible (pas d'auth obligatoire).

## Stack

### Frontend (`/frontend/`)
- React 18.3 (functional components + hooks)
- TypeScript 5.6 (strict mode)
- Vite 5.4 (build tool)
- TailwindCSS 3.4 (styling, dark mode via classe)
- Zustand 5.0 (state global)
- Leaflet 1.9 (cartographie)
- Chart.js 4.5 (graphiques)
- Axios 1.7 (HTTP client)
- React Router 7.9
- Vitest 2.1 (testing)

### Backend (`/backend/`)
- Python 3.11
- FastAPI 0.115
- SQLAlchemy 2.0 (async)
- PostgreSQL + Alembic 1.13 (migrations)
- gpxpy 1.6.2 (parsing)
- Pydantic 2.5 (validation)
- SlowAPI 0.1.9 (rate limiting)
- pytest 8.3 (testing)

### Infrastructure
- Docker multi-stage
- docker-compose
- Nginx Alpine (reverse proxy, security headers)
- Coolify-compatible

## Fonctionnalites

### Analyse GPX (core)
- Upload GPX + parsing (10MB max, gpxpy)
- Profils d'altitude synchronises carte
- Statistiques : distance, D+/D-, pente moyenne, temps estime (Naismith)
- Multi-traces : upload et analyse simultanee
- Fusion GPX : drag-and-drop, detection automatique des gaps
- Detection des montees (climb segments)
- Export segments en .gpx

### Tables de ravitaillement
- Calcul auto des segments entre ravitos
- 3 modes de calcul (enum `calc_mode`, cf T9) :
  - `naismith` — formule trail running par defaut (12 km/h + 5min/100m D+)
  - `constant_pace` — allure constante km/h unique
  - `trail_planner` — 4 parametres configurables (plat, penalite montee, bonus descente, fatigue lineaire). Preset "Trail moyen".
- Export de la table

### Partage anonyme
- Liens uniques `/s/{share_id}`
- Expiration 30 jours
- Pas d'auth requise
- Rate limit 10/minute (share.py:18)

### PTP — Profile to Print (sprint termine 2026-01-27)
- **Admin** (`/admin/{secret}`) : gestion courses, upload GPX, parsing ravitos via Claude Haiku, publication
- **Public** (`/roadbook`) : selection course, config (heure depart, flasques, allure, nutrition), profil enrichi (markers km + temps + soleil), export PDF A4 paysage (Coureur + Assistance)

## Modele de donnees

### Tables principales (SQLAlchemy)
- `share_link` — partages anonymes (id, share_id, track_data JSONB, expires_at)
- `race` — courses PTP (slug, nom, gpx, statut publie)
- `race_aid_station` — ravitos d'une course (km, nom, cutoff, services)
- `admin_settings` — config admin (hash password)

### Indexes critiques
- `idx_share_link_expires_at` (purge auto)
- `uniq_share_link_share_id` (lookup public)

## API

Base URL : `/api/v1/`

Endpoints principaux :
- `POST /gpx/upload` (30/min)
- `POST /gpx/merge` (10/min)
- `POST /gpx/detect-climbs`
- `POST /gpx/export-segment`
- `POST /gpx/aid-station-table` (20/min)
- `POST /share/save` (10/min) | `GET /share/{id}` | `DELETE /share/{id}`
- `POST /contact`
- Admin PTP : `/admin/login`, `/admin/races` (CRUD), `/admin/parse-ravito-table`
- Public PTP : `GET /races`, `GET /races/{slug}`, `POST /ptp/sun-times`
- Health : `GET /health`

Documentation auto : `/docs` (Swagger), `/redoc`.

## Integrations externes

- **Anthropic Claude Haiku** — parsing tableau ravitos (admin PTP)
- **sunrise-sunset.org** — calcul lever/coucher soleil (PTP)
- **Sentry** — monitoring erreurs prod (plan Developer, voir Observabilite)
- **Google OAuth** — partiellement configure, pas implemente
- **Google Drive** — Phase 2, commente dans `gpx.py`

## Observabilite (planifie T3.1 -> T3.4)

### Stack
- **Sentry Developer** (gratuit) — erreurs + perf tracing
- Frontend : `@sentry/react` dans `main.tsx`, wire a `ErrorBoundary`
- Backend : `sentry-sdk[fastapi]` init dans `main.py`
- Actif uniquement si `ENVIRONMENT=production` ET `SENTRY_DSN` defini

### Sampling
- 100% erreurs (exceptions non catchees)
- 5% perf tracing (`tracesSampleRate=0.05`)

### PII scrubbing (GDPR — obligatoire)
- Strip IPs completes
- Strip body des requetes `/gpx/*` et `/share/*`
- denyList : `lat`, `lon`, `elevation`, `track_data`, `points`
- Strippe aussi des breadcrumbs

### Release tracking
- `release=<sha>` injecte au build (Vite : `VITE_APP_VERSION`, backend : env `SENTRY_RELEASE`)
- `environment=production` tag

Voir `DECISIONS.md` (2026-04-18 — T3 Sentry) et `docs/OBSERVABILITY.md` (a creer en T3.4).

## Edge cases identifies

- Fichiers GPX volumineux (>5MB) : chunking UI pour eviter freeze
- Fichiers GPX avec 1 seul point ou coordonnees limites
- Traces multi-segments avec gaps temporels (fusion)
- Elevation negative / aberrante (quality filter `utils/elevation_quality.py`)
- Partages expires (retention 30j, purge via job)
- Rate limit depasse : reponse 429 avec `retry_after`
- Parsing tableau ravitos non standard (Claude Haiku fallback)

## Securite & GDPR

- Donnees personnelles : traces GPX = geolocalisation (retention 30j max)
- Pas de tracking invasif, pas d'auth obligatoire
- Rate limiting SlowAPI sur endpoints sensibles
- CORS restrictif (domaines prod uniquement)
- Security headers via Nginx (X-Frame-Options, CSP, etc.)
- Secrets via `.env`, jamais commit
- Validation stricte Pydantic sur tous inputs
- Masquage IP dans logs (GDPR)

## Deploiement

- Docker multi-stage (images optimisees)
- docker-compose up -d (stack complete)
- Reverse proxy Nginx
- Coolify-compatible
- Migration Alembic au demarrage (corrige le 2026-01-28, commit 4416684)

### Variables d'environnement critiques
- `DATABASE_URL`
- `SECRET_KEY` (min 32 chars en prod)
- `CORS_ORIGINS`
- `ANTHROPIC_API_KEY` (PTP admin)
- `ADMIN_SECRET_URL`, `ADMIN_PASSWORD_HASH` (PTP)
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` (planifie T3.1)

Voir `.env.example` et `ENV_VARIABLES.md`.

## Etat actuel (2026-04-18)

### Termine
- Sprint core (upload, profils, stats, partage, fusion, aid station)
- Sprint PTP phases 1-8 (backend + frontend complets)
- Rate limiting reactive `/share/save` (2026-01-26)
- Secrets Google OAuth retires de `.env.production.example`
- Migrations Alembic au boot Docker (2026-01-28)

### En cours / priorite
- Augmenter coverage tests (20% → 70%, cible CLAUDE.md)

### Planifie
- Monitoring Sentry (ErrorBoundary.tsx:33, TODO)
- Rate limit par IP pour partages (share.py:64, TODO)
- Google OAuth (completion)
- Upload Google Drive (Phase 2)
- Deploy prod migration PTP

## References

- `ARCHITECTURE.md` — architecture detaillee
- `.claude/CLAUDE.md` — constitution projet
- `.claude/rules/` — regles detaillees (code-style, testing, security, api-design, database, git-workflow)
- `README.md`, `QUICKSTART.md`, `TESTING.md`, `CREDENTIALS.md`
