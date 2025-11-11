# ✅ Checklist de Déploiement GPXIFY sur Coolify

## 📋 Vue d'ensemble

- **Domaine** : https://www.gpx.ninja
- **Serveur** : Hetzner avec Coolify
- **Stack** : FastAPI + React + PostgreSQL
- **OAuth** : Google (credentials du projet PennylaneProject)

---

## 🎯 ÉTAPE 1 : Configuration DNS (5 min)

### Actions

- [ ] Se connecter au panneau DNS (Cloudflare/OVH/etc.)
- [ ] Ajouter un enregistrement A :
  ```
  Type: A
  Name: gpxify
  Value: [IP_PUBLIQUE_SERVEUR_HETZNER]
  TTL: 3600
  ```
- [ ] Attendre la propagation DNS (vérifier avec `dig www.gpx.ninja`)

### Vérification

```bash
# Depuis votre machine
dig www.gpx.ninja

# Doit retourner l'IP de votre serveur Hetzner
```

**Status** : ⬜ À faire

---

## 🔑 ÉTAPE 2 : Configuration Google Cloud Console (10 min)

### Actions

- [ ] Aller sur https://console.cloud.google.com/
- [ ] Sélectionner le projet **pennylanneanalytics**
- [ ] APIs & Services → Credentials
- [ ] Cliquer sur le client OAuth `646813821201-...`

### Ajouter les URIs

#### JavaScript origins
- [ ] Ajouter : `https://www.gpx.ninja`

#### Redirect URIs
- [ ] Ajouter : `https://www.gpx.ninja/api/v1/auth/google/callback`
- [ ] Ajouter : `https://www.gpx.ninja/auth/callback`

### Activer les APIs

- [ ] APIs & Services → Library
- [ ] Rechercher et activer "Google Drive API"
- [ ] Vérifier que "Google OAuth2 API" est activée

### Vérification

- [ ] Les 2 URIs sont bien dans la liste
- [ ] Google Drive API apparaît dans "Enabled APIs"

**Status** : ⬜ À faire

---

## 🔐 ÉTAPE 3 : Générer les Secrets (2 min)

### Sur votre machine locale

```bash
# SECRET_KEY pour JWT
openssl rand -hex 32

# POSTGRES_PASSWORD
openssl rand -base64 32
```

### Copier les résultats

- [ ] Copier SECRET_KEY généré → [noter quelque part temporairement]
- [ ] Copier POSTGRES_PASSWORD généré → [noter quelque part temporairement]

**Status** : ⬜ À faire

---

## 📦 ÉTAPE 4 : Préparer le Code (5 min)

### Initialiser Git (si pas déjà fait)

```bash
cd /Users/loicjalmin/Projects/GPXIFY

# Vérifier que .gitignore ignore bien CREDENTIALS.md
cat .gitignore | grep CREDENTIALS

# Initialiser Git
git init
git add .
git commit -m "Initial commit - GPXIFY ready for production"

# Ajouter remote (GitHub, GitLab, ou Gitea)
git remote add origin https://github.com/votre-username/gpxify.git

# Push
git push -u origin main
```

### Vérifications

- [ ] Git initialisé
- [ ] Tous les fichiers Docker présents (Dockerfile, docker-compose.yml)
- [ ] CREDENTIALS.md n'est PAS dans Git (vérifier avec `git status`)
- [ ] Code pushé sur remote

**Status** : ⬜ À faire

---

## 🚀 ÉTAPE 5 : Déploiement dans Coolify (15 min)

### 5.1 Créer le Projet

- [ ] Coolify Dashboard → New Project
- [ ] Name: `GPXIFY`
- [ ] Description: `GPX file analysis application`

### 5.2 Ajouter la Ressource

- [ ] Type: **Docker Compose**
- [ ] Source: **Git Repository**
- [ ] Repository URL: `https://github.com/votre-username/gpxify.git`
- [ ] Branch: `main`
- [ ] Compose File Path: `docker-compose.yml`

### 5.3 Configuration du Domaine

