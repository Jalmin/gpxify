"""
Tests for share API endpoints
"""
import pytest
from datetime import datetime, timedelta, timezone
from fastapi import status
from sqlalchemy.orm import Session
from app.db.models import SharedState


def test_save_state_success(client):
    """Test successful state save"""
    state_data = {
        "state_json": {
            "gpxFiles": [{"filename": "test.gpx", "data": "..."}],
            "activeTab": "analysis"
        }
    }

    response = client.post("/api/v1/share/save", json=state_data)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert "share_id" in data
    assert len(data["share_id"]) == 8
    assert data["url"].startswith("/share/")
    assert "expires_at" in data

    # Verify expiration date is ~30 days from now
    expires_at_str = data["expires_at"].replace('Z', '+00:00')
    expires_at = datetime.fromisoformat(expires_at_str)
    # Handle both aware and naive datetimes from API
    if expires_at.tzinfo is None:
        now = datetime.now()
    else:
        now = datetime.now(timezone.utc)
    time_diff = (expires_at - now).days
    assert 29 <= time_diff <= 30


def test_save_state_too_large(client):
    """Test rejection of state > 50MB"""
    # Create a large state (>50MB)
    large_data = "x" * (51 * 1024 * 1024)  # 51MB
    state_data = {
        "state_json": {
            "large_field": large_data
        }
    }

    response = client.post("/api/v1/share/save", json=state_data)

    assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    assert "too large" in response.json()["detail"].lower()


def test_save_state_empty(client):
    """Test saving empty state"""
    state_data = {
        "state_json": {}
    }

    response = client.post("/api/v1/share/save", json=state_data)

    # Empty state should be accepted (valid JSON)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True


def test_save_state_complex_nested(client):
    """Test saving complex nested state"""
    state_data = {
        "state_json": {
            "gpxFiles": [
                {
                    "id": "file1",
                    "filename": "track1.gpx",
                    "stats": {
                        "distance": 42.5,
                        "elevation_gain": 1200,
                        "climbs": [
                            {"name": "Col A", "elevation": 2000},
                            {"name": "Col B", "elevation": 2500}
                        ]
                    }
                }
            ],
            "settings": {
                "units": "metric",
                "theme": "dark"
            }
        }
    }

    response = client.post("/api/v1/share/save", json=state_data)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True

    # Retrieve and verify structure is preserved
    share_id = data["share_id"]
    get_response = client.get(f"/api/v1/share/{share_id}")
    assert get_response.status_code == status.HTTP_200_OK
    retrieved = get_response.json()

    assert retrieved["state_json"]["gpxFiles"][0]["stats"]["climbs"][1]["name"] == "Col B"
    assert retrieved["state_json"]["settings"]["theme"] == "dark"


