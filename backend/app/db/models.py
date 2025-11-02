"""
SQLAlchemy database models
"""
from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timedelta
from app.db.database import Base


class SharedState(Base):
    """
    Model for storing shared application states (anonymous sharing)

    Users can save their work and get a shareable URL without authentication
    """
    __tablename__ = "shared_states"

    id = Column(Integer, primary_key=True, index=True)
    share_id = Column(String(12), unique=True, index=True, nullable=False)
    state_json = Column(JSONB, nullable=False)  # Complete application state
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=30), nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)  # For rate limiting
    user_agent = Column(Text, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)  # For monitoring storage

    def __repr__(self):
        return f"<SharedState(share_id={self.share_id}, created_at={self.created_at})>"

    def is_expired(self) -> bool:
        """Check if this shared state has expired"""
        return datetime.utcnow() > self.expires_at

    def increment_view_count(self):
        """Increment view counter and update last access time"""
        self.view_count += 1
        self.last_accessed_at = datetime.utcnow()
