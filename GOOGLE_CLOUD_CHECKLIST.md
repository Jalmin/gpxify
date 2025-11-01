# ✅ Checklist - Configuration Google Cloud pour GPXIFY

Guide pas-à-pas avec cases à cocher pour configurer Google Cloud.

---

## 📋 ÉTAPE 1 : Créer le Projet Google Cloud

### Actions

- [ ] Aller sur https://console.cloud.google.com/
- [ ] Cliquer sur le sélecteur de projet (en haut à gauche, à côté de "Google Cloud")
- [ ] Cliquer sur **"New Project"** / **"Nouveau Projet"**
- [ ] Remplir les informations :
  - [ ] Project name: **GPXIFY**
  - [ ] Organization: (laisser par défaut ou sélectionner votre organisation)
  - [ ] Location: (laisser par défaut)
- [ ] Cliquer sur **"Create"** / **"Créer"**
- [ ] Attendre que le projet soit créé (notification en haut à droite)

### Vérifications

- [ ] Le projet "GPXIFY" apparaît dans la liste des projets
- [ ] Vous êtes maintenant dans le projet GPXIFY (nom visible en haut)

### Informations à Noter

```
Project ID: _______________________________
Project Number: _______________________________
```

💡 **Où trouver ces infos** : Dashboard > Project Info (carte en haut à gauche)

---

## 🔐 ÉTAPE 2 : Configurer l'Écran de Consentement OAuth

### 2.1 Accéder à l'écran de consentement

- [ ] Menu hamburger (☰) → **APIs & Services** → **OAuth consent screen**
- [ ] Vous êtes sur la page "OAuth consent screen"

### 2.2 Choisir le type d'utilisateur

- [ ] Sélectionner **"External"** (permet à n'importe qui de se connecter)
- [ ] Cliquer sur **"Create"** / **"Créer"**

### 2.3 Étape 1 - App information

- [ ] **App name**: Entrer **GPXIFY**
- [ ] **User support email**: Sélectionner votre email dans la liste déroulante
- [ ] **App logo** (optionnel): Ignorer pour l'instant
- [ ] **App domain** (optionnel): Ignorer pour l'instant
- [ ] **Authorized domains** (optionnel): Ignorer pour l'instant
- [ ] **Developer contact information** → Email addresses: Entrer votre email
- [ ] Cliquer sur **"Save and Continue"**

### 2.4 Étape 2 - Scopes

- [ ] Cliquer sur **"Add or Remove Scopes"**
- [ ] Dans le panneau qui s'ouvre, trouver et cocher :
  - [ ] `.../auth/userinfo.email` (View your email address)
  - [ ] `.../auth/userinfo.profile` (See your personal info)
  - [ ] `openid` (devrait être coché automatiquement)
- [ ] Cliquer sur **"Update"**
- [ ] Vérifier que les 3 scopes apparaissent dans le tableau
- [ ] Cliquer sur **"Add or Remove Scopes"** à nouveau
- [ ] Rechercher "drive" dans la barre de recherche
- [ ] Cocher :
  - [ ] `.../auth/drive.file` (View and manage Google Drive files and folders that you have opened or created with this app)
- [ ] Cliquer sur **"Update"**
- [ ] Vérifier que les 4 scopes sont dans le tableau
- [ ] Cliquer sur **"Save and Continue"**

### 2.5 Étape 3 - Test users

- [ ] Cliquer sur **"+ Add Users"**
- [ ] Entrer votre adresse email Gmail
- [ ] Cliquer sur **"Add"**
- [ ] Votre email apparaît dans la liste des test users
- [ ] Cliquer sur **"Save and Continue"**

### 2.6 Étape 4 - Summary

- [ ] Vérifier que tout est correct :
  - [ ] App name: GPXIFY
  - [ ] User support email: votre email
  - [ ] Scopes: 4 scopes (userinfo.email, userinfo.profile, openid, drive.file)
  - [ ] Test users: votre email
- [ ] Cliquer sur **"Back to Dashboard"**

### Vérifications

- [ ] Status de l'app: **"Testing"** (normal au début)
- [ ] Publishing status visible sur le dashboard

---

## 🔑 ÉTAPE 3 : Créer les Credentials OAuth 2.0

### 3.1 Accéder aux credentials

- [ ] Menu hamburger (☰) → **APIs & Services** → **Credentials**
- [ ] Vous êtes sur la page "Credentials"

### 3.2 Créer les credentials

- [ ] Cliquer sur **"+ Create Credentials"** (en haut)
- [ ] Sélectionner **"OAuth client ID"**

### 3.3 Configurer le client OAuth

- [ ] **Application type**: Sélectionner **"Web application"**
- [ ] **Name**: Entrer **GPXIFY Production**

### 3.4 Authorized JavaScript origins

- [ ] Cliquer sur **"+ Add URI"** sous "Authorized JavaScript origins"
- [ ] Entrer exactement : `https://gpxify.carapacebleue.com`
- [ ] Vérifier qu'il n'y a pas de slash à la fin
- [ ] Vérifier que c'est bien HTTPS (pas HTTP)

### 3.5 Authorized redirect URIs

- [ ] Cliquer sur **"+ Add URI"** sous "Authorized redirect URIs"
- [ ] Entrer exactement : `https://gpxify.carapacebleue.com/api/v1/auth/google/callback`
- [ ] Vérifier l'URI (pas de faute de frappe, pas d'espace)
- [ ] Cliquer sur **"+ Add URI"** à nouveau
- [ ] Entrer exactement : `https://gpxify.carapacebleue.com/auth/callback`
- [ ] Vérifier l'URI

