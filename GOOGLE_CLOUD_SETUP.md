# Configuration Google Cloud pour GPXIFY - Nouveau Projet

Guide pour créer un projet Google Cloud dédié à GPXIFY (recommandé).

---

## 🎯 Option Recommandée : Nouveau Projet

Créer un projet Google Cloud séparé pour GPXIFY plutôt que réutiliser PennylaneProject.

**Avantages** :
- Séparation claire des projets
- Quotas API indépendants
- Meilleure sécurité
- Facturation séparée

---

## 📝 ÉTAPE 1 : Créer le Projet Google Cloud (5 min)

### 1.1 Accéder à Google Cloud Console

Aller sur : https://console.cloud.google.com/

### 1.2 Créer un nouveau projet

1. Cliquer sur le sélecteur de projet (en haut à gauche)
2. Cliquer sur **"New Project"** / **"Nouveau Projet"**
3. Remplir :
   ```
   Project name: GPXIFY
   Organization: (laisser par défaut ou choisir)
   Location: (laisser par défaut)
   ```
4. Cliquer **"Create"** / **"Créer"**
5. Attendre quelques secondes que le projet soit créé

### 1.3 Noter les informations du projet

Une fois créé, noter :
- **Project ID** : (ex: `gpxify-123456`)
- **Project Number** : (ex: `123456789012`)

Ces informations sont visibles dans **Dashboard** > **Project Info**

---

## 🔑 ÉTAPE 2 : Créer les Credentials OAuth 2.0 (5 min)

### 2.1 Configurer l'écran de consentement OAuth

1. Dans le menu : **APIs & Services** > **OAuth consent screen**

