"""
Tests for GPX merge functionality.

Covers the pre-existing merge behaviour plus T22 spatial gap detection.

Note (precondition repair): this file previously executed as a top-level
script that ``open()``-ed external fixture files (``test_merge_part1.gpx`` /
``test_merge_part2.gpx``) at import time. Those files do not exist, so the
module failed to *collect* under pytest and blocked every merge test. It has
been rewritten as a proper pytest module that builds all GPX fixtures inline
with gpxpy, so it no longer depends on any external file. The original intent
(verifying that merging two GPX files succeeds) is preserved by
``test_merge_two_files_succeeds``.
"""
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import gpxpy
import gpxpy.gpx
import pytest

from app.models.gpx import MergeOptions
from app.services.gpx_merge_service import GPXMergeService


# ---------------------------------------------------------------------------
# Inline GPX fixture helpers
# ---------------------------------------------------------------------------

def _build_gpx_content(
    points: List[Tuple[float, float, Optional[float], Optional[datetime]]],
    filename: str = "track.gpx",
) -> Tuple[str, str]:
    """Build a (filename, gpx_xml) tuple from a list of points.

    Each point is (lat, lon, elevation, time_or_None).
    """
    gpx = gpxpy.gpx.GPX()
    track = gpxpy.gpx.GPXTrack()
    gpx.tracks.append(track)
    segment = gpxpy.gpx.GPXTrackSegment()
    track.segments.append(segment)
    for lat, lon, ele, t in points:
        segment.points.append(
            gpxpy.gpx.GPXTrackPoint(latitude=lat, longitude=lon, elevation=ele, time=t)
        )
    return filename, gpx.to_xml()


def _line(
    lat_start: float,
    lon: float,
    count: int = 5,
    lat_step: float = 0.0001,
    ele: float = 100.0,
    start_time: Optional[datetime] = None,
    time_step_s: int = 10,
) -> List[Tuple[float, float, Optional[float], Optional[datetime]]]:
    """Generate a straight north-bound line of points.

    ~0.0001 deg latitude ~= 11 m, so ``lat_step`` controls spacing.
    """
    pts = []
    t = start_time
    for i in range(count):
        pts.append((lat_start + i * lat_step, lon, ele, t))
        if t is not None:
            t = t + timedelta(seconds=time_step_s)
    return pts


def _spatial_warnings(warnings: List[str]) -> List[str]:
    return [w for w in warnings if "spatial gap" in w.lower()]


def _temporal_warnings(warnings: List[str]) -> List[str]:
    return [w for w in warnings if "gap detected" in w.lower()]


def _segment_count(merged_gpx) -> int:
    return sum(len(t.segments) for t in merged_gpx.tracks)


# ---------------------------------------------------------------------------
# T22 — Spatial gap detection
# ---------------------------------------------------------------------------