### 3.6 Créer et sauvegarder

- [ ] Cliquer sur **"Create"**
- [ ] Une popup s'affiche avec vos credentials

### 3.7 IMPORTANT : Copier les credentials

⚠️ **NE PAS FERMER LA POPUP AVANT D'AVOIR COPIÉ**

- [ ] Copier le **Client ID** et le coller ici temporairement :
  ```
  Client ID: _______________________________
  ```

- [ ] Copier le **Client secret** et le coller ici temporairement :
  ```
  Client Secret: _______________________________
  ```

- [ ] Cliquer sur **"OK"** pour fermer la popup

### Vérifications

- [ ] Le client "GPXIFY Production" apparaît dans la liste
- [ ] Type: "Web application"
- [ ] Created date: aujourd'hui

---

## 🔧 ÉTAPE 4 : Activer Google Drive API

### 4.1 Accéder à la bibliothèque d'APIs

- [ ] Menu hamburger (☰) → **APIs & Services** → **Library**
- [ ] Vous êtes sur la page "API Library"

### 4.2 Rechercher Google Drive API

- [ ] Dans la barre de recherche, taper : **"Google Drive API"**
- [ ] Appuyer sur Entrée ou cliquer sur la loupe
- [ ] Cliquer sur la carte **"Google Drive API"**

### 4.3 Activer l'API

- [ ] Vous êtes sur la page de détails de Google Drive API
- [ ] Cliquer sur **"Enable"** / **"Activer"**
- [ ] Attendre quelques secondes
- [ ] Vous êtes redirigé vers la page "API/Service details"

### Vérifications

- [ ] Le bouton "Enable" est remplacé par "Manage"
- [ ] Message "API enabled" visible en haut

### 4.4 Vérifier les APIs activées

- [ ] Menu hamburger (☰) → **APIs & Services** → **Enabled APIs & services**
- [ ] Vérifier que ces APIs sont dans la liste :
  - [ ] Google Drive API
  - [ ] Google+ API (activé automatiquement)
  - [ ] Google Cloud APIs (activé par défaut)

---

## 📝 ÉTAPE 5 : Mettre à Jour les Fichiers de Configuration

### 5.1 Mettre à jour CREDENTIALS.md (local uniquement)

- [ ] Ouvrir le fichier `CREDENTIALS.md` sur votre Mac
- [ ] Remplacer les valeurs par vos nouveaux credentials :

```markdown
## Google OAuth Credentials (Projet GPXIFY)

Project ID: [COLLER_VOTRE_PROJECT_ID]
Project Number: [COLLER_VOTRE_PROJECT_NUMBER]

GOOGLE_CLIENT_ID=[COLLER_VOTRE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[COLLER_VOTRE_CLIENT_SECRET]
GOOGLE_REDIRECT_URI=https://gpxify.carapacebleue.com/api/v1/auth/google/callback
```

- [ ] Sauvegarder le fichier
- [ ] Vérifier que CREDENTIALS.md est dans .gitignore (ne sera pas commité)

### 5.2 Préparer les variables pour Coolify

- [ ] Copier vos credentials dans un fichier temporaire texte :

```env
GOOGLE_CLIENT_ID=[VOTRE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[VOTRE_CLIENT_SECRET]
GOOGLE_REDIRECT_URI=https://gpxify.carapacebleue.com/api/v1/auth/google/callback
```

- [ ] Garder ce fichier ouvert pour le copier dans Coolify plus tard

---

## 🧪 ÉTAPE 6 : Tester la Configuration (Optionnel en Local)

### 6.1 Mettre à jour .env local

