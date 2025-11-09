# 🚀 Déploiement GPXIFY

Guide de déploiement pour l'application GPXIFY.

## 📋 Prérequis

- Docker et Docker Compose installés
- Accès à une base de données PostgreSQL (ou utiliser celle fournie dans docker-compose)
- Certificats SSL (Caddy s'en occupe automatiquement)

## ⚙️ Configuration

### 1. Variables d'environnement

Copiez le fichier d'exemple et remplissez les valeurs :

```bash
cp .env.example .env
```

**Variables critiques à configurer :**

- `SECRET_KEY` : Générez avec `openssl rand -hex 32`
- `POSTGRES_PASSWORD` : Mot de passe sécurisé pour PostgreSQL
- `DATABASE_URL` : URL de connexion à la base de données
- `BACKEND_CORS_ORIGINS` : Domaines autorisés pour CORS

### 2. Base de données

#### Option A : PostgreSQL externe

Si vous utilisez une base PostgreSQL existante :

```bash
# Dans .env
DATABASE_URL=postgresql://user:password@your-host:5432/your-db
```

#### Option B : PostgreSQL avec Docker (développement)

Ajoutez ce service dans `docker-compose.yml` :

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: gpxify-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-gpxify}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-gpxify}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - gpxify-network
    ports:
      - "5432:5432"  # Exposer pour accès local

volumes:
  postgres_data:
    driver: local
```

## 🗄️ Migrations de base de données

Les migrations Alembic s'exécutent **automatiquement** au démarrage du conteneur backend.

### Vérifier l'état des migrations

```bash
# Entrer dans le conteneur
docker exec -it gpxify-backend sh

# Voir l'état actuel
alembic current

# Voir l'historique
alembic history --verbose
```

### Créer une nouvelle migration (développement)

```bash
# Depuis le répertoire backend/
source venv/bin/activate

# Migration automatique (détecte les changements de modèles)
alembic revision --autogenerate -m "description de la migration"

# Vérifier le fichier généré dans alembic/versions/

# Tester localement
alembic upgrade head
```

### Rollback en cas de problème

```bash
# Revenir à la migration précédente
docker exec -it gpxify-backend alembic downgrade -1

# Revenir à une révision spécifique
docker exec -it gpxify-backend alembic downgrade abc123
```

## 🐳 Déploiement avec Docker

### Développement local

```bash
# Build et démarrage
docker-compose up --build -d

# Voir les logs
docker-compose logs -f

# Arrêt
docker-compose down
```

### Production

```bash
# Build avec optimisations
docker-compose -f docker-compose.yml up --build -d

# Healthcheck
docker-compose ps

# Logs en continu
docker-compose logs -f backend frontend
```

## 📊 Monitoring

### Health checks

Le backend expose un endpoint de santé :

```bash
curl http://localhost:8000/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Tous les services
docker-compose logs -f
```

## 🔒 Sécurité

### Checklist avant déploiement

- [ ] `SECRET_KEY` généré et unique
- [ ] `POSTGRES_PASSWORD` fort et sécurisé
- [ ] `.env` ajouté à `.gitignore`
- [ ] `DEBUG=False` en production
- [ ] CORS configuré avec les bons domaines
- [ ] HTTPS activé (Caddy le fait automatiquement)
- [ ] Backup de la base de données configuré

### Backup de la base de données

```bash
# Créer un backup
docker exec gpxify-db pg_dump -U gpxify gpxify > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer depuis un backup
docker exec -i gpxify-db psql -U gpxify gpxify < backup.sql
```

## 🔧 Maintenance

### Mise à jour de l'application

```bash
# 1. Pull les dernières modifications
git pull origin main

# 2. Rebuild les conteneurs
docker-compose up --build -d

# 3. Les migrations s'exécutent automatiquement au démarrage

# 4. Vérifier les logs
docker-compose logs -f backend
```

### Nettoyage

```bash
# Supprimer les conteneurs arrêtés
docker-compose down

# Supprimer les volumes (ATTENTION: perte de données!)
docker-compose down -v

# Nettoyer les images inutilisées
docker system prune -a
```

## 🆘 Troubleshooting

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs backend

# Erreurs courantes :
# - DATABASE_URL mal configuré
# - PostgreSQL pas accessible
# - Migrations échouées
```

### Erreur de migration

```bash
# Voir quelle migration est appliquée
docker exec -it gpxify-backend alembic current

# Forcer une révision (DANGER)
docker exec -it gpxify-backend alembic stamp head

# Rollback et retry
docker exec -it gpxify-backend alembic downgrade -1
docker exec -it gpxify-backend alembic upgrade head
```

### Base de données corrompue

```bash
# 1. Arrêter le backend
docker-compose stop backend

# 2. Restaurer depuis un backup
docker exec -i gpxify-db psql -U gpxify gpxify < backup.sql

# 3. Redémarrer
docker-compose start backend
```

## 📚 Ressources

- [Documentation Alembic](https://alembic.sqlalchemy.org/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)

## 📝 Changelog des migrations

### Migration `771ac4e61c55` - Initial Schema (2025-11-08)

Création du schéma initial avec la table `shared_states`:
- Support du partage anonyme d'états d'application
- Index optimisés pour les requêtes fréquentes
- Support PostgreSQL (JSONB) et SQLite (JSON)
- Gestion automatique de l'expiration (30 jours)
- Suivi des vues et métriques

---

**Dernière mise à jour:** 8 novembre 2025