class TestSpatialGapDetection:
    """Spatial (haversine) gap detection at file junctions."""

    def test_two_files_10km_apart_without_timestamps_emits_spatial_gap(self):
        """Two ~10 km apart files WITHOUT timestamps -> spatial warning + 2 segments."""
        # ~0.09 deg latitude ~= 10 km north
        file_a = _build_gpx_content(_line(45.0000, 6.0), filename="a.gpx")
        file_b = _build_gpx_content(_line(45.0900, 6.0), filename="b.gpx")

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
        )

        spatial = _spatial_warnings(warnings)
        assert len(spatial) == 1, warnings
        # Warning must carry the distance (metres) and coordinates.
        assert re.search(r"Spatial gap: \d+m between", spatial[0]), spatial[0]
        assert re.search(r"\(\-?\d+\.\d+,\-?\d+\.\d+\)", spatial[0]), spatial[0]
        # Split into 2 segments (visual gap on the map).
        assert _segment_count(merged_gpx) == 2

    def test_two_contiguous_files_without_timestamps_no_spatial_gap(self):
        """Two contiguous files (< threshold) without timestamps -> 1 segment, no warning."""
        file_a = _build_gpx_content(_line(45.0000, 6.0), filename="a.gpx")
        # file_a ends at 45.0004; start file_b ~11 m further -> well under 500 m default
        file_b = _build_gpx_content(_line(45.0005, 6.0), filename="b.gpx")

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
        )

        assert _spatial_warnings(warnings) == []
        assert _segment_count(merged_gpx) == 1

    def test_temporal_and_spatial_gap_same_junction_single_split_two_warnings(self):
        """Gap both temporal AND spatial -> single split, both warnings emitted."""
        t0 = datetime(2026, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
        file_a = _build_gpx_content(
            _line(45.0000, 6.0, start_time=t0, time_step_s=10),
            filename="a.gpx",
        )
        # 600 s later (> 300 s threshold) AND 10 km away (> 500 m threshold)
        t1 = t0 + timedelta(seconds=600)
        file_b = _build_gpx_content(
            _line(45.0900, 6.0, start_time=t1, time_step_s=10),
            filename="b.gpx",
        )

        merged_gpx, warnings = GPXMergeService.merge_gpx_files([file_a, file_b])

        # Exactly one split: 2 segments, not 3 (no double split).
        assert _segment_count(merged_gpx) == 2
        # Both a temporal and a spatial warning are emitted.
        assert len(_temporal_warnings(warnings)) == 1, warnings
        assert len(_spatial_warnings(warnings)) == 1, warnings

    def test_custom_threshold_detects_100m_gap(self):
        """Custom spatial_gap_threshold_m=50 on a ~100 m gap -> warning emitted."""
        file_a = _build_gpx_content(_line(45.0000, 6.0), filename="a.gpx")
        # file_a ends at 45.0004; file_b starts at 45.0013 -> ~100 m gap
        file_b = _build_gpx_content(_line(45.0013, 6.0), filename="b.gpx")

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
            spatial_gap_threshold_m=50,
        )

        spatial = _spatial_warnings(warnings)
        assert len(spatial) == 1, warnings
        # Same 100 m gap would NOT trigger at the 500 m default.
        _, warnings_default = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
        )
        assert _spatial_warnings(warnings_default) == []


# ---------------------------------------------------------------------------
# Edge cases & regression
# ---------------------------------------------------------------------------

class TestMergeEdgeCases:
    def test_merge_two_files_succeeds(self):
        """Original intent: merging two GPX files succeeds and yields points."""
        t0 = datetime(2026, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
        file_a = _build_gpx_content(
            _line(45.0000, 6.0, start_time=t0), filename="part1.gpx"
        )
        file_b = _build_gpx_content(
            _line(45.0005, 6.0, start_time=t0 + timedelta(seconds=60)),
            filename="part2.gpx",
        )

        merged_gpx, warnings = GPXMergeService.merge_gpx_files([file_a, file_b])

        total_points = sum(
            len(seg.points) for t in merged_gpx.tracks for seg in t.segments
        )
        assert total_points == 10
        assert isinstance(warnings, list)

    def test_single_point_file_does_not_crash(self):
        """A single-point file must not crash spatial detection."""
        file_a = _build_gpx_content([(45.0000, 6.0, 100.0, None)], filename="a.gpx")
        file_b = _build_gpx_content(_line(45.0900, 6.0), filename="b.gpx")

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
        )
        # 10 km apart -> still detected as a spatial gap.
        assert len(_spatial_warnings(warnings)) == 1, warnings

    def test_spatial_threshold_bounds_validated(self):
        """MergeOptions.spatial_gap_threshold_m default 500, bounds ge=10/le=100000."""
        assert MergeOptions().spatial_gap_threshold_m == 500
        with pytest.raises(Exception):
            MergeOptions(spatial_gap_threshold_m=0)
        with pytest.raises(Exception):
            MergeOptions(spatial_gap_threshold_m=-1)
        with pytest.raises(Exception):
            MergeOptions(spatial_gap_threshold_m=100001)
        # Valid boundary values accepted.
        assert MergeOptions(spatial_gap_threshold_m=10).spatial_gap_threshold_m == 10
        assert (
            MergeOptions(spatial_gap_threshold_m=100000).spatial_gap_threshold_m
            == 100000
        )
