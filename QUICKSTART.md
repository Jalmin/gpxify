# Guide de démarrage rapide - GPXIFY Phase 1

Ce guide vous aidera à lancer l'application localement en quelques minutes.

## Prérequis

- Python 3.9 ou supérieur
- Node.js 18 ou supérieur
- npm ou yarn

## Installation

### 1. Backend (FastAPI)

```bash
cd backend

# Créer un environnement virtuel Python
python3 -m venv venv

# Activer l'environnement virtuel
# Sur macOS/Linux:
source venv/bin/activate
# Sur Windows:
# venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env
cp .env.example .env

# (Optionnel) Éditer .env pour personnaliser la configuration
# Pour Phase 1, les valeurs par défaut fonctionnent
```

### 2. Frontend (React + Vite)

```bash
cd frontend

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env

# (Optionnel) Éditer .env si nécessaire
```

## Lancement de l'application

### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate  # Si pas déjà activé
python -m app.main
```

Le backend démarre sur : http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Le frontend démarre sur : http://localhost:5173

## Utilisation

1. Ouvrez http://localhost:5173 dans votre navigateur
2. Glissez-déposez un fichier GPX ou cliquez sur "Choisir un fichier"
3. Visualisez votre trace sur la carte interactive
4. Consultez les statistiques (distance, dénivelé)
5. Analysez le profil d'altitude interactif

## Fonctionnalités Phase 1

✅ **Actuellement disponible:**
- Upload de fichiers GPX
- Visualisation sur carte interactive (CyclOSM)
- Affichage de multiples traces
- Profil d'altitude interactif
- Statistiques de base (distance, D+, D-, durée)
- Interface responsive avec Tailwind CSS

🚧 **À venir (Phase 2):**
- Authentification Google OAuth
- Intégration Google Drive
- Sauvegarde des analyses
- Multi-traces overlay avec comparaison

## Tester avec un fichier GPX

Si vous n'avez pas de fichier GPX sous la main:
1. Téléchargez une trace depuis [Strava](https://www.strava.com/) (Export > GPX)
2. Ou utilisez [OpenStreetMap](https://www.openstreetmap.org/) (Exporter)
3. Ou générez une trace avec [GPX Studio](https://gpx.studio/)

## Dépannage

### Backend ne démarre pas

**Erreur: `ModuleNotFoundError: No module named 'app'`**
- Assurez-vous d'être dans le dossier `backend/`
- Lancez avec `python -m app.main` (pas `python app/main.py`)

**Erreur: `Address already in use`**
- Un autre processus utilise le port 8000
- Changez le port dans `app/main.py` (ligne `port=8000`)

### Frontend ne démarre pas

**Erreur: `Cannot find module '@raruto/leaflet-elevation'`**
- Réinstallez les dépendances : `rm -rf node_modules && npm install`

**Page blanche / Erreurs de console**
- Vérifiez que le backend est bien démarré
- Vérifiez la console navigateur (F12) pour les erreurs
- Assurez-vous que le CORS est bien configuré

### Upload de fichier échoue

**Erreur: `Network Error`**
- Vérifiez que le backend est démarré
- Vérifiez l'URL dans `.env` : `VITE_API_URL=http://localhost:8000`

**Erreur: `Invalid GPX file`**
- Vérifiez que le fichier est bien un GPX valide
- Ouvrez le fichier dans un éditeur de texte pour vérifier le format XML

## Structure des dossiers

```
GPXIFY/
├── backend/
│   ├── app/
│   │   ├── api/          # Routes API
│   │   ├── core/         # Configuration
│   │   ├── models/       # Modèles Pydantic
│   │   ├── services/     # Logique métier
│   │   └── main.py       # Point d'entrée
│   ├── uploads/          # Fichiers uploadés (créé auto)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Composants React
│   │   │   ├── Map/      # Carte et profil
│   │   │   └── ui/       # Composants UI
│   │   ├── services/     # API client
│   │   ├── types/        # Types TypeScript
│   │   └── App.tsx
│   └── package.json
│
└── README.md
```

## API Endpoints disponibles

### GET `/`
Informations sur l'application

### GET `/health`
Health check

### GET `/api/v1/gpx/test`
Test de connexion API

### POST `/api/v1/gpx/upload`
Upload et parsing d'un fichier GPX

**Paramètres:**
- `file`: Fichier GPX (multipart/form-data)

**Réponse:**
```json
{
  "success": true,
  "message": "GPX file uploaded and parsed successfully",
  "data": {
    "filename": "mon_parcours.gpx",
    "tracks": [...],
    "waypoints": [...]
  },
  "file_id": "uuid..."
}
```

## Prochaines étapes

Une fois Phase 1 testée et fonctionnelle, vous pourrez:

1. **Phase 2**: Ajouter Google OAuth et Google Drive
2. **Phase 3**: Implémenter l'analyse de segments personnalisés
3. **Phase 4**: Détecter les segments singuliers
4. **Phase 5**: Migration Auth0 et mise en production

## Contribution / Feedback

Pour signaler un bug ou demander une fonctionnalité, créez une issue sur le dépôt.

---

**Bon codage ! 🚴‍♂️⛰️**
