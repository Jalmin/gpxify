# 📦 REACT + FASTAPI PRODUCTION TEMPLATE

Ce template a été extrait et nettoyé du projet GPX Ninja pour être réutilisé dans de nouveaux projets.

## 🎯 Ce qui est inclus

### ✅ Configuration Validée en Production

**Frontend:**
- React 18 + TypeScript (strict mode)
- Vite (dev server rapide + build optimisé)
- Tailwind CSS avec système de CSS variables
- Vitest + Testing Library
- Path aliases (`@/*`)
- ESLint configuré

**Backend:**
- FastAPI 0.115 (async)
- SQLAlchemy 2.0 + PostgreSQL
- Pydantic Settings (configuration type-safe)
- SlowAPI (rate limiting)
- Pytest + coverage
- Structure modulaire (api/services/models)

**Infrastructure:**
- Docker multi-stage builds
- docker-compose production-ready
- Nginx optimisé (gzip, cache, security headers)
- Health checks configurés
- Auto-documentation (Swagger/ReDoc)

### ✅ Utilities Réutilisables

**Frontend:**
- `cn()` function (merge Tailwind classes)
- Button component avec variants
- API client avec interceptors
- Fonctions de formatage (dates, nombres)

**Backend:**
- Configuration Pydantic centralisée
- Database session dependency
- Rate limiting setup
- Modèles exemple (ORM + Pydantic)

### ✅ Exemple Fonctionnel

- Page d'accueil avec appel API
- Endpoint GET example qui fonctionne
- Composant Button réutilisable
- Tests configurés et fonctionnels
- Docker Compose qui démarre tout

## 🚫 Ce qui a été retiré

❌ Code métier GPX Ninja (parsing, calculs, etc.)
❌ Dépendances spécifiques (leaflet, chart.js, pandas, numpy)
❌ Composants métier (Map, ElevationProfile, AidStationTable)
❌ Services spécifiques (gpx_parser, climb_detector)
❌ Toute la logique de partage/récupération de course

## 📂 Structure du Template

```
project-template/
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/
│   │   │       └── Button.tsx   # Component exemple avec variants
│   │   ├── lib/
│   │   │   └── utils.ts         # cn() et helpers
│   │   ├── services/
│   │   │   └── api.ts           # Client Axios configuré
│   │   ├── types/
│   │   │   └── index.ts         # Types TypeScript
│   │   ├── test/
│   │   │   └── setup.ts         # Configuration Vitest
│   │   ├── App.tsx              # Page d'exemple
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Styles + CSS variables
│   ├── Dockerfile               # Multi-stage build
│   ├── nginx.conf               # Config Nginx production
│   ├── package.json             # Dependencies minimales
│   ├── tsconfig.json            # TypeScript strict + aliases
│   ├── vite.config.ts           # Vite avec proxy API
│   └── vitest.config.ts         # Tests configurés
│
├── backend/                     # FastAPI + PostgreSQL
│   ├── app/
│   │   ├── api/
│   │   │   └── example.py       # Routes exemple
│   │   ├── core/
│   │   │   └── config.py        # Pydantic Settings
│   │   ├── db/
│   │   │   ├── database.py      # SQLAlchemy setup
│   │   │   └── models.py        # ORM models
│   │   ├── models/
│   │   │   └── __init__.py      # Pydantic schemas
│   │   ├── services/            # Business logic (vide)
│   │   ├── utils/               # Helpers (vide)
│   │   ├── middleware/
│   │   │   └── rate_limit.py    # SlowAPI setup
│   │   └── main.py              # FastAPI app
│   ├── Dockerfile               # Python 3.11 slim
│   ├── requirements.txt         # Dependencies minimales
│   └── requirements-dev.txt     # Test dependencies
│
├── .claude/
│   └── starter-prompt.md        # 📖 GUIDE COMPLET de démarrage
│
├── docker-compose.yml           # Orchestration 3 services
├── .env.example                 # Template environment
├── .gitignore                   # Git ignore rules
├── README.md                    # Documentation principale
└── TEMPLATE.md                  # Ce fichier

```

## 🚀 Quick Start (3 minutes)

```bash
# 1. Copier le template
cp -r project-template my-new-project
cd my-new-project

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env et changer les secrets

# 3. Démarrer avec Docker
docker-compose up --build

# 4. Accéder à l'application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## 📚 Documentation

1. **README.md** - Vue d'ensemble, architecture, customisation
2. **.claude/starter-prompt.md** - Guide complet pour démarrer un nouveau projet
3. **GPX Ninja/.claude/reusable-patterns.md** - Patterns de code détaillés
4. **GPX Ninja/.claude/project-audit.md** - Analyse complète du projet source

## 🎯 Cas d'Usage

Ce template est parfait pour :

✅ **Applications CRUD** (CRM, admin panels, dashboards)
✅ **APIs RESTful** avec frontend
✅ **SaaS MVP** (validation rapide d'idée)
✅ **Prototypes** pour démos clients
✅ **Applications internes** d'entreprise
✅ **Portfolio projects** avec stack moderne

## 🛠️ Prochaines Étapes

1. **Lire README.md** pour comprendre l'architecture
2. **Suivre .claude/starter-prompt.md** pour setup guidé
3. **Supprimer le code exemple** (api/example.py, App.tsx)
4. **Créer vos modèles** de données
5. **Développer vos features**

## 💡 Conseils

**Avant de commencer:**
- Générer SECRET_KEY: `openssl rand -hex 32`
- Générer POSTGRES_PASSWORD fort
- Personnaliser APP_NAME partout

**Développement:**
- Utiliser `docker-compose up` pour développer
- Ou dev local: `npm run dev` + `uvicorn app.main:app --reload`
- Écrire des tests au fur et à mesure

**Production:**
- Ne pas commit .env
- Utiliser des secrets forts
- Activer SSL/HTTPS
- Configurer backups DB

## 🔗 Ressources

- **FastAPI Docs:** https://fastapi.tiangolo.com
- **React Docs:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com
- **Docker Docs:** https://docs.docker.com

---

**Template basé sur GPX Ninja (production-proven)**
**Dernière mise à jour:** Novembre 2025
**Licence:** MIT - Libre d'utilisation

Pour support: Voir .claude/starter-prompt.md section "Troubleshooting"
