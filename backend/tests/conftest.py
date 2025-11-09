"""
Pytest configuration and fixtures for GPX Ninja tests
"""
import os
import pytest

# Set test database URL before importing the app
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.database import Base, get_db

# Create test database engine
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for tests"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create tables before each test and drop after"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """FastAPI test client with database override"""
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def sample_gpx_simple():
    """Simple GPX file with 3 points for testing"""
    return """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Ninja Test">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="45.0" lon="6.0">
        <ele>1000</ele>
        <time>2024-01-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="45.01" lon="6.01">
        <ele>1100</ele>
        <time>2024-01-01T10:10:00Z</time>
      </trkpt>
      <trkpt lat="45.02" lon="6.02">
        <ele>1050</ele>
        <time>2024-01-01T10:20:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>"""


@pytest.fixture
def sample_gpx_with_climb():
    """GPX file with significant climb for testing"""
    return """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Ninja Test">
  <trk>
    <name>Climb Test</name>
    <trkseg>
      <trkpt lat="45.0" lon="6.0">
        <ele>1000</ele>
      </trkpt>
      <trkpt lat="45.005" lon="6.005">
        <ele>1200</ele>
      </trkpt>
      <trkpt lat="45.01" lon="6.01">
        <ele>1400</ele>
      </trkpt>
      <trkpt lat="45.015" lon="6.015">
        <ele>1300</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>"""
