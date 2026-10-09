"""
Integration tests for the remaining API routers.

Covers a happy path + a 4xx/422 error path for each of:
contact, races (public), admin (PTP), ptp, share (retrieve/delete).

The SlowAPI limiter is disabled for this module so brute-force limits
(e.g. admin login 5/minute) do not cause 429 flakiness when the full
suite runs. External services (Anthropic, sunrise-sunset) are mocked.
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import status

from app.db.models import SharedState
from app.middleware.rate_limit import limiter
from app.services.ptp_service import PTPService
from app.services.race_service import RaceService
from app.models.race import RaceCreate, RaceUpdate


@pytest.fixture(autouse=True)
def _disable_limiter(monkeypatch):
    monkeypatch.setattr(limiter, "enabled", False)


SIMPLE_GPX = """<?xml version="1.0"?>
<gpx version="1.1" creator="t">
  <trk><name>R</name><trkseg>
    <trkpt lat="45.0" lon="6.0"><ele>1000</ele></trkpt>
    <trkpt lat="45.01" lon="6.01"><ele>1100</ele></trkpt>
  </trkseg></trk>
</gpx>"""


# --------------------------------------------------------------------------
# Contact
# --------------------------------------------------------------------------
class TestContactEndpoint:
    def test_send_dev_mode_success(self, client):
        resp = client.post(
            "/api/v1/contact/send",
            json={
                "name": "Alice",
                "email": "alice@example.com",
                "message": "Bonjour, ceci est un message de test.",
            },
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["success"] is True

    def test_send_invalid_email_422(self, client):
        resp = client.post(
            "/api/v1/contact/send",
            json={"name": "Alice", "email": "not-an-email", "message": "long enough message"},
        )
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_send_message_too_short_422(self, client):
        resp = client.post(
            "/api/v1/contact/send",
            json={"name": "Al", "email": "alice@example.com", "message": "short"},
        )
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# --------------------------------------------------------------------------
# Public races
# --------------------------------------------------------------------------
class TestRacesEndpoint:
    def test_list_published_races(self, client, db_session):
        # only published races are returned
        RaceService.create_race(
            db_session,
            RaceCreate(name="Hidden", slug="hidden", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        pub = RaceService.create_race(
            db_session,
            RaceCreate(name="Shown", slug="shown", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        RaceService.update_race(db_session, pub.id, RaceUpdate(is_published=True))

        resp = client.get("/api/v1/races")
        assert resp.status_code == status.HTTP_200_OK
        slugs = [r["slug"] for r in resp.json()]
        assert slugs == ["shown"]

    def test_get_published_race_by_slug(self, client, db_session):
        race = RaceService.create_race(
            db_session,
            RaceCreate(name="Detail", slug="detail", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        RaceService.update_race(db_session, race.id, RaceUpdate(is_published=True))

        resp = client.get("/api/v1/races/detail")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["slug"] == "detail"

    def test_get_unknown_slug_404(self, client):
        resp = client.get("/api/v1/races/does-not-exist")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_get_unpublished_race_404(self, client, db_session):
        RaceService.create_race(
            db_session,
            RaceCreate(name="Draft", slug="draft", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        resp = client.get("/api/v1/races/draft")
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# --------------------------------------------------------------------------
# Admin (PTP)
# --------------------------------------------------------------------------
class TestAdminEndpoint:
    def _login(self, client):
        resp = client.post("/api/v1/admin/login", json={"password": "admin123"})
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert body["success"] is True
        return body["token"]

    def test_login_and_list_races_with_token(self, client):
        token = self._login(client)
        resp = client.get("/api/v1/admin/races", headers={"x-admin-token": token})
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.json(), list)

    def test_login_wrong_password(self, client):
        resp = client.post("/api/v1/admin/login", json={"password": "wrong-pass"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["success"] is False

    def test_list_races_without_token_401(self, client):
        resp = client.get("/api/v1/admin/races")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_races_bad_token_403(self, client):
        resp = client.get("/api/v1/admin/races", headers={"x-admin-token": "bogus"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_create_race_and_get_and_delete(self, client):
        token = self._login(client)
        headers = {"x-admin-token": token}

        create = client.post(
            "/api/v1/admin/races",
            headers=headers,
            json={"name": "Admin Race", "slug": "admin-race", "gpx_content": SIMPLE_GPX},
        )
        assert create.status_code == status.HTTP_200_OK
        race_id = create.json()["id"]

        got = client.get(f"/api/v1/admin/races/{race_id}", headers=headers)
        assert got.status_code == status.HTTP_200_OK

        deleted = client.delete(f"/api/v1/admin/races/{race_id}", headers=headers)
        assert deleted.status_code == status.HTTP_200_OK

    def test_create_duplicate_slug_400(self, client):
        token = self._login(client)
        headers = {"x-admin-token": token}
        payload = {"name": "Dup", "slug": "dup-race", "gpx_content": SIMPLE_GPX}

        first = client.post("/api/v1/admin/races", headers=headers, json=payload)
        assert first.status_code == status.HTTP_200_OK

        second = client.post("/api/v1/admin/races", headers=headers, json=payload)
        assert second.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_race_not_found_404(self, client):
        token = self._login(client)
        import uuid

        resp = client.get(
            f"/api/v1/admin/races/{uuid.uuid4()}", headers={"x-admin-token": token}
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_logout_requires_header_422(self, client):
        resp = client.post("/api/v1/admin/logout")
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_parse_ravito_no_api_key_503(self, client, monkeypatch):
        # No ANTHROPIC_API_KEY configured and none in DB -> 503
        from app.core import config

        monkeypatch.setattr(config.settings, "ANTHROPIC_API_KEY", "", raising=False)
        token = self._login(client)
        resp = client.post(
            "/api/v1/admin/parse-ravito-table",
            headers={"x-admin-token": token},
            json={"raw_text": "some ravito text"},
        )
        assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


# --------------------------------------------------------------------------
# PTP sun-times
# --------------------------------------------------------------------------
class TestPtpEndpoint:
    def test_sun_times_success(self, client, monkeypatch):
        async def fake_get_sun_times(lat, lon, dates):
            from app.models.ptp import SunTimes

            return [
                SunTimes(
                    sunrise="2024-06-01T05:00:00+00:00",
                    sunset="2024-06-01T20:00:00+00:00",
                    civil_twilight_begin="2024-06-01T04:30:00+00:00",
                    civil_twilight_end="2024-06-01T20:30:00+00:00",
                    date=dates[0],
                )
            ]

        monkeypatch.setattr(PTPService, "get_sun_times", staticmethod(fake_get_sun_times))

        resp = client.post(
            "/api/v1/ptp/sun-times",
            json={"lat": 45.0, "lon": 6.0, "dates": ["2024-06-01"]},
        )
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert body["success"] is True
        assert len(body["sun_times"]) == 1

    def test_sun_times_missing_field_422(self, client):
        resp = client.post("/api/v1/ptp/sun-times", json={"lon": 6.0, "dates": ["2024-06-01"]})
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# --------------------------------------------------------------------------
# Share retrieve / delete (save endpoint is excluded: see task notes, the
# SlowAPI `request` param collision makes /share/save raise when the
# limiter is enabled -- a pre-existing latent bug, not touched here).
# --------------------------------------------------------------------------
def _make_share(db_session, share_id="abcd1234", expired=False):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires = now - timedelta(days=1) if expired else now + timedelta(days=30)
    row = SharedState(
        share_id=share_id,
        state_json={"activeTab": "analysis"},
        created_at=now,
        expires_at=expires,
        view_count=0,
    )
    db_session.add(row)
    db_session.commit()
    return row


class TestShareEndpoint:
    def test_get_shared_state_success(self, client, db_session):
        _make_share(db_session, "share001")
        resp = client.get("/api/v1/share/share001")
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert body["share_id"] == "share001"
        assert body["view_count"] == 1  # incremented on read

    def test_get_shared_state_not_found_404(self, client):
        resp = client.get("/api/v1/share/missing99")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_get_expired_share_410(self, client, db_session):
        _make_share(db_session, "expired01", expired=True)
        resp = client.get("/api/v1/share/expired01")
        assert resp.status_code == status.HTTP_410_GONE

    def test_delete_shared_state_success(self, client, db_session):
        _make_share(db_session, "todelete1")
        resp = client.delete("/api/v1/share/todelete1")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["success"] is True

    def test_delete_shared_state_not_found_404(self, client):
        resp = client.delete("/api/v1/share/nope1234")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
