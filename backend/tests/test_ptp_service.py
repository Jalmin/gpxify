"""
Unit tests for PTPService.

External dependencies are fully mocked:
- the Anthropic client (the ``anthropic`` package is not installed here,
  so we inject a fake module into ``sys.modules``);
- httpx for the sunrise-sunset.org API.

No real network calls are made.
"""
import sys
import types

import httpx
import pytest

from app.models.race import RavitoType
from app.services.ptp_service import PTPService


# --------------------------------------------------------------------------
# Fake Anthropic client helpers
# --------------------------------------------------------------------------
def _install_fake_anthropic(monkeypatch, response_text):
    """Install a fake ``anthropic`` module returning ``response_text``."""
    fake = types.ModuleType("anthropic")

    class _Messages:
        def create(self, **kwargs):
            content_block = types.SimpleNamespace(text=response_text)
            return types.SimpleNamespace(content=[content_block])

    class _Anthropic:
        def __init__(self, api_key=None):
            self.messages = _Messages()

    fake.Anthropic = _Anthropic
    monkeypatch.setitem(sys.modules, "anthropic", fake)


class TestParseRavitoTable:
    async def test_happy_path_parses_ravitos(self, monkeypatch):
        payload = """Voici le resultat:
{
  "ravitos": [
    {"name": "Refuge", "distance_km": 12.5, "elevation": 1800, "type": "assistance", "services": ["eau", "solide"], "cutoff_time": "10:00"},
    {"name": "Fontaine", "distance_km": 25.0, "elevation": "900", "type": "eau"}
  ],
  "race_name": "UTMB",
  "total_distance": 42.0
}"""
        _install_fake_anthropic(monkeypatch, payload)

        result = await PTPService.parse_ravito_table_with_claude("raw", "fake-key")

        assert result.race_name == "UTMB"
        assert result.total_distance == 42.0
        assert len(result.ravitos) == 2
        assert result.ravitos[0].type == RavitoType.ASSISTANCE
        assert result.ravitos[0].elevation == 1800
        # elevation given as a numeric string -> coerced to int
        assert result.ravitos[1].elevation == 900

    async def test_unknown_type_falls_back_to_bouffe(self, monkeypatch):
        payload = '{"ravitos": [{"name": "X", "distance_km": 1.0, "type": "wat", "elevation": null}]}'
        _install_fake_anthropic(monkeypatch, payload)

        result = await PTPService.parse_ravito_table_with_claude("raw", "fake-key")

        assert result.ravitos[0].type == RavitoType.BOUFFE
        assert result.ravitos[0].elevation is None

    async def test_invalid_elevation_becomes_none(self, monkeypatch):
        payload = '{"ravitos": [{"name": "X", "distance_km": 1.0, "type": "eau", "elevation": "abc"}]}'
        _install_fake_anthropic(monkeypatch, payload)

        result = await PTPService.parse_ravito_table_with_claude("raw", "fake-key")

        assert result.ravitos[0].elevation is None

    async def test_no_json_raises_valueerror(self, monkeypatch):
        _install_fake_anthropic(monkeypatch, "aucun json ici")

        with pytest.raises(ValueError):
            await PTPService.parse_ravito_table_with_claude("raw", "fake-key")

    async def test_malformed_json_raises_valueerror(self, monkeypatch):
        _install_fake_anthropic(monkeypatch, "{ this is : not valid json }")

        with pytest.raises(ValueError, match="Failed to parse"):
            await PTPService.parse_ravito_table_with_claude("raw", "fake-key")

    async def test_missing_package_raises_valueerror(self, monkeypatch):
        # Ensure the anthropic import fails
        monkeypatch.setitem(sys.modules, "anthropic", None)

        with pytest.raises(ValueError, match="not installed"):
            await PTPService.parse_ravito_table_with_claude("raw", "fake-key")


# --------------------------------------------------------------------------
# Fake httpx client helpers
# --------------------------------------------------------------------------
class _FakeResponse:
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json = json_data or {}

    def json(self):
        return self._json


def _make_fake_client(get_impl):
    class _FakeAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def get(self, url, params=None, timeout=None):
            return await get_impl(url, params, timeout)

    return _FakeAsyncClient


OK_RESULTS = {
    "status": "OK",
    "results": {
        "sunrise": "2024-06-01T05:00:00+00:00",
        "sunset": "2024-06-01T20:00:00+00:00",
        "civil_twilight_begin": "2024-06-01T04:30:00+00:00",
        "civil_twilight_end": "2024-06-01T20:30:00+00:00",
    },
}


class TestGetSunTimes:
    async def test_happy_path_returns_suntimes(self, monkeypatch):
        async def get_impl(url, params, timeout):
            return _FakeResponse(200, OK_RESULTS)

        monkeypatch.setattr(
            "app.services.ptp_service.httpx.AsyncClient", _make_fake_client(get_impl)
        )

        result = await PTPService.get_sun_times(45.0, 6.0, ["2024-06-01"])

        assert len(result) == 1
        assert result[0].date == "2024-06-01"
        assert result[0].sunrise.startswith("2024-06-01T05")

    async def test_api_non_ok_status_skipped(self, monkeypatch):
        async def get_impl(url, params, timeout):
            return _FakeResponse(200, {"status": "INVALID_REQUEST"})

        monkeypatch.setattr(
            "app.services.ptp_service.httpx.AsyncClient", _make_fake_client(get_impl)
        )

        result = await PTPService.get_sun_times(45.0, 6.0, ["2024-06-01"])
        assert result == []

    async def test_http_error_skipped(self, monkeypatch):
        async def get_impl(url, params, timeout):
            return _FakeResponse(500, {})

        monkeypatch.setattr(
            "app.services.ptp_service.httpx.AsyncClient", _make_fake_client(get_impl)
        )

        result = await PTPService.get_sun_times(45.0, 6.0, ["2024-06-01"])
        assert result == []

    async def test_timeout_swallowed(self, monkeypatch):
        async def get_impl(url, params, timeout):
            raise httpx.TimeoutException("slow")

        monkeypatch.setattr(
            "app.services.ptp_service.httpx.AsyncClient", _make_fake_client(get_impl)
        )

        result = await PTPService.get_sun_times(45.0, 6.0, ["2024-06-01"])
        assert result == []

    async def test_generic_error_swallowed(self, monkeypatch):
        async def get_impl(url, params, timeout):
            raise RuntimeError("boom")

        monkeypatch.setattr(
            "app.services.ptp_service.httpx.AsyncClient", _make_fake_client(get_impl)
        )

        result = await PTPService.get_sun_times(45.0, 6.0, ["2024-06-01", "2024-06-02"])
        assert result == []
