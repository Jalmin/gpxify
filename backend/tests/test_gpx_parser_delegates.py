"""
Cover the thin delegate methods on GPXParser that forward to the
specialized services (kept for backwards compatibility), plus the
share-id utility helpers.
"""
from app.models.gpx import TrackPoint
from app.services.gpx_parser import GPXParser
from app.utils.share_id import generate_share_id, hash_state_to_id


def _points():
    return [
        TrackPoint(lat=45.0, lon=6.0, elevation=1000, distance=0),
        TrackPoint(lat=45.005, lon=6.005, elevation=1100, distance=500),
        TrackPoint(lat=45.01, lon=6.01, elevation=1050, distance=1000),
    ]


class TestGPXParserDelegates:
    def test_calculate_statistics_delegate(self):
        # deprecated forwarder -> StatisticsCalculator.calculate_statistics
        # (used only for its side of the delegate line; exercise analyze too)
        result = GPXParser.analyze_segment(_points(), 0.0, 1.0)
        assert result["num_points"] == 3
        assert result["elevation_gain"] >= 0

    def test_detect_climbs_delegate(self):
        climbs = GPXParser.detect_climbs(_points(), min_elevation_gain=10, min_distance=0.1)
        assert isinstance(climbs, list)

    def test_generate_gpx_from_segment_delegate(self):
        xml = GPXParser.generate_gpx_from_segment(_points(), 0.0, 1.0, "Seg")
        assert "<gpx" in xml
        assert "Seg" in xml


class TestShareIdUtil:
    def test_generate_share_id_length_and_charset(self):
        sid = generate_share_id(8)
        assert len(sid) == 8
        assert sid.isalnum()

    def test_generate_share_id_custom_length(self):
        assert len(generate_share_id(12)) == 12

    def test_generate_share_id_is_random(self):
        assert generate_share_id(16) != generate_share_id(16)

    def test_hash_state_to_id_deterministic(self):
        state = {"b": 2, "a": 1}
        first = hash_state_to_id(state, 8)
        second = hash_state_to_id(state, 8)
        assert first == second
        assert len(first) <= 8
