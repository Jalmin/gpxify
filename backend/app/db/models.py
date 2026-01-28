"""
SQLAlchemy database models
"""
from sqlalchemy import Column, String, DateTime, Integer, Text, Index, JSON, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta, timezone
import uuid
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


class Race(Base):
    """
    Model for storing race information (UTMB, CCC, TDS, etc.)
    """
    __tablename__ = "races"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)  # "UTMB 2024"
    slug = Column(String(100), unique=True, nullable=False, index=True)  # "utmb-2024"
    gpx_content = Column(Text, nullable=False)  # Raw GPX content
    total_distance_km = Column(Float, nullable=True)
    total_elevation_gain = Column(Integer, nullable=True)
    total_elevation_loss = Column(Integer, nullable=True)
    start_location_lat = Column(Float, nullable=True)
    start_location_lon = Column(Float, nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship to aid stations
    aid_stations = relationship("RaceAidStation", back_populates="race", cascade="all, delete-orphan", order_by="RaceAidStation.position_order")

    def __repr__(self):
        return f"<Race(name={self.name}, slug={self.slug})>"


class RaceAidStation(Base):
    """
    Model for storing aid stations (ravitaillements) for a race
    """
    __tablename__ = "race_aid_stations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    race_id = Column(UUID(as_uuid=True), ForeignKey("races.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    distance_km = Column(Float, nullable=False)
    elevation = Column(Integer, nullable=True)  # Altitude of the aid station
    type = Column(String(20), nullable=False)  # 'eau', 'bouffe', 'assistance'
    services = Column(ARRAY(String), nullable=True)  # ['eau', 'boissons', 'solide', 'douche']
    cutoff_time = Column(String(50), nullable=True)  # "Wed 08:45 PM" barrier time
    position_order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship to race
    race = relationship("Race", back_populates="aid_stations")

    def __repr__(self):
        return f"<RaceAidStation(name={self.name}, distance_km={self.distance_km})>"


class AdminSettings(Base):
    """
    Key-value store for admin settings (password hash, secret URL, etc.)
    """
    __tablename__ = "admin_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)

    def __repr__(self):
        return f"<AdminSettings(key={self.key})>"
