# Database Standards - GPXIFY

Ce document définit les patterns et conventions pour la base de données GPXIFY.

---

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Database** | PostgreSQL |
| **ORM** | SQLAlchemy 2.0 |
| **Migrations** | Alembic 1.13 |
| **Async Driver** | asyncpg |

---

## Conventions de Nommage

### Tables
| Règle | Convention | Exemple |
|-------|------------|---------|
| Nom | `snake_case`, **singulier** | `track`, `share_link` |
| Préfixe | Aucun | `track` (pas `tbl_track`) |

### Colonnes
| Règle | Convention | Exemple |
|-------|------------|---------|
| Nom | `snake_case` | `created_at`, `file_size` |
| Primary Key | `id` | `id` (UUID ou serial) |
| Foreign Key | `{table}_id` | `track_id` |
| Timestamps | `created_at`, `updated_at` | - |
| Soft delete | `deleted_at` | Nullable datetime |

### Indexes
```sql
-- Naming convention
idx_{table}_{column}           -- Single column
idx_{table}_{col1}_{col2}      -- Composite
uniq_{table}_{column}          -- Unique constraint

-- Examples
idx_share_link_expires_at
idx_track_created_at
uniq_share_link_share_id
```

### Foreign Keys
```sql
-- Naming convention
fk_{from_table}_{to_table}

-- Example
fk_share_link_track
```

---

## Schema Design

### Structure Standard d'une Table
```python
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

class BaseModel(Base):
    """Base model with common columns."""

    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
```

### Exemple : Table ShareLink
```python
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID

class ShareLink(Base):
    """Shared GPX track link."""

    __tablename__ = "share_link"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    share_id = Column(String(12), unique=True, nullable=False, index=True)
    track_data = Column(JSON, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Indexes defined in __table_args__
    __table_args__ = (
        Index('idx_share_link_expires_at', 'expires_at'),
    )
```

---

## Migrations Alembic

### Commandes
```bash
# Appliquer toutes les migrations
alembic upgrade head

# Créer une nouvelle migration (auto-detect)
alembic revision --autogenerate -m "add share_link table"

# Créer une migration vide
alembic revision -m "manual migration description"

# Rollback dernière migration
alembic downgrade -1

# Voir l'état
alembic current
alembic history
```

### Convention de Nommage des Migrations
```
YYYYMMDD_HHMMSS_description.py

Exemples:
20260126_143022_create_share_link_table.py
20260126_150000_add_index_on_expires_at.py
```

### Template de Migration
```python
"""Add share_link table.

Revision ID: abc123
Revises: def456
Create Date: 2026-01-26 14:30:22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'abc123'
down_revision = 'def456'

def upgrade():
    op.create_table(
        'share_link',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('share_id', sa.String(12), nullable=False),
        sa.Column('track_data', sa.JSON, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_share_link_share_id', 'share_link', ['share_id'], unique=True)
    op.create_index('idx_share_link_expires_at', 'share_link', ['expires_at'])

def downgrade():
    op.drop_index('idx_share_link_expires_at')
    op.drop_index('idx_share_link_share_id')
    op.drop_table('share_link')
```

---

## Query Patterns

### Repository Pattern
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class ShareLinkRepository:
    """Repository for ShareLink operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_share_id(self, share_id: str) -> ShareLink | None:
        """Get share link by public share ID."""
        stmt = select(ShareLink).where(ShareLink.share_id == share_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, share_link: ShareLink) -> ShareLink:
        """Create new share link."""
        self.session.add(share_link)
        await self.session.commit()
        await self.session.refresh(share_link)
        return share_link

    async def delete_expired(self) -> int:
        """Delete expired share links. Returns count deleted."""
        stmt = delete(ShareLink).where(ShareLink.expires_at < func.now())
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount
```

### Éviter N+1 Queries
```python
# ❌ N+1 problem
tracks = await session.execute(select(Track))
for track in tracks.scalars():
    print(track.share_links)  # Lazy load = N additional queries

# ✅ Eager loading
from sqlalchemy.orm import selectinload

stmt = select(Track).options(selectinload(Track.share_links))
tracks = await session.execute(stmt)
```

### Transactions
```python
async def transfer_operation(session: AsyncSession):
    """Operations that must be atomic."""
    async with session.begin():
        # All operations in this block are in a single transaction
        await session.execute(...)
        await session.execute(...)
        # Commit automatic on exit, rollback on exception
```

---

## Performance

### Indexes à Créer
```python
# Colonnes souvent filtrées
Index('idx_share_link_expires_at', ShareLink.expires_at)

# Colonnes de lookup unique
Index('idx_share_link_share_id', ShareLink.share_id, unique=True)

# Colonnes combinées souvent utilisées ensemble
Index('idx_track_user_created', Track.user_id, Track.created_at)
```

### Connection Pooling
```python
# Configuration recommandée
DATABASE_URL = "postgresql+asyncpg://..."

engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,          # Connections permanentes
    max_overflow=10,      # Connections temporaires
    pool_timeout=30,      # Timeout acquisition
    pool_recycle=1800,    # Recycle connections (30 min)
)
```

### Query Timeout
```python
# Timeout par requête
from sqlalchemy import text

stmt = text("SELECT * FROM large_table").execution_options(timeout=5.0)
```

---

## Bonnes Pratiques

### ✅ À Faire
- Toujours utiliser des migrations pour les changements de schéma
- Indexer les colonnes utilisées dans les WHERE et JOIN
- Utiliser des transactions pour les opérations multi-tables
- Tester les migrations avec `downgrade` avant de commit
- Utiliser des UUID pour les IDs publics (pas d'énumération)

### ❌ À Éviter
- SQL brut avec interpolation de variables (injection)
- Lazy loading dans les boucles (N+1)
- Modifier le schéma sans migration
- Stocker des données JSON volumineuses (utiliser un fichier)
- Oublier les indexes sur les foreign keys

---

## Backup & Recovery

### Strategy
| Type | Fréquence | Rétention |
|------|-----------|-----------|
| Full backup | Daily | 30 jours |
| Incremental | Hourly | 7 jours |
| Transaction logs | Continuous | 7 jours |

### Commandes de Test
```bash
# Tester une restoration (périodiquement)
pg_restore -d gpxify_test backup.dump
```

---

## Schéma Actuel (Référence)

```sql
-- Tables principales
CREATE TABLE share_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id VARCHAR(12) UNIQUE NOT NULL,
    track_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_share_link_expires_at ON share_link(expires_at);
CREATE UNIQUE INDEX idx_share_link_share_id ON share_link(share_id);
```