2. Choisir **External** (pour permettre à n'importe qui de se connecter)
   - Cliquer **Create**

3. **App information** :
   ```
   App name: GPXIFY
   User support email: [votre email]

   Developer contact information:
   Email addresses: [votre email]
   ```

4. **Scopes** (étape 2) :
   - Cliquer **Add or Remove Scopes**
   - Sélectionner :
     ✅ `userinfo.email`
     ✅ `userinfo.profile`
     ✅ `auth/drive.file` (pour Google Drive)
   - Cliquer **Update**

5. **Test users** (étape 3) :
   - Ajouter votre email comme test user
   - Cliquer **Add Users**
   - Entrer votre email
   - Cliquer **Save and Continue**

6. **Summary** (étape 4) :
   - Vérifier et cliquer **Back to Dashboard**

### 2.2 Créer les credentials OAuth

1. Menu : **APIs & Services** > **Credentials**

2. Cliquer **+ Create Credentials** > **OAuth client ID**

3. Configurer :
   ```
   Application type: Web application
   Name: GPXIFY Production
   ```

4. **Authorized JavaScript origins** :
   - Cliquer **+ Add URI**
   - Ajouter :
   ```
   https://gpxify.carapacebleue.com
   ```

5. **Authorized redirect URIs** :
   - Cliquer **+ Add URI**
   - Ajouter :
   ```
   https://gpxify.carapacebleue.com/api/v1/auth/google/callback
   ```
   - Cliquer **+ Add URI** à nouveau
   - Ajouter :
   ```
   https://gpxify.carapacebleue.com/auth/callback
   ```

6. Cliquer **Create**

7. **IMPORTANT** : Une popup s'affiche avec vos credentials :
   ```
   Client ID: [copier et sauvegarder]
   Client secret: [copier et sauvegarder]
   ```

   ⚠️ **Copier ces valeurs immédiatement** dans un fichier temporaire.

---

## 🔧 ÉTAPE 3 : Activer les APIs nécessaires (3 min)

### 3.1 Activer Google Drive API

1. Menu : **APIs & Services** > **Library**

2. Rechercher : **"Google Drive API"**

3. Cliquer sur **Google Drive API**

4. Cliquer **Enable** / **Activer**

### 3.2 Vérifier les APIs activées

Menu : **APIs & Services** > **Enabled APIs & services**

Vous devriez voir :
- ✅ Google Drive API
- ✅ Google+ API (activé automatiquement pour OAuth)

---

## 📋 ÉTAPE 4 : Mettre à jour les Variables d'Environnement

### 4.1 Nouveau Client ID et Secret

Remplacer dans vos fichiers de configuration :

**Ancien (PennylaneProject)** :
```env
GOOGLE_CLIENT_ID=646813821201-le0dqlhd1qr7r3v93rn4ni101ce9ltku.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

**Nouveau (GPXIFY)** :
```env
GOOGLE_CLIENT_ID=[VOTRE_NOUVEAU_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[VOTRE_NOUVEAU_CLIENT_SECRET]
GOOGLE_REDIRECT_URI=https://gpxify.carapacebleue.com/api/v1/auth/google/callback
```

### 4.2 Mettre à jour CREDENTIALS.md (local)

Éditer le fichier `CREDENTIALS.md` (qui n'est pas dans Git) :

```markdown
## Google OAuth Credentials (Projet GPXIFY dédié)

Project ID: [VOTRE_PROJECT_ID]
Project Number: [VOTRE_PROJECT_NUMBER]

GOOGLE_CLIENT_ID=[VOTRE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[VOTRE_CLIENT_SECRET]
```

### 4.3 Mettre à jour les variables Coolify

Dans Coolify, mettre à jour les variables :

1. Aller dans votre projet GPXIFY
2. Onglet **Environment Variables**
3. Modifier :
   ```env
   GOOGLE_CLIENT_ID=[NOUVEAU_CLIENT_ID]
   GOOGLE_CLIENT_SECRET=[NOUVEAU_CLIENT_SECRET]
   ```
4. Sauvegarder
5. Redéployer l'application

---

## ✅ ÉTAPE 5 : Tester la Configuration

### 5.1 En local (optionnel)

```bash
# Mettre à jour .env local
cd backend
nano .env

# Modifier GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET
# Sauvegarder et relancer

python -m app.main
```

Tester : http://localhost:8000/docs

### 5.2 En production (après déploiement Coolify)

1. Aller sur https://gpxify.carapacebleue.com
2. Cliquer sur "Se connecter avec Google"
3. Popup Google s'ouvre
4. Sélectionner votre compte
5. Accepter les permissions :
   - Voir votre adresse email
   - Voir vos informations personnelles de base
   - Accéder à Google Drive (pour sauvegarder les GPX)
6. Redirection vers l'application
7. Vous êtes connecté !

---

## 🔒 Sécurité et Bonnes Pratiques

### Quotas et Limites

Google Cloud offre :
- **100 requêtes/100 secondes** par utilisateur (gratuit)
- **10,000 requêtes/jour** pour Drive API (gratuit)

Si vous dépassez :
- Activer la facturation (carte bancaire requise)
- Quotas augmentés automatiquement

### Environnements

**Recommandation** : Créer 2 clients OAuth :

1. **GPXIFY Development**
   - Redirect URI : `http://localhost:8000/api/v1/auth/google/callback`
   - Pour développement local

2. **GPXIFY Production** (celui créé ci-dessus)
   - Redirect URI : `https://gpxify.carapacebleue.com/api/v1/auth/google/callback`
   - Pour production

### Surveillance

Dans Google Cloud Console :
- **APIs & Services** > **Dashboard**
  - Voir les quotas utilisés
  - Voir les erreurs API
  - Traffic en temps réel

---

## 🆘 Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URI de redirection ne correspond pas

**Solution** :
1. Vérifier que l'URI dans Google Cloud Console est exactement :
   ```
   https://gpxify.carapacebleue.com/api/v1/auth/google/callback
   ```
2. Vérifier que `GOOGLE_REDIRECT_URI` dans Coolify est identique
3. Pas d'espace, pas de slash final

### Erreur : "Access blocked: This app's request is invalid"

**Cause** : Scopes mal configurés

**Solution** :
1. Retourner dans **OAuth consent screen**
2. Vérifier que les scopes sont bien ajoutés
3. Cliquer **Publish App** si demandé

### App en mode "Testing"

Si l'app est en mode **Testing** :
- Seuls les test users peuvent se connecter
- Ajouter votre email dans test users
- Ou passer en **Production** (nécessite vérification Google si beaucoup d'utilisateurs)

---

## 📊 Récapitulatif

### Ce qui a été créé

- ✅ Projet Google Cloud : "GPXIFY"
- ✅ OAuth consent screen configuré
- ✅ OAuth client ID créé
- ✅ Redirect URIs configurés
- ✅ Google Drive API activée
- ✅ Scopes configurés

### Prochaines étapes

1. ✅ Copier le Client ID et Client Secret
2. ✅ Mettre à jour CREDENTIALS.md (local)
3. ✅ Mettre à jour variables dans Coolify
4. ✅ Redéployer l'application
5. ✅ Tester l'authentification Google

---

## 🔗 Liens Utiles

- **Google Cloud Console** : https://console.cloud.google.com/
- **Projet GPXIFY** : https://console.cloud.google.com/home/dashboard?project=[VOTRE_PROJECT_ID]
- **Credentials** : https://console.cloud.google.com/apis/credentials?project=[VOTRE_PROJECT_ID]
- **OAuth Consent** : https://console.cloud.google.com/apis/credentials/consent?project=[VOTRE_PROJECT_ID]
- **Drive API Dashboard** : https://console.cloud.google.com/apis/api/drive.googleapis.com?project=[VOTRE_PROJECT_ID]

---

## ✅ Checklist Finale

Avant de passer au déploiement Coolify :

- [ ] Projet Google Cloud "GPXIFY" créé
- [ ] OAuth consent screen configuré
- [ ] Client ID OAuth créé
- [ ] Redirect URIs ajoutés (https://gpxify.carapacebleue.com/...)
- [ ] Google Drive API activée
- [ ] Client ID et Secret copiés dans CREDENTIALS.md
- [ ] Variables d'env mises à jour dans Coolify
- [ ] Test users ajoutés (votre email)

---

**Temps total** : ~15 minutes

**Prêt pour le déploiement !** Retourner à [DEPLOY_START.md](./DEPLOY_START.md)
