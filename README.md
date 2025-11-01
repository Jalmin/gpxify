# GPXIFY - Analyseur de fichiers GPX

Application web pour l'analyse de fichiers GPX avec visualisation cartographique et analyse de segments.

**🌐 Production** : https://gpxify.carapacebleue.com (déploiement Coolify/Hetzner)

## Fonctionnalités

### Phase 2 - Google OAuth + Database (En cours de déploiement)
- ✅ Upload de fichiers GPX
- ✅ Affichage sur carte interactive (Leaflet + CyclOSM)
- ✅ Profil d'altitude interactif
- ✅ Authentification Google OAuth
- ✅ Base de données PostgreSQL
- ✅ Multi-traces avec couleurs
- ✅ Statistiques détaillées
- 🚀 Google Drive integration (à venir)

### Phases Futures
- Phase 3: Analyse de segments personnalisés
- Phase 4: Détection segments singuliers (montées/descentes)
- Phase 5: Auth0 + Features avancées

## Stack Technique

**Backend:**
- FastAPI (Python 3.9+)
- gpxpy (parsing GPX)
- Authlib (Google OAuth)
- uvicorn (ASGI server)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Leaflet (cartographie)
- @raruto/leaflet-elevation (profils)
- shadcn/ui + Tailwind CSS
- @we-gold/gpxjs (parsing GPX client)

**Cartes:**
- CyclOSM (tiles outdoor gratuites)
- OpenTopoMap (fallback)

## Structure du Projet

```
GPXIFY/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── main.py       # Point d'entrée FastAPI
│   │   ├── api/          # Routes API
│   │   ├── core/         # Configuration
│   │   ├── models/       # Modèles de données
│   │   └── services/     # Logique métier
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # Composants React
│   │   ├── services/     # API calls
│   │   ├── types/        # TypeScript types
│   │   └── App.tsx       # Composant principal
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

## Installation

### Prérequis
- Python 3.9+
- Node.js 18+
- npm ou yarn

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Configurer les variables d'environnement dans .env
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuration Google OAuth

1. Créer un projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activer Google Drive API
3. Créer des identifiants OAuth 2.0
4. Ajouter http://localhost:5173 dans les origines autorisées
5. Copier Client ID et Client Secret dans `.env`

## Développement

- Backend API: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

## 🚀 Déploiement sur Coolify (Hetzner)

**Démarrage rapide** : Voir [DEPLOY_START.md](./DEPLOY_START.md)

### Fichiers de déploiement disponibles

| Fichier | Description |
|---------|-------------|
| [DEPLOY_START.md](./DEPLOY_START.md) | ⭐ Guide ultra-rapide (3 étapes) |
| [GOOGLE_CLOUD_CHECKLIST.md](./GOOGLE_CLOUD_CHECKLIST.md) | ✅ Checklist Google Cloud (avec cases à cocher) |
| [GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md) | Guide détaillé Google Cloud |
| [GOOGLE_OPTIONS.md](./GOOGLE_OPTIONS.md) | Comparaison des options Google Cloud |
| [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) | Checklist déploiement Coolify |
| [DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md) | Guide Coolify détaillé + dépannage |
| [CREDENTIALS.md](./CREDENTIALS.md) | Credentials & secrets (local only) |
| [docker-compose.yml](./docker-compose.yml) | Configuration des services |

### Services déployés

- **Backend** : FastAPI (port 8000)
- **Frontend** : React + Nginx (port 80/443)
- **Database** : PostgreSQL 16

### Configuration requise

1. DNS : `gpxify.carapacebleue.com` → IP Hetzner
2. Google OAuth configuré (credentials inclus)
3. Variables d'environnement dans Coolify

**Temps de déploiement** : ~20 minutes

## Licence

MIT
