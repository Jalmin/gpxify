"""
Database models
Define your SQLAlchemy models here
"""
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.db.database import Base


# TODO: Define your models here
# Example model:
class ExampleModel(Base):
    """Example database model"""

    __tablename__ = "examples"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ExampleModel(id={self.id}, name={self.name})>"