- [ ] Onglet **Domains**
- [ ] Ajouter: `www.gpx.ninja`
- [ ] Activer **SSL/TLS** (Let's Encrypt automatique)

### 5.4 Variables d'Environnement

Onglet **Environment Variables**, ajouter :

#### Application
```
APP_NAME=GPXIFY
ENVIRONMENT=production
DEBUG=False
```

#### Domain
```
DOMAIN=www.gpx.ninja
VITE_API_URL=https://www.gpx.ninja
```

#### CORS
```
BACKEND_CORS_ORIGINS=https://www.gpx.ninja
```

#### Google OAuth
```
GOOGLE_CLIENT_ID=646813821201-le0dqlhd1qr7r3v93rn4ni101ce9ltku.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://www.gpx.ninja/api/v1/auth/google/callback
```

#### Security
```
SECRET_KEY=[COLLER ICI LE SECRET_KEY GÉNÉRÉ À L'ÉTAPE 3]
```

#### Database
```
POSTGRES_DB=gpxify
POSTGRES_USER=gpxify
POSTGRES_PASSWORD=[COLLER ICI LE POSTGRES_PASSWORD GÉNÉRÉ À L'ÉTAPE 3]
```

- [ ] Toutes les variables copiées dans Coolify
- [ ] Vérifier qu'il n'y a pas de fautes de frappe

### 5.5 Déployer

- [ ] Cliquer sur **Deploy**
- [ ] Suivre les logs en temps réel
- [ ] Attendre que tous les services soient **✓ Running** (vert)

**Temps estimé** : 5-10 minutes

**Status** : ⬜ À faire

---

## ✅ ÉTAPE 6 : Vérifications Post-Déploiement (5 min)

### 6.1 Vérifier les Services

Dans Coolify :
- [ ] Service `gpxify-db` : ✓ Running
- [ ] Service `gpxify-backend` : ✓ Running
- [ ] Service `gpxify-frontend` : ✓ Running

### 6.2 Tester l'API

```bash
# Health check
curl https://www.gpx.ninja/health

# Devrait retourner: {"status":"healthy","app":"GPXIFY"}

# API GPX test
curl https://www.gpx.ninja/api/v1/gpx/test

# Devrait retourner: {"message":"GPX API is running","version":"1.0.0"}
```

- [ ] Health check fonctionne
- [ ] API répond correctement

### 6.3 Tester dans le Navigateur

- [ ] Ouvrir https://www.gpx.ninja
- [ ] Vérifier le cadenas SSL (vert)
- [ ] L'interface s'affiche correctement
- [ ] Uploader le fichier `example.gpx`
- [ ] La carte s'affiche
- [ ] Le profil d'altitude s'affiche
- [ ] Les statistiques sont correctes

### 6.4 Tester OAuth Google

- [ ] Cliquer sur "Se connecter avec Google"
- [ ] Popup Google s'ouvre
- [ ] Sélectionner votre compte
- [ ] Autoriser l'application
- [ ] Redirection vers l'application
- [ ] Utilisateur connecté (nom/email affiché)

### 6.5 Vérifier les Logs

Dans Coolify, vérifier qu'il n'y a pas d'erreurs dans :
- [ ] Logs backend
- [ ] Logs frontend
- [ ] Logs database

**Status** : ⬜ À faire

---

## 🔧 ÉTAPE 7 : Configuration Post-Déploiement (10 min)

### 7.1 Backups Database

Dans Coolify :
- [ ] Service `gpxify-db` → Backups
- [ ] Activer **Automatic Backups**
- [ ] Fréquence: **Daily**
- [ ] Retention: **7 days**

### 7.2 Monitoring

- [ ] Créer compte sur UptimeRobot (gratuit)
- [ ] Ajouter monitor pour `https://www.gpx.ninja/health`
- [ ] Interval: 5 minutes
- [ ] Email alert si down

### 7.3 Documentation

- [ ] Noter l'URL de production dans CREDENTIALS.md
- [ ] Sauvegarder SECRET_KEY et POSTGRES_PASSWORD dans un gestionnaire de mots de passe (1Password, Bitwarden)
- [ ] Ne jamais commiter CREDENTIALS.md

**Status** : ⬜ À faire

---

## 🎉 ÉTAPE 8 : C'est Parti ! (facultatif)

### Partager

- [ ] Tester avec vos propres fichiers GPX
- [ ] Partager l'URL avec des amis cyclistes/randonneurs
- [ ] Créer un README public sur GitHub (sans secrets)

### Améliorations Futures

Voir [NEXT_STEPS.md](./NEXT_STEPS.md) pour :
- Phase 3 : Analyse de segments
- Phase 4 : Détection segments singuliers
- Phase 5 : Migration Auth0

**Status** : ⬜ À faire

---

## 📊 Récapitulatif

### Fichiers Créés pour le Déploiement

- ✅ `backend/Dockerfile` - Image Docker backend
- ✅ `backend/.dockerignore` - Optimisation build
- ✅ `frontend/Dockerfile` - Image Docker frontend (multi-stage)
- ✅ `frontend/.dockerignore` - Optimisation build
- ✅ `frontend/nginx.conf` - Configuration nginx
- ✅ `docker-compose.yml` - Orchestration des services
- ✅ `.env.production.example` - Template variables d'env
- ✅ `DEPLOY_COOLIFY.md` - Guide détaillé
- ✅ `CREDENTIALS.md` - Secrets (non commité)
- ✅ `DEPLOY_CHECKLIST.md` - Ce fichier

### URLs Importantes

- **Production** : https://www.gpx.ninja
- **API Docs** : https://www.gpx.ninja/docs
- **Health Check** : https://www.gpx.ninja/health
- **Google Console** : https://console.cloud.google.com/apis/credentials?project=pennylanneanalytics

### Credentials

Voir [CREDENTIALS.md](./CREDENTIALS.md) (fichier local uniquement, non commité)

---

## 🆘 Problèmes Courants

### Erreur 502 Bad Gateway
→ Backend pas prêt, attendre 30-60 secondes puis rafraîchir

### SSL ne fonctionne pas
→ Vérifier que DNS est propagé : `dig www.gpx.ninja`

### OAuth Google erreur redirect_uri_mismatch
→ Vérifier les URIs dans Google Cloud Console

### Upload ne fonctionne pas
→ Vérifier les logs backend dans Coolify

**Guide complet de dépannage** : [DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md)

---

## ✅ Validation Finale

Avant de considérer le déploiement comme réussi :

- [ ] DNS configuré et propagé
- [ ] Google OAuth configuré
- [ ] Secrets générés
- [ ] Code sur Git
- [ ] Déployé sur Coolify
- [ ] SSL actif
- [ ] Backend répond
- [ ] Frontend s'affiche
- [ ] Upload GPX fonctionne
- [ ] OAuth Google fonctionne
- [ ] Backups configurés
- [ ] Monitoring actif

---

**Temps total estimé** : 45-60 minutes

**Bonne chance ! 🚀**
