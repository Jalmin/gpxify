# Database Migrations avec Alembic

Ce projet utilise **Alembic** pour gérer les migrations de base de données de manière versionnée et sécurisée.

## 📖 Pourquoi Alembic ?

Avant Alembic, le projet utilisait `Base.metadata.create_all()` qui :
- ❌ N'a pas d'historique de changements
- ❌ Ne permet pas de rollback
- ❌ Risque de perte de données en production

Avec Alembic :
- ✅ Versions de schéma trackées dans Git
- ✅ Rollback possible
- ✅ Migrations testables et reproductibles
- ✅ Safe pour la production

## 🚀 Commandes Principales

### 1. Créer une nouvelle migration

```bash
# Depuis le répertoire backend/
source venv/bin/activate

# Migration automatique (détecte les changements de modèles)
alembic revision --autogenerate -m "add user table"

# Migration manuelle (fichier vide à remplir)
alembic revision -m "add custom index"
```

### 2. Appliquer les migrations

```bash
# Appliquer toutes les migrations en attente
alembic upgrade head

# Appliquer jusqu'à une révision spécifique
alembic upgrade abc123

# Appliquer une migration à la fois
alembic upgrade +1
```

### 3. Annuler une migration (rollback)

```bash
# Revenir à la migration précédente
alembic downgrade -1

# Revenir à une révision spécifique
alembic downgrade abc123

# Revenir au début (ATTENTION: perte de données!)
alembic downgrade base
```

### 4. Voir l'historique

```bash
# Voir l'état actuel
alembic current

# Voir l'historique des migrations
alembic history --verbose

# Voir les migrations en attente
alembic heads
```

## 📂 Structure

```
backend/
├── alembic/
│   ├── versions/           # Fichiers de migration
│   │   └── 771ac4e61c55_initial_schema.py
│   ├── env.py             # Configuration Alembic
│   ├── script.py.mako     # Template pour nouvelles migrations
│   └── README             # Alembic README
├── alembic.ini            # Configuration Alembic
└── app/
    └── db/
        ├── database.py    # SQLAlchemy setup
        └── models.py      # Modèles de données
```

## 🔧 Configuration

### `alembic.ini`
- Configuré pour charger la DATABASE_URL depuis `app.core.config`
- Pas besoin de hardcoder les credentials

### `alembic/env.py`
- Importe automatiquement les modèles depuis `app.db.models`
- Utilise `Base.metadata` pour autogenerate
- Configure le logging

## 📝 Créer une Migration Manuelle

Exemple pour ajouter un index :

```python
"""add performance index

Revision ID: abc123
Revises: 771ac4e61c55
Create Date: 2025-11-08 16:00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'abc123'
down_revision = '771ac4e61c55'


def upgrade():
    # Ajouter index
    op.create_index(
        'ix_shared_states_ip_created',
        'shared_states',
        ['ip_address', 'created_at']
    )


def downgrade():
    # Supprimer index
    op.drop_index('ix_shared_states_ip_created', table_name='shared_states')
```

## 🐳 Docker & Production

### Dans docker-compose.yml

```yaml
services:
  backend:
    # ...
    command: >
      sh -c "
      alembic upgrade head &&
      uvicorn app.main:app --host 0.0.0.0 --port 8000
      "
```

### Dans Dockerfile

```dockerfile
# Copy alembic files
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Run migrations on startup
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0"]
```

## ⚠️ Bonnes Pratiques

### ✅ À FAIRE

1. **Toujours tester les migrations en local** avant la production
   ```bash
   alembic upgrade head  # Test upgrade
   alembic downgrade -1  # Test rollback
   alembic upgrade head  # Re-upgrade
   ```

2. **Versionner les migrations** dans Git
   ```bash
   git add alembic/versions/*.py
   git commit -m "feat: add user table migration"
   ```

3. **Documenter les migrations complexes**
   ```python
   def upgrade():
       """
       Add user authentication table

       This migration:
       - Creates users table with email/password
       - Adds unique constraint on email
       - Creates index on email for fast lookups
       """
   ```

4. **Utiliser des transactions** pour les migrations critiques
   ```python
   from alembic import op

   def upgrade():
       with op.batch_alter_table('shared_states') as batch_op:
           batch_op.add_column(sa.Column('new_field', sa.String()))
   ```

### ❌ À ÉVITER

1. **Ne jamais modifier une migration déjà appliquée en production**
   - Créer une nouvelle migration à la place

2. **Ne pas supprimer des migrations** du répertoire `versions/`
   - Alembic a besoin de l'historique complet

3. **Ne pas faire de changements destructifs sans backup**
   ```python
   # ❌ DANGEREUX sans backup
   def upgrade():
       op.drop_column('users', 'old_data')

   # ✅ MIEUX: Migration en 2 étapes
   # Migration 1: Ajouter nouvelle colonne
   # Migration 2: (après validation) Supprimer ancienne
   ```

## 🔄 Workflow de Migration

### Développement Local

1. Modifier le modèle dans `app/db/models.py`
2. Créer la migration: `alembic revision --autogenerate -m "description"`
3. Vérifier le fichier généré dans `alembic/versions/`
4. Tester: `alembic upgrade head`
5. Tester rollback: `alembic downgrade -1`
6. Commit: `git add alembic/versions/*.py && git commit`

### Déploiement Production

1. Pull les dernières migrations: `git pull`
2. Backup de la DB: `pg_dump gpxify > backup_$(date +%Y%m%d).sql`
3. Appliquer: `alembic upgrade head`
4. Vérifier: Tester l'application
5. En cas de problème: `alembic downgrade -1` + restore backup

## 📊 Migrations Existantes

### `771ac4e61c55_initial_schema.py`

Création du schéma initial avec la table `shared_states`:

- **Champs:**
  - `id` (PK)
  - `share_id` (unique, 12 chars)
  - `state_json` (JSONB)
  - `created_at`, `expires_at`
  - `view_count`, `last_accessed_at`
  - `ip_address`, `user_agent`, `file_size_bytes`

- **Index:**
  - `ix_shared_states_id` (PK index)
  - `ix_shared_states_share_id` (unique, pour lookups rapides)
  - `ix_shared_states_created_at` (pour analytics)
  - `ix_shared_states_expires_at` (pour cleanup jobs)

## 🆘 Dépannage

### Erreur: "Target database is not up to date"

```bash
# Voir quelle migration est appliquée
alembic current

# Voir l'historique
alembic history

# Appliquer les migrations manquantes
alembic upgrade head
```

### Erreur: "Can't locate revision identified by 'xxx'"

```bash
# Recreate alembic_version table
alembic stamp head
```

### Conflit de révision (plusieurs branches)

```bash
# Lister les heads
alembic heads

# Merger les branches
alembic merge -m "merge migrations" head1 head2
```

## 📚 Ressources

- [Documentation Alembic](https://alembic.sqlalchemy.org/)
- [SQLAlchemy 2.0 Migration](https://docs.sqlalchemy.org/en/20/changelog/migration_20.html)
- [FastAPI + Alembic Guide](https://fastapi.tiangolo.com/tutorial/sql-databases/#alembic-note)

---

**Dernière mise à jour:** 8 novembre 2025
**Version Alembic:** 1.13.1
**Version SQLAlchemy:** 2.0.35
