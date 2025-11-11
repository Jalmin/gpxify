# 🚀 Déploiement GPXIFY - Démarrage Rapide

## Pour Hetzner + Coolify + www.gpx.ninja

---

## 📍 Vous êtes ici

Vous avez le code complet de GPXIFY Phase 2 prêt à déployer sur Coolify.

**Ce qu'il faut savoir** :
- ✅ Code 100% prêt (backend FastAPI + frontend React + PostgreSQL)
- ✅ Credentials Google OAuth trouvés (du projet PennylaneProject)
- ✅ Docker configuré (3 services: db, backend, frontend)
- ✅ Documentation complète

---

## ⚡ Démarrage Ultra-Rapide (3 étapes)

### 1️⃣ Configuration DNS (2 min)

Ajoutez un record A dans votre DNS :

```
Type: A
Name: gpxify
Value: [IP_PUBLIQUE_VOTRE_SERVEUR_HETZNER]
```

**Question** : Quelle est l'IP de votre serveur Hetzner ?
→ Connectez-vous à votre panel Hetzner pour la trouver

### 2️⃣ Configuration Google (15 min)

**🎯 Option Recommandée** : Créer un nouveau projet Google Cloud pour GPXIFY

➡️ **Suivre le guide complet** : [GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md)

**Résumé rapide** :
1. Créer nouveau projet "GPXIFY" sur Google Cloud
2. Configurer OAuth consent screen
3. Créer OAuth client ID
4. Ajouter redirect URIs :
   ```
   https://www.gpx.ninja/api/v1/auth/google/callback
   https://www.gpx.ninja/auth/callback
   ```
5. Activer Google Drive API
6. Copier Client ID et Client Secret

**Alternative** : Réutiliser credentials PennylaneProject (moins recommandé)
- Voir [CREDENTIALS.md](./CREDENTIALS.md) pour les credentials existants

### 3️⃣ Déployer sur Coolify (10 min)

#### A. Pusher le code sur Git

```bash
cd /Users/loicjalmin/Projects/GPXIFY
git init
git add .
git commit -m "Ready for production"
git remote add origin https://github.com/VOTRE-USERNAME/gpxify.git
git push -u origin main
```

#### B. Dans Coolify

1. **New Project** → "GPXIFY"
2. **Add Resource** → Docker Compose
3. **Git Repository** → Votre URL Git
4. **Domaine** → `www.gpx.ninja`
5. **Variables d'environnement** → Voir ci-dessous
6. **Deploy** → Cliquer et attendre 5-10 min

---

## 🔐 Variables d'Environnement pour Coolify

**Copier-coller ces variables** dans Coolify → Environment Variables :

```env
# Application
APP_NAME=GPXIFY
ENVIRONMENT=production
DEBUG=False
DOMAIN=www.gpx.ninja
VITE_API_URL=https://www.gpx.ninja

# CORS
BACKEND_CORS_ORIGINS=https://www.gpx.ninja

# Google OAuth (⚠️ UTILISER VOS PROPRES CREDENTIALS - voir GOOGLE_CLOUD_SETUP.md)
GOOGLE_CLIENT_ID=[VOTRE_CLIENT_ID_DU_NOUVEAU_PROJET_GPXIFY]
GOOGLE_CLIENT_SECRET=[VOTRE_CLIENT_SECRET_DU_NOUVEAU_PROJET_GPXIFY]
GOOGLE_REDIRECT_URI=https://www.gpx.ninja/api/v1/auth/google/callback

# ℹ️ Alternative : Credentials PennylaneProject (moins recommandé)
# GOOGLE_CLIENT_ID=646813821201-le0dqlhd1qr7r3v93rn4ni101ce9ltku.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=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

# Database
POSTGRES_DB=gpxify
POSTGRES_USER=gpxify
```

**Variables à GÉNÉRER** :

```bash
# Sur votre Mac, exécuter :
openssl rand -hex 32       # → Copier le résultat pour SECRET_KEY
openssl rand -base64 32    # → Copier le résultat pour POSTGRES_PASSWORD
```

Puis ajouter dans Coolify :

```env
SECRET_KEY=[COLLER_ICI_LE_RÉSULTAT_DE_openssl_rand_-hex_32]
POSTGRES_PASSWORD=[COLLER_ICI_LE_RÉSULTAT_DE_openssl_rand_-base64_32]
```

---

## ✅ Vérification (2 min)

Après le déploiement, tester :

```bash
# 1. API Health Check
curl https://www.gpx.ninja/health
# Devrait retourner: {"status":"healthy","app":"GPXIFY"}

# 2. API GPX Test
curl https://www.gpx.ninja/api/v1/gpx/test
# Devrait retourner: {"message":"GPX API is running","version":"1.0.0"}
```

Puis dans le navigateur :
1. https://www.gpx.ninja → Interface s'affiche
2. Uploader `example.gpx` → Carte et profil s'affichent
3. Tester Google OAuth → Connexion fonctionne

---

## 📚 Documentation Détaillée

Si vous avez besoin de plus de détails :

| Fichier | Pour quoi ? |
|---------|-------------|
| [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) | Checklist étape par étape complète |
| [DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md) | Guide complet avec dépannage |
| [CREDENTIALS.md](./CREDENTIALS.md) | Tous les credentials (LOCAL, non commité) |
| [docker-compose.yml](./docker-compose.yml) | Configuration des services |

---

## 🆘 Problème ?

### DNS ne se propage pas
→ Attendre 5-30 min, vérifier avec `dig www.gpx.ninja`

### Coolify erreur 502
→ Attendre 30-60 secondes que le backend démarre

### OAuth Google erreur
→ Vérifier que les URIs sont bien dans Google Cloud Console

### Autre problème
→ Consulter [DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md) section Dépannage

---

## 🎯 Résultat Final

Après ces 3 étapes, vous aurez :

- ✅ https://www.gpx.ninja en ligne
- ✅ SSL automatique (HTTPS)
- ✅ Upload de fichiers GPX
- ✅ Carte interactive
- ✅ Profil d'altitude
- ✅ Authentification Google
- ✅ Base de données PostgreSQL
- ✅ Backups automatiques

**Temps total** : ~20 minutes

---

## 📞 IP de votre serveur Hetzner

**ACTION REQUISE** : Quelle est l'IP publique de votre serveur Hetzner ?

Pour la trouver :
1. Connectez-vous à https://console.hetzner.cloud/
2. Sélectionnez votre serveur
3. Copiez l'adresse IPv4

**Puis configurez le DNS avec cette IP.**

---

**C'est parti ! 🚀**

Suivez les 3 étapes ci-dessus et vous aurez GPXIFY en production dans 20 minutes.
