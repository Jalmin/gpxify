# Déploiement GPXIFY sur Coolify (Hetzner)

Ce guide vous aide à déployer GPXIFY sur votre serveur Hetzner avec Coolify.

## 📋 Prérequis

- ✅ Serveur Hetzner avec Coolify installé
- ✅ Domaine: `www.gpx.ninja`
- ✅ Accès Git au projet
- ✅ Credentials Google OAuth (trouvés dans PennylaneProject)

## 🌐 Configuration DNS

**Important** : Configurez votre DNS AVANT de déployer

### Chez votre registrar DNS (ex: Cloudflare, OVH, etc.)

Ajoutez un enregistrement A :

```
Type: A
Name: gpxify
Value: [IP_PUBLIQUE_DE_VOTRE_SERVEUR_HETZNER]
TTL: Auto ou 3600
```

**Résultat** : `www.gpx.ninja` → IP de votre serveur Hetzner

### Vérifier la propagation DNS

```bash
# Depuis votre machine locale
dig www.gpx.ninja

# Ou
nslookup www.gpx.ninja
```

⏰ La propagation DNS peut prendre quelques minutes à quelques heures.

## 🔧 Configuration Google Cloud Console

### Étape 1 : Ajouter les URIs de redirection

1. Aller sur https://console.cloud.google.com/
2. Sélectionner le projet **pennylanneanalytics**
3. Aller dans **APIs & Services** > **Credentials**
4. Cliquer sur le client OAuth **646813821201-le0dqlhd1qr7r3v93rn4ni101ce9ltku**

### Étape 2 : Ajouter les origines autorisées

Dans **Authorized JavaScript origins**, ajouter :
```
https://www.gpx.ninja
```

### Étape 3 : Ajouter les URIs de redirection

Dans **Authorized redirect URIs**, ajouter :
```
https://www.gpx.ninja/api/v1/auth/google/callback
https://www.gpx.ninja/auth/callback
```

### Étape 4 : Activer Google Drive API

1. Aller dans **APIs & Services** > **Library**
2. Rechercher "Google Drive API"
3. Cliquer **Enable**

## 🚀 Déploiement sur Coolify

### Option 1 : Déploiement via Git (Recommandé)

#### 1. Initialiser Git (si pas déjà fait)

```bash
cd /Users/loicjalmin/Projects/GPXIFY

# Initialiser le repo Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - GPXIFY Phase 2 ready for Coolify"

# Ajouter votre remote (GitHub, GitLab, etc.)
git remote add origin https://github.com/votre-username/gpxify.git

# Push
git push -u origin main
```

#### 2. Dans Coolify

1. **Créer un nouveau projet**
   - Dashboard → New Project → "GPXIFY"

2. **Ajouter une nouvelle ressource**
   - Type: **Docker Compose**
   - Source: **Git Repository**

3. **Configuration Git**
   - Repository: `https://github.com/votre-username/gpxify.git`
   - Branch: `main`
   - Build Pack: **Docker Compose**

4. **Configuration du déploiement**
   - Compose File Path: `docker-compose.yml`
   - Base Directory: `/`

5. **Domaine**
   - Dans l'onglet "Domains"
   - Ajouter: `www.gpx.ninja`
   - Coolify générera automatiquement le certificat SSL Let's Encrypt

### Option 2 : Upload manuel (Alternative)

Si vous n'utilisez pas Git, vous pouvez :
1. Compresser le projet : `tar -czf gpxify.tar.gz GPXIFY/`
2. Uploader via SFTP sur le serveur
3. Dans Coolify, créer un "Local Compose" pointant vers le dossier

## 🔐 Variables d'Environnement dans Coolify

Dans Coolify, aller dans votre projet → **Environment Variables** :

### Variables OBLIGATOIRES

```env
# Application
APP_NAME=GPXIFY
ENVIRONMENT=production
DEBUG=False
DOMAIN=www.gpx.ninja
VITE_API_URL=https://www.gpx.ninja

# CORS
BACKEND_CORS_ORIGINS=https://www.gpx.ninja

# Google OAuth
GOOGLE_CLIENT_ID=646813821201-le0dqlhd1qr7r3v93rn4ni101ce9ltku.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://www.gpx.ninja/api/v1/auth/google/callback

# Database
POSTGRES_DB=gpxify
POSTGRES_USER=gpxify
POSTGRES_PASSWORD=[GENERER_MOT_DE_PASSE_FORT]

# Security (générer avec: openssl rand -hex 32)
SECRET_KEY=[GENERER_CLE_SECRETE]
```

### Générer les secrets

Sur votre machine locale :

```bash
# Générer SECRET_KEY
openssl rand -hex 32

# Générer POSTGRES_PASSWORD
openssl rand -base64 32
```

Copier ces valeurs dans Coolify.

## 📦 Structure des Services Coolify

Coolify va créer 3 services :

1. **gpxify-db** (PostgreSQL 16)
   - Port interne: 5432
   - Volume: `postgres_data`

2. **gpxify-backend** (FastAPI)
   - Port: 8000
   - Volume: `gpx_uploads`
   - Health check: `/health`

3. **gpxify-frontend** (React + Nginx)
   - Port: 80 (exposé via reverse proxy Coolify)
   - SSL automatique via Let's Encrypt

## 🔄 Déployer

Dans Coolify :

