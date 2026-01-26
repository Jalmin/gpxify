# 🚀 Commandes de Déploiement

## Frontend (Vercel / Netlify / autre)

### Build local (déjà fait ✅)
```bash
cd frontend
npm run build
```

### Déploiement selon votre plateforme

**Si Vercel:**
```bash
cd frontend
vercel --prod
```

**Si Netlify:**
```bash
cd frontend
netlify deploy --prod --dir=dist
```

**Si serveur custom (nginx, apache):**
```bash
# Copier le contenu de frontend/dist/ vers le serveur
scp -r frontend/dist/* user@server:/var/www/gpxninja/
```

---

## Backend (Docker)

### Option 1: Docker Compose (Recommandé)

```bash
# Construire et démarrer
docker-compose up --build -d

# Vérifier les logs
docker-compose logs -f backend

# Vérifier le health check
curl http://localhost:8000/health
```

### Option 2: Docker manuel

```bash
# Build l'image
cd backend
docker build -t gpxninja-backend:latest .

# Run le conteneur
docker run -d \
  --name gpxninja-backend \
  -p 8000:8000 \
  -e DATABASE_URL="sqlite:///./app.db" \
  -e SECRET_KEY="your-secret-key-here" \
  -e FRONTEND_URL="https://gpx.ninja" \
  gpxninja-backend:latest

# Check logs
docker logs -f gpxninja-backend

# Check health
curl http://localhost:8000/health
```

---

## Variables d'Environnement à Configurer

### Frontend (.env)
```bash
VITE_API_URL=https://api.gpx.ninja
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Backend (.env)
```bash
# Application
APP_NAME=GPX Ninja
DEBUG=False

# Database
DATABASE_URL=postgresql://user:password@localhost/gpxninja
# ou pour SQLite: sqlite:///./app.db

# Security
SECRET_KEY=your-secret-key-here  # Générer avec: openssl rand -hex 32
JWT_SECRET_KEY=your-jwt-secret

# CORS
FRONTEND_URL=https://gpx.ninja
ALLOWED_ORIGINS=["https://gpx.ninja","https://www.gpx.ninja"]

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret

# Upload
MAX_UPLOAD_SIZE=10485760  # 10 MB
```

---

## Vérifications Post-Déploiement

### Frontend
- [ ] Page marketing accessible sur /
- [ ] App principale accessible sur /analyze
- [ ] Navigation sticky fonctionne
- [ ] Liens vers #features et #faq fonctionnent
- [ ] Footer avec formulaire contact fonctionne
- [ ] Mobile responsive
- [ ] Dark mode fonctionne

### Backend
- [ ] Health check: `curl https://api.gpx.ninja/health`
- [ ] Upload GPX fonctionne
- [ ] Détection de montées V2 active
- [ ] API endpoints répondent
- [ ] CORS configuré correctement

### Fonctionnalités
- [ ] Upload fichier GPX
- [ ] Détection de montées (seuil 200m minimum)
- [ ] Range slider fluide
- [ ] Altitude min/max correcte
- [ ] Export segment
- [ ] Fusion GPX
- [ ] Table ravitaillement
- [ ] Partage d'analyse
- [ ] Export PDF

---

## Rollback Rapide

Si problème, retour à la version précédente :

```bash
# Git
git revert HEAD
git push

# Docker
docker-compose down
git checkout HEAD~1
docker-compose up --build -d
```

---

## Monitoring

```bash
# Logs backend
docker-compose logs -f backend

# Logs temps réel
tail -f /var/log/gpxninja/backend.log

# Stats Docker
docker stats gpxninja-backend
```

---

## Notes Importantes

1. **DATABASE_URL**: En production, utilisez PostgreSQL plutôt que SQLite
2. **SECRET_KEY**: JAMAIS commiter dans git, utiliser variables d'env
3. **CORS**: Vérifier que FRONTEND_URL est correct
4. **SSL/HTTPS**: Obligatoire en production
5. **Backup**: Configurer backup automatique de la DB

---

**Dernière mise à jour:** 10 novembre 2025