- [ ] Ouvrir `backend/.env`
- [ ] Mettre à jour ces lignes :
```env
GOOGLE_CLIENT_ID=[VOTRE_NOUVEAU_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[VOTRE_NOUVEAU_CLIENT_SECRET]
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

### 6.2 Ajouter l'URI local dans Google Cloud

⚠️ **Uniquement si vous voulez tester en local**

- [ ] Retourner dans Google Cloud Console → Credentials
- [ ] Cliquer sur "GPXIFY Production"
- [ ] Sous "Authorized redirect URIs", ajouter :
  - [ ] `http://localhost:8000/api/v1/auth/google/callback`
- [ ] Cliquer sur "Save"

### 6.3 Tester en local

- [ ] Démarrer le backend : `cd backend && python -m app.main`
- [ ] Démarrer le frontend : `cd frontend && npm run dev`
- [ ] Aller sur http://localhost:5173
- [ ] Tester la connexion Google
- [ ] Vérifier que ça fonctionne

---

## 🚀 ÉTAPE 7 : Configuration Coolify

Ces variables seront à copier dans Coolify lors du déploiement.

### Variables à copier dans Coolify

```env
# Google OAuth
GOOGLE_CLIENT_ID=[VOTRE_CLIENT_ID_DU_PROJET_GPXIFY]
GOOGLE_CLIENT_SECRET=[VOTRE_CLIENT_SECRET_DU_PROJET_GPXIFY]
GOOGLE_REDIRECT_URI=https://gpxify.carapacebleue.com/api/v1/auth/google/callback
```

- [ ] Ces variables sont prêtes à être copiées dans Coolify
- [ ] Continuer avec [DEPLOY_START.md](./DEPLOY_START.md) pour le déploiement

---

## ✅ VÉRIFICATION FINALE

### Checklist complète

- [ ] ✅ Projet Google Cloud "GPXIFY" créé
- [ ] ✅ Project ID et Number notés
- [ ] ✅ OAuth consent screen configuré (External)
- [ ] ✅ App name: GPXIFY
- [ ] ✅ 4 scopes configurés (email, profile, openid, drive.file)
- [ ] ✅ Test user ajouté (votre email)
- [ ] ✅ OAuth client ID créé (GPXIFY Production)
- [ ] ✅ Authorized JavaScript origins: `https://gpxify.carapacebleue.com`
- [ ] ✅ Authorized redirect URIs:
  - `https://gpxify.carapacebleue.com/api/v1/auth/google/callback`
  - `https://gpxify.carapacebleue.com/auth/callback`
- [ ] ✅ Client ID et Secret copiés et sauvegardés
- [ ] ✅ Google Drive API activée
- [ ] ✅ CREDENTIALS.md mis à jour (local)
- [ ] ✅ Variables prêtes pour Coolify

### Informations Importantes

**Projet Google Cloud :**
- Project ID: `________________________`
- Project Number: `________________________`

**OAuth Credentials :**
- Client ID: `________________________`
- Client Secret: `________________________`

**URIs Configurées :**
- ✅ https://gpxify.carapacebleue.com
- ✅ https://gpxify.carapacebleue.com/api/v1/auth/google/callback
- ✅ https://gpxify.carapacebleue.com/auth/callback

**APIs Activées :**
- ✅ Google Drive API
- ✅ Google+ API

---

## 🔗 Liens Rapides

- **Console Google Cloud** : https://console.cloud.google.com/
- **Votre Projet** : https://console.cloud.google.com/home/dashboard?project=[VOTRE_PROJECT_ID]
- **Credentials** : https://console.cloud.google.com/apis/credentials?project=[VOTRE_PROJECT_ID]
- **OAuth Consent** : https://console.cloud.google.com/apis/credentials/consent?project=[VOTRE_PROJECT_ID]
- **APIs activées** : https://console.cloud.google.com/apis/dashboard?project=[VOTRE_PROJECT_ID]

---

## 🆘 Problèmes Courants

### ❌ "redirect_uri_mismatch"
**Cause** : URI mal orthographiée ou slash en trop
**Solution** : Vérifier caractère par caractère dans Google Cloud Console

### ❌ "Access blocked: This app's request is invalid"
**Cause** : Scopes manquants dans OAuth consent screen
**Solution** : Retourner dans OAuth consent screen → Scopes → Vérifier

### ❌ "This app isn't verified"
**Normal** : L'app est en mode "Testing"
**Solution** : Ajouter votre email dans test users, ou publier l'app plus tard

---

## ✅ C'est Fait !

Toutes les cases cochées ? Bravo ! 🎉

**Prochaine étape** : Retourner à [DEPLOY_START.md](./DEPLOY_START.md) pour déployer sur Coolify.

---

**Temps total** : ~15 minutes

**Dernière mise à jour** : 2024-11-01
