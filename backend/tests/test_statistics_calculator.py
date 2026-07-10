"""
Unit tests for StatisticsCalculator service.

Covers the pure segment/profile helpers (analyze_segment, elevation
profile, gradient profile, speed profile) plus the track-statistics
aggregation using a real gpxpy track.
"""
import gpxpy
import pytest

from app.models.gpx import TrackPoint
from app.services.statistics_calculator import StatisticsCalculator


def _points(specs):
    """Build TrackPoint list from (distance_m, elevation, time) tuples."""
    return [
        TrackPoint(lat=45.0, lon=6.0, elevation=ele, distance=dist, time=time)
        for dist, ele, time in specs
    ]


class TestAnalyzeSegment:
    def test_computes_gain_loss_and_distance(self):
        points = _points([
            (0, 1000, None),
            (500, 1100, None),   # +100
            (1000, 1050, None),  # -50
            (1500, 1200, None),  # +150
        ])

        result = StatisticsCalculator.analyze_segment(points, 0.0, 1.5)

        assert result["num_points"] == 4
        assert result["distance"] == pytest.approx(1500)
        assert result["elevation_gain"] == pytest.approx(250)
        assert result["elevation_loss"] == pytest.approx(50)
        assert result["start_km"] == 0.0
        assert result["end_km"] == 1.5

    def test_subset_filtered_by_km_bounds(self):
        points = _points([
            (0, 1000, None),
            (1000, 1100, None),
            (2000, 1200, None),
            (3000, 1300, None),
        ])

        result = StatisticsCalculator.analyze_segment(points, 1.0, 2.0)

        # Only the two points within [1km, 2km]
        assert result["num_points"] == 2
        assert result["distance"] == pytest.approx(1000)

    def test_single_point_returns_error(self):
        points = _points([(0, 1000, None)])

        result = StatisticsCalculator.analyze_segment(points, 0.0, 5.0)

        assert "error" in result
        assert result["distance"] == 0
        assert result["elevation_gain"] == 0
        assert result["elevation_loss"] == 0

    def test_empty_points_returns_error(self):
        result = StatisticsCalculator.analyze_segment([], 0.0, 5.0)
        assert "error" in result

    def test_missing_elevation_skipped(self):
        points = _points([
            (0, None, None),
            (500, 1100, None),
            (1000, None, None),
        ])

        result = StatisticsCalculator.analyze_segment(points, 0.0, 1.0)

        # No pair has both elevations set -> no gain/loss accumulated
        assert result["elevation_gain"] == 0
        assert result["elevation_loss"] == 0
        assert result["num_points"] == 3


class TestElevationProfile:
    def test_empty_returns_empty_list(self):
        assert StatisticsCalculator.get_elevation_profile([]) == []

    def test_samples_every_nth_point_and_last(self):
        points = _points([(i * 100, 1000 + i, None) for i in range(10)])

        profile = StatisticsCalculator.get_elevation_profile(points, sample_rate=3)

        # indices 0,3,6,9 -> and 9 is also the last, no dup
        assert profile[0]["distance_km"] == pytest.approx(0.0)
        assert profile[-1]["distance_km"] == pytest.approx(0.9)
        assert all("elevation" in p for p in profile)

    def test_none_elevation_becomes_zero(self):
        points = _points([(0, None, None)])
        profile = StatisticsCalculator.get_elevation_profile(points, sample_rate=1)
        assert profile[0]["elevation"] == 0


class TestGradientProfile:
    def test_too_few_points_returns_empty(self):
        assert StatisticsCalculator.calculate_gradient_profile(_points([(0, 1000, None)])) == []

    def test_positive_gradient(self):
        # steady climb: 100m over 1000m distance ~ 10%
        points = _points([(i * 100, 1000 + i * 10, None) for i in range(11)])

        gradients = StatisticsCalculator.calculate_gradient_profile(points, window_distance=400)

        assert len(gradients) > 0
        mid = gradients[len(gradients) // 2]
        assert mid["gradient_percent"] == pytest.approx(10, abs=2)


class TestSpeedProfile:
    def test_computes_speed_from_time(self):
        points = _points([
            (0, 1000, "2024-01-01T10:00:00Z"),
            (1000, 1000, "2024-01-01T10:10:00Z"),  # 1km in 600s = 6 km/h
        ])

        speeds = StatisticsCalculator.get_speed_profile(points)

        assert len(speeds) == 1
        assert speeds[0]["speed_kmh"] == pytest.approx(6.0, abs=0.1)

    def test_points_without_time_skipped(self):
        points = _points([(0, 1000, None), (1000, 1000, None)])
        assert StatisticsCalculator.get_speed_profile(points) == []

    def test_invalid_time_swallowed(self):
        points = _points([
            (0, 1000, "not-a-date"),
            (1000, 1000, "also-bad"),
        ])
        # Exception inside loop is caught -> empty result, no raise
        assert StatisticsCalculator.get_speed_profile(points) == []


class TestTrackStatistics:
    def test_aggregates_from_gpx_track(self):
        gpx_xml = """<?xml version="1.0"?>
<gpx version="1.1" creator="t">
  <trk><name>S</name><trkseg>
    <trkpt lat="45.0" lon="6.0"><ele>1000</ele><time>2024-01-01T10:00:00Z</time></trkpt>
    <trkpt lat="45.01" lon="6.01"><ele>1100</ele><time>2024-01-01T10:10:00Z</time></trkpt>
    <trkpt lat="45.02" lon="6.02"><ele>1050</ele><time>2024-01-01T10:20:00Z</time></trkpt>
  </trkseg></trk>
</gpx>"""
        gpx = gpxpy.parse(gpx_xml)
        track = gpx.tracks[0]
        tps = _points([
            (0, 1000, "2024-01-01T10:00:00Z"),
            (800, 1100, "2024-01-01T10:10:00Z"),
            (1600, 1050, "2024-01-01T10:20:00Z"),
        ])

        stats = StatisticsCalculator.calculate_track_statistics(track, tps)

        assert stats.total_distance > 0
        assert stats.total_elevation_gain >= 0
        assert stats.total_elevation_loss >= 0
        assert stats.avg_elevation == pytest.approx(1050, abs=1)
        assert stats.start_time is not None
        assert stats.end_time is not None
