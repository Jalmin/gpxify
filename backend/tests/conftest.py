"""
Pytest configuration and fixtures for GPX Ninja tests
"""
import os
import pytest

# Set test database URL before importing the app
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'

from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


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
