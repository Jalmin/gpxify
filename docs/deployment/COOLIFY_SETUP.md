# Configuration PostgreSQL pour Coolify

Ce guide explique comment configurer la base de données PostgreSQL nécessaire pour la fonctionnalité de partage sur Coolify.

## Prérequis

- Application GPXIFY déployée sur Coolify
- Accès à l'interface Coolify

## Étapes de configuration

### 1. Créer une base de données PostgreSQL

Dans Coolify :

1. Allez dans **Resources** > **Databases**
2. Cliquez sur **+ New Database**
3. Sélectionnez **PostgreSQL**
4. Configurez :
   - **Name**: `gpxify-db`
   - **Version**: PostgreSQL 16 (recommandé)
   - **Database Name**: `gpxify`
   - **Username**: `gpxify`
   - **Password**: Générer un mot de passe fort (ou utiliser celui généré automatiquement)

5. Cliquez sur **Create**

### 2. Lier la base de données à l'application

Une fois la base créée :

1. Notez les informations de connexion :
   - **Host**: généralement le nom du conteneur (ex: `gpxify-db`)
   - **Port**: `5432` (par défaut)
   - **Database**: `gpxify`
   - **Username**: `gpxify`
   - **Password**: (celui que vous avez défini)

2. Dans votre application GPXIFY sur Coolify, allez dans **Environment Variables**

3. Ajoutez/Mettez à jour ces variables :

```bash
# Database (PostgreSQL)
POSTGRES_DB=gpxify
POSTGRES_USER=gpxify
POSTGRES_PASSWORD=votre_mot_de_passe_fort_ici

# Database URL (format: postgresql://user:password@host:port/database)
DATABASE_URL=postgresql://gpxify:votre_mot_de_passe@gpxify-db:5432/gpxify
```

### 3. Configuration dans docker-compose.yml

Le fichier `docker-compose.yml` est déjà configuré pour PostgreSQL. Assurez-vous que :

1. Le service `db` est présent et configuré
2. Le backend dépend du service `db` (ligne `depends_on`)
3. Les deux services sont sur le même réseau Coolify

### 4. Initialisation de la base de données

Au premier déploiement, les tables seront créées automatiquement grâce au code d'initialisation dans `backend/app/db/database.py` (fonction `init_db()`).

### 5. Vérification

Pour vérifier que tout fonctionne :

1. Accédez à votre application : `https://www.gpx.ninja`
2. Uploadez un fichier GPX
3. Cliquez sur le bouton **Partager**
4. Si un lien court apparaît (format `/share/abc12345`), c'est bon ! ✅

Si vous obtenez une erreur 500, vérifiez :
- Les logs du backend dans Coolify
- Que la variable `DATABASE_URL` est correctement définie
- Que la base de données est accessible depuis le conteneur backend

## Variables d'environnement complètes

Voici toutes les variables nécessaires pour le déploiement en production :

```bash
# Application
APP_NAME=GPXIFY
ENVIRONMENT=production
DEBUG=False

# Domain
DOMAIN=www.gpx.ninja
VITE_API_URL=https://www.gpx.ninja

# CORS
BACKEND_CORS_ORIGINS=https://www.gpx.ninja

# Security
SECRET_KEY=<générer avec: openssl rand -hex 32>

# Database
POSTGRES_DB=gpxify
POSTGRES_USER=gpxify
POSTGRES_PASSWORD=<mot_de_passe_fort>
DATABASE_URL=postgresql://gpxify:<mot_de_passe>@gpxify-db:5432/gpxify

# Google OAuth (optionnel pour l'authentification future)
GOOGLE_CLIENT_ID=<votre_client_id>
GOOGLE_CLIENT_SECRET=<votre_client_secret>
GOOGLE_REDIRECT_URI=https://www.gpx.ninja/api/v1/auth/google/callback
```

## Commandes utiles

### Vérifier la connexion à la base

```bash
# Dans le conteneur backend
docker exec -it gpxify-backend python -c "from app.db.database import engine; print(engine.url)"
```

### Voir les tables créées

```bash
# Dans le conteneur PostgreSQL
docker exec -it gpxify-db psql -U gpxify -d gpxify -c "\dt"
```

### Nettoyer les partages expirés (optionnel)

Les partages expirent automatiquement après 30 jours. Pour nettoyer manuellement :

```bash
docker exec -it gpxify-db psql -U gpxify -d gpxify -c "DELETE FROM shared_states WHERE expires_at < NOW();"
```

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │ API calls
         ↓
┌─────────────────┐      ┌──────────────┐
│   Backend       │◄────►│  PostgreSQL  │
│   (FastAPI)     │      │   Database   │
└─────────────────┘      └──────────────┘
         ↑                      ↑
         └──────────────────────┘
           Same Coolify network
```

## Fonctionnalité de partage

Une fois configuré, le système de partage permet :

- ✅ URLs courtes et propres : `/share/abc12345`
- ✅ Stockage sécurisé des états partagés
- ✅ Expiration automatique après 30 jours
- ✅ Rate limiting (10 partages par minute par IP)
- ✅ Limite de taille (50MB par partage)
- ✅ Statistiques de vues

## Support

En cas de problème :
1. Consultez les logs Coolify du backend
2. Vérifiez la connectivité réseau entre les conteneurs
3. Assurez-vous que `DATABASE_URL` est correctement formatée
