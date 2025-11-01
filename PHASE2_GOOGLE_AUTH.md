# Phase 2 - Google OAuth & Google Drive Integration

Ce document décrit les étapes pour implémenter Google OAuth et l'intégration Google Drive (Phase 2).

## Prérequis

1. Compte Google Cloud Platform
2. Phase 1 complète et fonctionnelle

## Étape 1 : Configuration Google Cloud Console

### 1.1 Créer un projet

1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet "GPXIFY"
3. Sélectionner le projet

### 1.2 Activer les APIs nécessaires

1. Aller dans "APIs & Services" > "Library"
2. Activer les APIs suivantes :
   - Google Drive API
   - Google OAuth2 API

### 1.3 Créer des identifiants OAuth 2.0

1. Aller dans "APIs & Services" > "Credentials"
2. Cliquer "Create Credentials" > "OAuth client ID"
3. Configurer l'écran de consentement OAuth :
   - Type d'application : Application Web
   - Nom : GPXIFY
   - Logo : (optionnel)
   - Domaine autorisé : localhost (pour dev)

4. Créer l'identifiant OAuth client ID :
   - Type d'application : Application Web
   - Nom : GPXIFY Web Client
   - Origines JavaScript autorisées :
     - http://localhost:5173
     - http://localhost:3000
   - URI de redirection autorisés :
     - http://localhost:8000/api/v1/auth/google/callback
     - http://localhost:5173/auth/callback

5. Copier :
   - Client ID
   - Client Secret

### 1.4 Configurer les scopes

Scopes nécessaires :
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/drive.file` (accès fichiers créés par l'app)
- `https://www.googleapis.com/auth/drive.readonly` (lecture fichiers GPX)

## Étape 2 : Backend - Configuration

### 2.1 Installer les dépendances

Dans `backend/requirements.txt`, décommenter :

```txt
# Google APIs
google-api-python-client==2.149.0
google-auth-httplib2==0.2.0
google-auth-oauthlib==1.2.1
```

Puis :
```bash
pip install -r requirements.txt
```

### 2.2 Ajouter les variables d'environnement

Dans `backend/.env` :

```env
GOOGLE_CLIENT_ID=votre_client_id_ici
GOOGLE_CLIENT_SECRET=votre_client_secret_ici
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
GOOGLE_DRIVE_FOLDER_NAME=GPXIFY
```

### 2.3 Créer le service Google Auth

Créer `backend/app/services/google_auth.py` :

```python
from authlib.integrations.starlette_client import OAuth
from app.core.config import settings

oauth = OAuth()

oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile https://www.googleapis.com/auth/drive.file'
    }
)
```

### 2.4 Créer les routes d'authentification

Créer `backend/app/api/auth.py` :

```python
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from app.services.google_auth import oauth
from app.core.config import settings

router = APIRouter()

@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user = token.get('userinfo')

    # TODO: Créer/récupérer utilisateur en base
    # TODO: Créer session JWT

    return {"email": user['email'], "name": user['name']}
```

### 2.5 Créer le service Google Drive

Créer `backend/app/services/google_drive.py` :

```python
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from google.oauth2.credentials import Credentials
import io

class GoogleDriveService:
    def __init__(self, credentials_dict):
        creds = Credentials(**credentials_dict)
        self.service = build('drive', 'v3', credentials=creds)

    def get_or_create_folder(self, folder_name='GPXIFY'):
        # Rechercher le dossier
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = self.service.files().list(q=query, fields="files(id, name)").execute()
        folders = results.get('files', [])

        if folders:
            return folders[0]['id']

        # Créer le dossier
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        folder = self.service.files().create(body=file_metadata, fields='id').execute()
        return folder['id']

    def upload_gpx(self, file_path, filename, folder_id):
        file_metadata = {
            'name': filename,
            'parents': [folder_id]
        }
        media = MediaFileUpload(file_path, mimetype='application/gpx+xml')
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink'
        ).execute()
        return file

    def list_gpx_files(self, folder_id):
        query = f"'{folder_id}' in parents and trashed=false"
        results = self.service.files().list(
            q=query,
            fields="files(id, name, createdTime, modifiedTime, size)"
        ).execute()
        return results.get('files', [])

    def download_gpx(self, file_id):
        request = self.service.files().get_media(fileId=file_id)
        file_content = io.BytesIO()
        downloader = MediaIoBaseDownload(file_content, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()

        file_content.seek(0)
        return file_content.read().decode('utf-8')
```

## Étape 3 : Frontend - Configuration

### 3.1 Installer les dépendances

```bash
npm install @react-oauth/google
```

### 3.2 Ajouter les variables d'environnement

Dans `frontend/.env` :

```env
VITE_GOOGLE_CLIENT_ID=votre_client_id_ici
VITE_API_URL=http://localhost:8000
```

### 3.3 Créer le composant GoogleAuth

Créer `frontend/src/components/Auth/GoogleLogin.tsx` :

```typescript
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onSuccess: (credentialResponse: any) => void;
  onError: () => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        useOneTap
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
      />
    </GoogleOAuthProvider>
  );
}
```

### 3.4 Créer le service API pour Google Drive

Créer `frontend/src/services/googleDrive.ts` :

```typescript
import apiClient from './api';

export const googleDriveApi = {
  listFiles: async () => {
    const response = await apiClient.get('/drive/files');
    return response.data;
  },

  uploadFile: async (fileId: string) => {
    const response = await apiClient.post('/drive/upload', { file_id: fileId });
    return response.data;
  },

  downloadFile: async (driveFileId: string) => {
    const response = await apiClient.get(`/drive/download/${driveFileId}`);
    return response.data;
  },
};
```

## Étape 4 : Tester l'intégration

### 4.1 Test authentification

1. Démarrer backend et frontend
2. Cliquer sur "Se connecter avec Google"
3. Autoriser l'application
4. Vérifier que le token est reçu

### 4.2 Test upload Google Drive

1. S'authentifier
2. Uploader un fichier GPX
3. Vérifier qu'il apparaît dans Google Drive dans le dossier "GPXIFY"

### 4.3 Test lecture Google Drive

1. S'authentifier
2. Lister les fichiers depuis Google Drive
3. Charger un fichier GPX depuis Google Drive
4. Vérifier l'affichage sur la carte

## Sécurité

### Bonnes pratiques :

1. **Tokens** : Stocker les tokens de manière sécurisée (httpOnly cookies)
2. **Scopes minimaux** : N'utiliser que les scopes nécessaires
3. **Validation** : Valider tous les tokens côté backend
4. **HTTPS** : Utiliser HTTPS en production (requis par Google)
5. **Refresh tokens** : Implémenter le rafraîchissement automatique

### Points d'attention :

- Ne jamais exposer le `CLIENT_SECRET` côté frontend
- Valider l'origine des requêtes (CORS)
- Implémenter rate limiting
- Logger les tentatives d'authentification

## Migration vers Auth0 (Phase 5)

Pour la Phase 5, Auth0 pourra gérer :
- Google OAuth
- Autres providers (GitHub, Facebook, etc.)
- MFA (authentification à deux facteurs)
- Gestion avancée des utilisateurs

L'architecture actuelle facilite cette migration car l'authentification est déjà centralisée dans le service auth.

## Ressources

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Python](https://developers.google.com/drive/api/guides/about-sdk)
- [Authlib FastAPI](https://docs.authlib.org/en/latest/client/fastapi.html)
- [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)

---

**Note** : Cette documentation sera mise à jour au fur et à mesure de l'implémentation de la Phase 2.
