# Prochaines étapes - GPXIFY

## Phase 1 - MVP ✅ (COMPLÈTE)

La Phase 1 est maintenant terminée avec les fonctionnalités suivantes :

- ✅ Backend FastAPI avec parsing GPX (gpxpy)
- ✅ Frontend React + TypeScript + Vite
- ✅ Carte interactive avec Leaflet + CyclOSM
- ✅ Profil d'altitude avec leaflet-elevation
- ✅ Statistiques de base (distance, D+, D-)
- ✅ UI moderne avec shadcn/ui + Tailwind
- ✅ Upload de fichiers GPX
- ✅ Support multi-traces

### Pour démarrer maintenant :

```bash
# Terminal 1 - Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.main

# Terminal 2 - Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

Puis ouvrir http://localhost:5173 et tester avec `example.gpx`

## Phase 2 - Google Drive Integration (À FAIRE)

**Objectif** : Authentification Google OAuth + stockage Google Drive

**Durée estimée** : 3-4 semaines

### Tâches principales :

1. **Configuration Google Cloud**
   - [ ] Créer projet Google Cloud Console
   - [ ] Activer Google Drive API
   - [ ] Configurer OAuth 2.0 credentials
   - [ ] Ajouter scopes nécessaires

2. **Backend**
   - [ ] Installer google-api-python-client
   - [ ] Créer service Google Auth (authlib)
   - [ ] Implémenter routes OAuth callback
   - [ ] Créer service Google Drive (upload/download)
   - [ ] Gérer tokens et refresh
   - [ ] Endpoints : /auth/google/login, /auth/google/callback
   - [ ] Endpoints : /drive/files, /drive/upload, /drive/download

3. **Frontend**
   - [ ] Installer @react-oauth/google
   - [ ] Créer composant GoogleLogin
   - [ ] Gérer état authentification (Context/Zustand)
   - [ ] Afficher fichiers Google Drive
   - [ ] Bouton "Charger depuis Drive"
   - [ ] Bouton "Sauvegarder sur Drive"

4. **Tests**
   - [ ] Tester flux OAuth complet
   - [ ] Tester upload vers Drive
   - [ ] Tester lecture depuis Drive
   - [ ] Tester refresh token

**Documentation** : Voir [PHASE2_GOOGLE_AUTH.md](./PHASE2_GOOGLE_AUTH.md)

## Phase 3 - Analyse de Segments Personnalisés (À FAIRE)

**Objectif** : Permettre l'analyse de segments sélectionnés manuellement

**Durée estimée** : 4-5 semaines

### Tâches principales :

1. **Backend**
   - [ ] Endpoint POST /api/v1/gpx/analyze-segment
   - [ ] Algorithme de calcul : longueur, D+, D-, pente moyenne/max
   - [ ] Validation des paramètres (start_km, end_km)

2. **Frontend**
   - [ ] Slider double pour sélection de segment sur profil
   - [ ] Champs texte pour saisie manuelle (km début/fin)
   - [ ] Affichage highlight du segment sur carte
   - [ ] Panel de statistiques du segment
   - [ ] Tableau de segments sauvegardés
   - [ ] Bouton "Ajouter au tableau"
   - [ ] Export CSV du tableau

3. **Fonctionnalités**
   - [ ] Sélection visuelle sur profil d'altitude
   - [ ] Synchronisation carte <-> profil
   - [ ] Calculs : distance, D+, D-, pente moy/max
   - [ ] Sauvegarde segments en local (localStorage)
   - [ ] Export CSV avec toutes les colonnes

4. **UX**
   - [ ] Drag sur le profil pour sélectionner
   - [ ] Click sur carte pour définir début/fin
   - [ ] Validation : segment min 100m

## Phase 4 - Segments Singuliers (À FAIRE)

**Objectif** : Détection automatique des segments remarquables

**Durée estimée** : 3-4 semaines

### Critères (définis par vous) :

- Distance minimale : 2 km
- Pente minimale : 10%
- "Non significative" : sur 1km, montée > 10 × descente (ou inverse)

### Tâches principales :

1. **Backend - Algorithmes**
   - [ ] Algorithme : plus longue montée continue
   - [ ] Algorithme : plus longue descente continue
   - [ ] Algorithme : plus longue section plate
   - [ ] Calcul du "climb score" (longueur × pente)
   - [ ] Filtrage des micro-variations GPS (smoothing)
   - [ ] Endpoint : /api/v1/gpx/detect-segments

2. **Frontend**
   - [ ] Section "Segments Remarquables"
   - [ ] Cartes avec icônes pour chaque type
   - [ ] Click pour highlight sur carte
   - [ ] Affichage stats détaillées
   - [ ] Option : ajuster seuils de détection

3. **Visualisation**
   - [ ] Couleurs différentes par type (montée=rouge, descente=bleu, plat=vert)
   - [ ] Markers sur carte aux points début/fin
   - [ ] Tooltip avec infos au survol
   - [ ] Export des segments remarquables

4. **Optimisation**
   - [ ] Cache des calculs
   - [ ] Web Worker pour calculs lourds
   - [ ] Throttle des re-calculs

**Ressources** :
- Algorithme climb detection : https://alex-hhh.github.io/2021/04/climb-analysis-tool.html
- Gradient calculation : https://betterdatascience.com/data-science-for-cycling-calculate-route-gradients-from-strava-gpx/

## Phase 5 - Auth0 & Production (À FAIRE)

**Objectif** : Migration vers Auth0 et préparation production

**Durée estimée** : 3-4 semaines

### Tâches principales :

1. **Auth0 Setup**
   - [ ] Créer compte Auth0
   - [ ] Configurer application
   - [ ] Configurer social connections (Google, GitHub, etc.)
   - [ ] Configurer rules et actions

2. **Backend**
   - [ ] Remplacer/augmenter Google OAuth avec Auth0
   - [ ] Utiliser auth0-fastapi-api
   - [ ] Middleware de vérification JWT
   - [ ] Gestion des rôles/permissions
   - [ ] Base de données PostgreSQL
   - [ ] Migration SQLAlchemy/Alembic

3. **Frontend**
   - [ ] Installer @auth0/auth0-react
   - [ ] Remplacer GoogleLogin par Auth0
   - [ ] Protected routes
   - [ ] User profile page
   - [ ] Settings page

4. **Database**
   - [ ] Schéma : users, gpx_files, segments, analyses
   - [ ] Migrations
   - [ ] Backup strategy

5. **Production**
   - [ ] Docker compose (backend + frontend + db)
   - [ ] CI/CD (GitHub Actions)
   - [ ] Déploiement (Vercel/Railway/Fly.io)
   - [ ] HTTPS / SSL
   - [ ] Rate limiting
   - [ ] Monitoring (Sentry)
   - [ ] Analytics (Plausible/Umami)

## Améliorations Futures (Backlog)

### Performance
- [ ] Lazy loading des traces
- [ ] Pagination de points GPX
- [ ] Compression des données
- [ ] Service Worker / PWA
- [ ] Offline support

### Fonctionnalités
- [ ] Comparaison de 2+ traces côte à côte
- [ ] Édition de traces (crop, merge, reverse)
- [ ] Import depuis Strava/Garmin/Komoot API
- [ ] Export vers différents formats (KML, GeoJSON, FIT)
- [ ] Partage public d'analyses (liens)
- [ ] Mode sombre

### Analyses Avancées
- [ ] Prédiction de temps de parcours
- [ ] Analyse de puissance (W/kg)
- [ ] Détection de pauses/arrêts
- [ ] Heatmap de vitesse
- [ ] Analyse météo (si timestamp disponible)
- [ ] Corrections d'altitude (SRTM API)

### Mobile
- [ ] App mobile (React Native)
- [ ] Enregistrement GPS direct
- [ ] Notifications

### Social
- [ ] Profils publics
- [ ] Classements (leaderboards)
- [ ] Défis communautaires
- [ ] Commentaires sur traces

## Checklist Avant Production

### Sécurité
- [ ] Rate limiting sur tous les endpoints
- [ ] Validation stricte des inputs
- [ ] Sanitization des fichiers uploadés
- [ ] CORS configuré correctement
- [ ] Secrets en variables d'env (pas en code)
- [ ] HTTPS obligatoire
- [ ] Headers de sécurité (HSTS, CSP, etc.)

### Performance
- [ ] CDN pour assets statiques
- [ ] Compression gzip/brotli
- [ ] Caching approprié
- [ ] Optimisation images
- [ ] Code splitting
- [ ] Lazy loading

### Qualité
- [ ] Tests unitaires (backend)
- [ ] Tests e2e (Playwright/Cypress)
- [ ] Linting (ESLint, Ruff)
- [ ] Types stricts (TypeScript, Pydantic)
- [ ] Documentation API (OpenAPI/Swagger)
- [ ] README à jour

### Monitoring
- [ ] Logging centralisé
- [ ] Error tracking (Sentry)
- [ ] Metrics (Prometheus/Grafana)
- [ ] Uptime monitoring
- [ ] Analytics users

### Legal
- [ ] Politique de confidentialité
- [ ] CGU
- [ ] RGPD compliance
- [ ] Cookies consent

## Ressources & Liens Utiles

### Docs Officielles
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- Leaflet: https://leafletjs.com/
- Tailwind: https://tailwindcss.com/

### Communauté
- GPX Format: https://www.topografix.com/gpx.asp
- OpenStreetMap: https://www.openstreetmap.org/
- Strava API: https://developers.strava.com/

### Inspiration
- GPX Studio: https://gpx.studio/
- Komoot: https://www.komoot.com/
- Strava: https://www.strava.com/

---

**Bonne continuation sur le projet GPXIFY ! 🚴‍♂️⛰️**

N'hésitez pas à créer des issues GitHub pour tracker les bugs et features.
