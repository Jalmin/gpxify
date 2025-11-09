"""
SQLAlchemy database models
"""
from sqlalchemy import Column, String, DateTime, Integer, Text, Index, JSON
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timedelta, timezone
from app.db.database import Base


class SharedState(Base):
    """
    Model for storing shared application states (anonymous sharing)

    Users can save their work and get a shareable URL without authentication
    """
    __tablename__ = "shared_states"

    id = Column(Integer, primary_key=True, index=True)
    share_id = Column(String(12), unique=True, index=True, nullable=False)
    # Use JSON.with_variant to support both PostgreSQL (JSONB) and SQLite (JSON)
    state_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)  # Complete application state
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    expires_at = Column(DateTime, default=lambda: datetime.now(timezone.utc) + timedelta(days=30), nullable=False, index=True)
    view_count = Column(Integer, default=0, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)  # For rate limiting
    user_agent = Column(Text, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)  # For monitoring storage

    # Composite index for efficient cleanup queries
    __table_args__ = (
        Index('ix_expires_created', 'expires_at', 'created_at'),
    )

    def __repr__(self):
        return f"<SharedState(share_id={self.share_id}, created_at={self.created_at})>"

    def is_expired(self) -> bool:
        """Check if this shared state has expired"""
        now = datetime.now(timezone.utc)
        # Handle both timezone-aware (PostgreSQL) and naive (SQLite) datetimes
        if self.expires_at.tzinfo is None:
            # SQLite: naive datetime, compare with naive now
            now = now.replace(tzinfo=None)
        return now > self.expires_at

    def increment_view_count(self):
        """Increment view counter and update last access time"""
        self.view_count += 1
        now = datetime.now(timezone.utc)
        # Handle both timezone-aware (PostgreSQL) and naive (SQLite) datetimes
        if self.created_at and self.created_at.tzinfo is None:
            # SQLite: store as naive datetime
            now = now.replace(tzinfo=None)
        self.last_accessed_at = now
