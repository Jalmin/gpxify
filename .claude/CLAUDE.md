# GPXIFY - Claude Code Context

> **Ce fichier est lu automatiquement par Claude Code au démarrage de chaque session.**
> Dernière mise à jour : 2026-01-26

---

## 1. Identité du Projet

| Attribut | Valeur |
|----------|--------|
| **Nom** | GPXIFY |
| **Description** | Plateforme d'analyse GPX pour les sports d'endurance (trail, ultra, randonnée) |
| **Type** | Application full-stack (SPA + REST API) |
| **Statut** | Production-ready |
| **Repository** | Monorepo (frontend + backend) |

### Mission
Permettre aux athlètes d'analyser leurs traces GPX avec des profils d'altitude, des statistiques détaillées, la fusion de traces, et des tables de ravitaillement calculées automatiquement.

---

## 2. Architecture Technique

### Stack Frontend (`/frontend/`)
| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.3 | Framework UI |
| TypeScript | 5.6 | Typage statique |
| Vite | 5.4 | Build tool |
| TailwindCSS | 3.4 | Styling |
| Zustand | 5.0 | State management |
| Leaflet | 1.9 | Cartographie interactive |
| Chart.js | 4.5 | Graphiques d'altitude |
| Axios | 1.7 | Client HTTP |
| React Router | 7.9 | Routing |
| Vitest | 2.1 | Testing |

### Stack Backend (`/backend/`)
| Technologie | Version | Usage |
|-------------|---------|-------|
| FastAPI | 0.115 | Framework API |
| Python | 3.11 | Runtime |
| SQLAlchemy | 2.0 | ORM |
| PostgreSQL | - | Base de données |
| Alembic | 1.13 | Migrations DB |
| gpxpy | 1.6.2 | Parsing GPX |
| Pydantic | 2.5 | Validation |
| SlowAPI | 0.1.9 | Rate limiting |
| pytest | 8.3 | Testing |

### Infrastructure
| Composant | Technologie |
|-----------|-------------|
| Containers | Docker multi-stage |
| Orchestration | Docker Compose |
| Reverse Proxy | Nginx (Alpine) |
| Deployment | Coolify-compatible |

---

## 3. Structure du Projet

```
GPXIFY/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # Composants React
│   │   ├── pages/            # Pages (routing)
│   │   ├── stores/           # Zustand stores
│   │   ├── services/         # API clients
│   │   ├── hooks/            # Custom hooks
│   │   ├── utils/            # Helpers
│   │   └── test/             # Tests Vitest
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── backend/                  # FastAPI API
│   ├── app/
│   │   ├── api/              # Routes API
│   │   ├── services/         # Business logic
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── core/             # Config, auth, utils
│   ├── tests/                # Tests pytest
│   ├── requirements.txt
│   └── Dockerfile
│
├── alembic/                  # Migrations DB
├── docker-compose.yml        # Orchestration
└── docs/                     # Documentation
```

---

## 4. Fonctionnalités Clés

### Analyse GPX
- **Profils d'altitude** : Visualisation interactive synchronisée avec la carte
- **Statistiques** : Distance, D+/D-, pente moyenne, temps estimé
- **Multi-traces** : Upload et analyse de plusieurs fichiers GPX
- **Fusion GPX** : Drag-and-drop, détection automatique des gaps

### Tables de Ravitaillement
- Calcul automatique des segments entre points de ravitaillement
- Formule de Naismith pour estimation des temps
- Export des tables

### Partage
- Liens de partage anonymes
- Expiration automatique à 30 jours
- Pas d'authentification requise pour visualiser

---

## 5. Conventions de Code

### Frontend (TypeScript/React)
- **Nommage fichiers** : `kebab-case.tsx` pour composants, `camelCase.ts` pour utils
- **Composants** : Functional components + hooks, pas de class components
- **State** : Zustand pour global state, useState/useReducer pour local
- **Styling** : TailwindCSS utility classes, pas de CSS custom sauf exceptions
- **Types** : Typage strict, éviter `any`

### Backend (Python)
- **Nommage fichiers** : `snake_case.py`
- **Fonctions** : `snake_case`
- **Classes** : `PascalCase`
- **Type hints** : Obligatoires pour fonctions publiques
- **Docstrings** : Google style pour fonctions complexes
- **Async** : Privilégier async/await pour I/O