def test_get_shared_state_success(client):
    """Test successful retrieval of shared state"""
    # First, create a share
    state_data = {
        "state_json": {
            "test": "data",
            "number": 42
        }
    }

    save_response = client.post("/api/v1/share/save", json=state_data)
    share_id = save_response.json()["share_id"]

    # Then retrieve it
    response = client.get(f"/api/v1/share/{share_id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["share_id"] == share_id
    assert data["state_json"]["test"] == "data"
    assert data["state_json"]["number"] == 42
    assert "created_at" in data
    assert data["view_count"] == 1


def test_get_shared_state_not_found(client):
    """Test retrieval of non-existent share"""
    response = client.get("/api/v1/share/nonexistent")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


def test_get_shared_state_increment_view_count(client):
    """Test that view count increments on each access"""
    # Create share
    state_data = {"state_json": {"test": "view_count"}}
    save_response = client.post("/api/v1/share/save", json=state_data)
    share_id = save_response.json()["share_id"]

    # Access multiple times
    for expected_count in range(1, 6):
        response = client.get(f"/api/v1/share/{share_id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["view_count"] == expected_count


def test_get_shared_state_expired(client):
    """Test retrieval of expired share"""
    # This test requires direct DB manipulation to create an expired share
    # We'll use the app's database session
    from app.db.database import SessionLocal

    db = SessionLocal()
    try:
        # Create expired share directly in DB
        # Use naive datetime for SQLite compatibility
        now = datetime.now()
        expired_share = SharedState(
            share_id="expired1",
            state_json={"test": "expired"},
            expires_at=now - timedelta(days=1),  # Expired yesterday
            created_at=now - timedelta(days=31)
        )
        db.add(expired_share)
        db.commit()

        # Try to retrieve
        response = client.get("/api/v1/share/expired1")

        assert response.status_code == status.HTTP_410_GONE
        assert "expired" in response.json()["detail"].lower()

        # Verify it was deleted (don't refresh the expired object, just query)
        deleted_share = db.query(SharedState).filter(SharedState.share_id == "expired1").first()
        assert deleted_share is None

    finally:
        db.close()


def test_delete_shared_state_success(client):
    """Test successful deletion of share"""
    # Create share
    state_data = {"state_json": {"test": "delete"}}
    save_response = client.post("/api/v1/share/save", json=state_data)
    share_id = save_response.json()["share_id"]

    # Delete it
    response = client.delete(f"/api/v1/share/{share_id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert "deleted" in data["message"].lower()

    # Verify it's gone
    get_response = client.get(f"/api/v1/share/{share_id}")
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_shared_state_not_found(client):
    """Test deletion of non-existent share"""
    response = client.delete("/api/v1/share/nonexistent")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


def test_share_id_uniqueness(client):
    """Test that multiple shares get unique IDs"""
    state_data = {"state_json": {"test": "uniqueness"}}

    share_ids = set()
    for _ in range(10):
        response = client.post("/api/v1/share/save", json=state_data)
        assert response.status_code == status.HTTP_200_OK
        share_id = response.json()["share_id"]
        share_ids.add(share_id)

    # All IDs should be unique
    assert len(share_ids) == 10


def test_save_state_preserves_special_characters(client):
    """Test that special characters are preserved in state"""
    state_data = {
        "state_json": {
            "text": "Hello 世界 🌍",
            "symbols": "< > & \" '",
            "unicode": "Zürich, São Paulo"
        }
    }

    save_response = client.post("/api/v1/share/save", json=state_data)
    share_id = save_response.json()["share_id"]

    # Retrieve and verify
    get_response = client.get(f"/api/v1/share/{share_id}")
    retrieved = get_response.json()

    assert retrieved["state_json"]["text"] == "Hello 世界 🌍"
    assert retrieved["state_json"]["symbols"] == "< > & \" '"
    assert retrieved["state_json"]["unicode"] == "Zürich, São Paulo"


def test_save_state_with_null_values(client):
    """Test that null values are preserved"""
    state_data = {
        "state_json": {
            "value": None,
            "nested": {
                "also_null": None,
                "not_null": "value"
            }
        }
    }

    save_response = client.post("/api/v1/share/save", json=state_data)
    share_id = save_response.json()["share_id"]

    # Retrieve and verify
    get_response = client.get(f"/api/v1/share/{share_id}")
    retrieved = get_response.json()

    assert retrieved["state_json"]["value"] is None
    assert retrieved["state_json"]["nested"]["also_null"] is None
    assert retrieved["state_json"]["nested"]["not_null"] == "value"


def test_concurrent_share_creation(client):
    """Test that concurrent share creation works correctly"""
    import concurrent.futures

    state_data = {"state_json": {"test": "concurrent"}}

    def create_share():
        response = client.post("/api/v1/share/save", json=state_data)
        return response.status_code, response.json().get("share_id")

    # Create 5 shares concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(create_share) for _ in range(5)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    # All should succeed
    for status_code, share_id in results:
        assert status_code == status.HTTP_200_OK
        assert share_id is not None

    # All share IDs should be unique
    share_ids = [r[1] for r in results]
    assert len(set(share_ids)) == 5


def test_save_state_tracks_metadata(client):
    """Test that IP and user-agent are tracked"""
    from app.db.database import SessionLocal

    state_data = {"state_json": {"test": "metadata"}}

    # Save with custom headers
    response = client.post(
        "/api/v1/share/save",
        json=state_data,
        headers={"User-Agent": "TestBot/1.0"}
    )

    assert response.status_code == status.HTTP_200_OK
    share_id = response.json()["share_id"]

    # Check database record
    db = SessionLocal()
    try:
        share = db.query(SharedState).filter(SharedState.share_id == share_id).first()
        assert share is not None
        assert share.user_agent == "TestBot/1.0"
        assert share.ip_address is not None
        assert share.file_size_bytes > 0
    finally:
        db.close()


def test_save_state_invalid_json_structure(client):
    """Test validation of request structure"""
    # Missing state_json field
    response = client.post("/api/v1/share/save", json={})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_get_multiple_shares_isolation(client):
    """Test that different shares return different data"""
    # Create two different shares
    state1 = {"state_json": {"id": 1, "data": "first"}}
    state2 = {"state_json": {"id": 2, "data": "second"}}

    response1 = client.post("/api/v1/share/save", json=state1)
    response2 = client.post("/api/v1/share/save", json=state2)

    share_id1 = response1.json()["share_id"]
    share_id2 = response2.json()["share_id"]

    # Retrieve both
    get1 = client.get(f"/api/v1/share/{share_id1}")
    get2 = client.get(f"/api/v1/share/{share_id2}")

    # Verify isolation
    assert get1.json()["state_json"]["id"] == 1
    assert get1.json()["state_json"]["data"] == "first"
    assert get2.json()["state_json"]["id"] == 2
    assert get2.json()["state_json"]["data"] == "second"
