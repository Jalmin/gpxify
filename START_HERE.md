# 🚀 Bienvenue dans GPXIFY !

Félicitations ! Votre projet GPXIFY Phase 1 est prêt à démarrer.

## ⚡ Démarrage Rapide (5 minutes)

### 1. Installation Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

### 2. Installation Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

### 3. Lancement

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python -m app.main
```
✅ Backend disponible sur http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend disponible sur http://localhost:5173

### 4. Test

1. Ouvrir http://localhost:5173
2. Glisser-déposer le fichier `example.gpx` (à la racine du projet)
3. Profitez de votre analyseur GPX ! 🎉

## 📚 Documentation

| Fichier | Description |
|---------|-------------|
| [README.md](./README.md) | Vue d'ensemble du projet |
| [QUICKSTART.md](./QUICKSTART.md) | Guide de démarrage détaillé |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture technique |
| [NEXT_STEPS.md](./NEXT_STEPS.md) | Roadmap et prochaines étapes |
| [PHASE2_GOOGLE_AUTH.md](./PHASE2_GOOGLE_AUTH.md) | Guide pour Phase 2 |

## ✨ Fonctionnalités Phase 1

✅ **Disponible maintenant :**
- Upload de fichiers GPX (drag & drop)
- Carte interactive avec fond outdoor (CyclOSM)
- Profil d'altitude interactif
- Statistiques : distance, dénivelé +/-, durée
- Support multi-traces
- Interface moderne et responsive

🚧 **À venir (Phase 2) :**
- Authentification Google OAuth
- Stockage Google Drive
- Analyse de segments personnalisés
- Détection de segments singuliers

## 🛠️ Stack Technique

**Backend:**
- Python 3.9+ avec FastAPI
- gpxpy pour parsing GPX
- Pydantic pour validation

**Frontend:**
- React 18 + TypeScript
- Vite (build ultra-rapide)
- Leaflet pour cartographie
- Tailwind CSS + shadcn/ui

## 📁 Structure du Projet

```
GPXIFY/
├── backend/           # API FastAPI
│   ├── app/
│   │   ├── api/      # Routes
│   │   ├── core/     # Config
│   │   ├── models/   # Schémas
│   │   └── services/ # Logique métier
│   └── requirements.txt
│
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/ # Composants UI
│   │   ├── services/   # API calls
│   │   └── types/      # Types TS
│   └── package.json
│
├── example.gpx       # Fichier test
└── *.md             # Documentation
```

## 🐛 Dépannage

### Backend ne démarre pas
```bash
# Vérifier l'environnement virtuel
which python  # Doit pointer vers venv/bin/python

# Réinstaller les dépendances
pip install -r requirements.txt
```

### Frontend erreurs npm
```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Upload ne fonctionne pas
- Vérifier que le backend tourne sur port 8000
- Vérifier le fichier `.env` du frontend (VITE_API_URL)
- Vérifier la console navigateur (F12) pour les erreurs

## 📊 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Info application |
| GET | `/health` | Health check |
| GET | `/docs` | Documentation Swagger |
| GET | `/api/v1/gpx/test` | Test connexion |
| POST | `/api/v1/gpx/upload` | Upload fichier GPX |

## 🎯 Prochaines Étapes

1. **Tester l'application** avec vos propres fichiers GPX
2. **Lire [NEXT_STEPS.md](./NEXT_STEPS.md)** pour la roadmap
3. **Commencer Phase 2** quand vous êtes prêt

### Pour Phase 2 (Google Drive)

1. Créer projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activer Google Drive API
3. Créer credentials OAuth 2.0
4. Suivre le guide [PHASE2_GOOGLE_AUTH.md](./PHASE2_GOOGLE_AUTH.md)

## 💡 Conseils

- **Testez d'abord avec example.gpx** pour vérifier que tout fonctionne
- **Utilisez les DevTools** (F12) pour debugger
- **Consultez `/docs`** pour tester l'API backend directement
- **Lisez l'ARCHITECTURE.md** pour comprendre le code

## 🤝 Contribution

Ce projet est modulaire et facile à étendre :

- Ajoutez de nouveaux endpoints dans `backend/app/api/`
- Créez de nouveaux composants dans `frontend/src/components/`
- Tous les types sont définis dans `frontend/src/types/`
- La logique métier est dans `backend/app/services/`

## 📝 TODO Immédiat

- [ ] Lancer le backend
- [ ] Lancer le frontend
- [ ] Tester avec example.gpx
- [ ] Tester avec vos propres fichiers GPX
- [ ] Lire NEXT_STEPS.md pour la suite

## 🎉 Amusez-vous bien !

Si vous rencontrez des problèmes, consultez :
1. [QUICKSTART.md](./QUICKSTART.md) pour les instructions détaillées
2. [ARCHITECTURE.md](./ARCHITECTURE.md) pour comprendre le code
3. La documentation API sur http://localhost:8000/docs

---

**Bon développement ! 🚴‍♂️⛰️**

*GPXIFY - Analysez vos traces GPX comme un pro*