1. Vérifier que toutes les variables d'env sont configurées
2. Cliquer sur **Deploy**
3. Suivre les logs en temps réel

**Temps de déploiement** : 5-10 minutes (première fois)

## ✅ Vérification Post-Déploiement

### 1. Vérifier les services

Dans Coolify, tous les services doivent être **✓ Running** (verts)

### 2. Tester l'application

```bash
# Health check backend
curl https://www.gpx.ninja/api/v1/gpx/test

# Devrait retourner:
# {"message":"GPX API is running","version":"1.0.0"}

# Health check global
curl https://www.gpx.ninja/health
```

### 3. Tester dans le navigateur

1. Ouvrir https://www.gpx.ninja
2. Vérifier le SSL (cadenas vert)
3. Uploader un fichier GPX
4. Tester l'authentification Google (bouton "Se connecter")

### 4. Vérifier les logs

Dans Coolify :
- Onglet **Logs** de chaque service
- Vérifier qu'il n'y a pas d'erreurs

## 🐛 Dépannage

### Erreur 502 Bad Gateway

**Causes possibles** :
1. Backend pas encore démarré (attendre 30s)
2. Variables d'env manquantes
3. Database pas prête

**Solution** :
```bash
# Dans Coolify, vérifier les logs du backend
# Si erreur de connexion DB, redémarrer les services dans l'ordre:
# 1. db
# 2. backend
# 3. frontend
```

### SSL ne fonctionne pas

**Vérifier** :
1. DNS bien configuré (ping www.gpx.ninja)
2. Port 80 et 443 ouverts sur le serveur
3. Coolify peut accéder à Let's Encrypt

**Solution** :
```bash
# Dans Coolify, onglet Domains
# Cliquer "Regenerate SSL Certificate"
```

### OAuth Google ne fonctionne pas

**Erreur** : `redirect_uri_mismatch`

**Solution** :
1. Vérifier dans Google Cloud Console que les URIs sont bien ajoutées
2. Vérifier que `GOOGLE_REDIRECT_URI` dans Coolify est exacte
3. URL doit être en HTTPS (pas HTTP)

### Upload de fichiers échoue

**Vérifier** :
1. Volume `gpx_uploads` est bien monté
2. Permissions du dossier uploads (dans les logs backend)

**Solution dans Coolify** :
```bash
# Se connecter au container backend
# Dans Coolify : service backend → Terminal

# Vérifier le dossier uploads
ls -la /app/uploads

# Créer si nécessaire
mkdir -p /app/uploads
chmod 777 /app/uploads
```

## 🔄 Mises à Jour (CI/CD)

### Déploiement manuel

Après avoir modifié le code :

```bash
# Commit les changements
git add .
git commit -m "Update: description des changements"
git push

# Dans Coolify, cliquer "Redeploy"
```

### Déploiement automatique

Dans Coolify :
1. Aller dans **Settings** du projet
2. Activer **Auto Deploy**
3. Coolify redéploiera automatiquement à chaque push sur main

## 📊 Monitoring

### Dans Coolify

- **Logs** : Accès en temps réel à tous les logs
- **Resources** : CPU, RAM, Disk usage
- **Health Checks** : Status de chaque service

### Logs utiles

```bash
# Voir les logs backend
docker compose logs -f backend

# Voir les logs frontend
docker compose logs -f frontend

# Voir les logs database
docker compose logs -f db
```

## 🔒 Sécurité Post-Déploiement

### À faire immédiatement

1. **Firewall** : S'assurer que seuls les ports 80, 443, 22 sont ouverts
2. **Fail2ban** : Activer sur le serveur Hetzner
3. **Backups** : Configurer backups automatiques de la base PostgreSQL
4. **Monitoring** : Installer Uptime monitoring (UptimeRobot)

### Dans Coolify

1. **Backups Database** :
   - Coolify → Service DB → Backups
   - Configurer backup quotidien

2. **Secrets Rotation** :
   - Changer SECRET_KEY tous les 3-6 mois
   - Changer POSTGRES_PASSWORD régulièrement

## 📈 Optimisations Futures

1. **CDN** : Ajouter Cloudflare devant l'application
2. **Scaling** : Augmenter replicas du backend si trafic important
3. **Cache** : Ajouter Redis pour caching (Phase 5)
4. **Monitoring** : Ajouter Sentry pour error tracking

## 🆘 Support

En cas de problème :

1. **Logs Coolify** : Toujours commencer par vérifier les logs
2. **Documentation Coolify** : https://coolify.io/docs
3. **Discord Coolify** : https://coollabs.io/discord

## ✅ Checklist Finale

Avant de considérer le déploiement réussi :

- [ ] DNS configuré et propagé
- [ ] Google Cloud Console configuré (URIs de redirection)
- [ ] Variables d'env toutes configurées dans Coolify
- [ ] Secrets générés (SECRET_KEY, POSTGRES_PASSWORD)
- [ ] Déploiement terminé (tous les services verts)
- [ ] SSL actif (HTTPS fonctionne)
- [ ] Backend répond : https://www.gpx.ninja/health
- [ ] Frontend s'affiche : https://www.gpx.ninja
- [ ] Upload GPX fonctionne
- [ ] OAuth Google fonctionne
- [ ] Backups configurés

---

**Félicitations ! GPXIFY est en production ! 🎉**

URL: https://www.gpx.ninja