### Tests
- **Frontend** : Vitest + React Testing Library
- **Backend** : pytest + pytest-asyncio
- **Coverage minimum** : 70% (paths critiques : 90%)

---

## 6. Commandes Essentielles

### Développement
```bash
# Frontend
cd frontend && npm run dev          # Serveur dev Vite
cd frontend && npm run build        # Build production
cd frontend && npm run test         # Tests Vitest
cd frontend && npm run test:coverage

# Backend
cd backend && uvicorn app.main:app --reload  # Serveur dev
cd backend && pytest                          # Tests
cd backend && pytest --cov=app               # Coverage

# Docker
docker-compose up -d                # Stack complète
docker-compose logs -f backend      # Logs backend
```

### Database
```bash
cd backend && alembic upgrade head           # Appliquer migrations
cd backend && alembic revision --autogenerate -m "description"  # Nouvelle migration
```

---

## 7. Patterns & Anti-Patterns

### ✅ À Faire
- Utiliser les services pour la logique métier (`/backend/app/services/`)
- Valider les inputs avec Pydantic schemas
- Gérer les erreurs avec des exceptions HTTP appropriées
- Utiliser les types TypeScript stricts côté frontend
- Synchroniser le state Zustand avec l'UI de manière réactive

### ❌ À Éviter
- Logique métier dans les routes API (controller trop gros)
- Requêtes SQL directes dans les routes (utiliser l'ORM)
- `any` en TypeScript sauf cas exceptionnels documentés
- Mutation directe du state (utiliser les setters Zustand)
- Console.log en production (utiliser un logger)

---

## 8. Sécurité & GDPR

### Données Personnelles
- **Traces GPX** : Données de localisation = données personnelles
- **Rétention** : Partages expirés après 30 jours
- **Pas de tracking** : Pas d'analytics invasifs
- **Pas d'auth obligatoire** : Utilisation anonyme possible

### Sécurité API
- **Rate limiting** : SlowAPI configuré
- **CORS** : Domaines de production uniquement
- **Validation** : Pydantic sur tous les inputs
- **Headers** : Security headers via Nginx

### Secrets
- **Jamais en code** : Utiliser `.env` (voir `.env.example`)
- **Variables requises** : `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`

---

## 9. Décisions Architecturales Actives

| Décision | Choix | Raison |
|----------|-------|--------|
| State management | Zustand | Plus léger que Redux, API simple |
| ORM | SQLAlchemy 2.0 | Async support, maturité |
| Build tool | Vite | Performance dev, HMR rapide |
| Maps | Leaflet | Open source, extensible |
| Deployment | Docker multi-stage | Images optimisées, portabilité |

---

## 10. Points d'Attention Actuels

### Problèmes Connus
- Rate limiting temporairement désactivé sur `/share/save` (ligne 18 de `share.py`)
- Migrations Alembic skippées en production (voir Dockerfile backend ligne 33-34)

### Améliorations Planifiées
- Google OAuth (partiellement configuré, pas encore implémenté)
- Upload vers Google Drive (Phase 2, commenté dans `gpx.py`)
- Rate limiting par IP pour les partages (TODO dans `share.py`)

### Dette Technique
- Les migrations Alembic ne sont pas exécutées automatiquement au démarrage Docker
- Certains tests retournent 400 ou 500 de manière interchangeable (voir `test_api.py`)

---

## 11. Références

### Documentation
- [README.md](../README.md) - Vue d'ensemble du projet
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture détaillée
- [ENV_VARIABLES.md](../ENV_VARIABLES.md) - Variables d'environnement

### Règles Détaillées
- [@.claude/rules/code-style.md](rules/code-style.md) - Conventions de code
- [@.claude/rules/testing.md](rules/testing.md) - Stratégie de tests
- [@.claude/rules/security.md](rules/security.md) - Exigences sécurité
- [@.claude/rules/api-design.md](rules/api-design.md) - Design API
- [@.claude/rules/database.md](rules/database.md) - Patterns DB
- [@.claude/rules/git-workflow.md](rules/git-workflow.md) - Workflow Git

---

**Rappel** : Ce fichier doit être mis à jour régulièrement pour refléter l'état actuel du projet.
