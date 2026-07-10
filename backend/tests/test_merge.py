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


def _interpolated_warnings(warnings: List[str]) -> List[str]:
    return [w for w in warnings if re.search(r"interpolated \d+ points", w)]


def _segment_count(merged_gpx) -> int:
    return sum(len(t.segments) for t in merged_gpx.tracks)


def _all_points(merged_gpx):
    return [p for t in merged_gpx.tracks for seg in t.segments for p in seg.points]


def _total_points(merged_gpx) -> int:
    return len(_all_points(merged_gpx))


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


# ---------------------------------------------------------------------------
# T23 — Real gap interpolation at merge (interpolate_gaps=True)
# ---------------------------------------------------------------------------

class TestGapInterpolation:
    """When ``interpolate_gaps=True`` GPXIFY must FABRICATE intermediate points
    inside a detected gap (linear lat/lon/ele/time), ~100 m apart, capped at
    500 per gap, and trace every fabrication in the warnings."""

    def test_1km_gap_with_timestamps_inserts_points_monotonic_time(self):
        """1 km gap, timestamps both sides -> >=8 inserted points, strictly
        increasing timestamps between the two boundaries."""
        t0 = datetime(2026, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
        # file_a last point at lat 45.0004; file_b first point at 45.0094
        # -> ~1001 m north => spatial gap (> 500 m default) detected.
        file_a = _build_gpx_content(
            _line(45.0000, 6.0, start_time=t0, time_step_s=10), filename="a.gpx"
        )
        # file_b starts 600 s after t0 (after file_a's last time t0+40s).
        t1 = t0 + timedelta(seconds=600)
        file_b = _build_gpx_content(
            _line(45.0094, 6.0, start_time=t1, time_step_s=10), filename="b.gpx"
        )

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            interpolate_gaps=True,
        )

        # interpolate_gaps=True never splits: everything in a single segment.
        assert _segment_count(merged_gpx) == 1
        # 5 (a) + 5 (b) inputs => any extra points are fabricated.
        inserted = _total_points(merged_gpx) - 10
        assert inserted >= 8, f"expected >=8 inserted, got {inserted}"

        # Every timestamp present must be strictly increasing.
        times = [p.time for p in _all_points(merged_gpx) if p.time is not None]
        assert times == sorted(times)
        assert all(b > a for a, b in zip(times, times[1:])), times

    def test_gap_without_timestamps_inserts_points_time_none(self):
        """Gap without timestamps -> points fabricated with time=None."""
        file_a = _build_gpx_content(_line(45.0000, 6.0), filename="a.gpx")
        file_b = _build_gpx_content(_line(45.0094, 6.0), filename="b.gpx")

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
            interpolate_gaps=True,
        )

        assert _segment_count(merged_gpx) == 1
        assert _total_points(merged_gpx) > 10  # points were fabricated
        # No source point carried a time, so nothing may be fabricated with one.
        assert all(p.time is None for p in _all_points(merged_gpx))

    def test_interpolate_false_keeps_split_no_points_inserted(self):
        """interpolate_gaps=False on the same gap -> T22 split, no fabrication."""
        file_a = _build_gpx_content(_line(45.0000, 6.0), filename="a.gpx")
        file_b = _build_gpx_content(_line(45.0094, 6.0), filename="b.gpx")

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
            interpolate_gaps=False,
        )

        assert _segment_count(merged_gpx) == 2  # split preserved (T22)
        assert _total_points(merged_gpx) == 10  # nothing fabricated
        assert _interpolated_warnings(warnings) == []

    def test_filled_gap_emits_interpolated_warning(self):
        """Each filled gap must be traced with an 'interpolated N points' warning."""
        file_a = _build_gpx_content(_line(45.0000, 6.0), filename="a.gpx")
        file_b = _build_gpx_content(_line(45.0094, 6.0), filename="b.gpx")

        _, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
            interpolate_gaps=True,
        )

        interp = _interpolated_warnings(warnings)
        assert len(interp) == 1, warnings
        # Warning carries the count and the distance (metres).
        assert re.search(r"interpolated \d+ points over \d+m", interp[0]), interp[0]


class TestGapInterpolationEdgeCases:
    def test_elevation_one_side_only_yields_none_elevation(self):
        """Elevation on one boundary only -> fabricated points have ele=None
        (never extrapolate a one-sided altitude)."""
        # file_a has elevation, file_b has none.
        file_a = _build_gpx_content(
            [(45.0000, 6.0, 100.0, None), (45.0004, 6.0, 120.0, None)],
            filename="a.gpx",
        )
        file_b = _build_gpx_content(
            [(45.0094, 6.0, None, None), (45.0098, 6.0, None, None)],
            filename="b.gpx",
        )

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
            interpolate_gaps=True,
        )

        # Fabricated points = total - 4 inputs.
        assert _total_points(merged_gpx) > 4
        # The boundary between a's last (ele set) and b's first (ele None):
        # inserted points must NOT extrapolate -> ele is None.
        inserted = _all_points(merged_gpx)[2:-2]  # strip the 2+2 source points
        assert inserted, "expected fabricated points"
        assert all(p.elevation is None for p in inserted), inserted

    def test_non_monotonic_timestamps_no_time_and_warns(self):
        """Boundary B time precedes A -> do NOT fabricate time (None) + warn."""
        t0 = datetime(2026, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
        # file_a last time = t0 + 40s.
        file_a = _build_gpx_content(
            _line(45.0000, 6.0, start_time=t0, time_step_s=10), filename="a.gpx"
        )
        # file_b first time is BEFORE file_a's last time -> non-monotonic.
        earlier = t0 - timedelta(seconds=600)
        file_b = _build_gpx_content(
            _line(45.0094, 6.0, start_time=earlier, time_step_s=10), filename="b.gpx"
        )

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,  # keep manual order to preserve inversion
            interpolate_gaps=True,
        )

        # A gap was still filled (spatial 1 km), so points exist...
        assert _interpolated_warnings(warnings), warnings
        # ...but the fabricated points must have time=None (no bogus times).
        inserted = _all_points(merged_gpx)[5:-5]  # strip 5+5 source points
        assert inserted, "expected fabricated points"
        assert all(p.time is None for p in inserted), inserted
        # Traceability of the non-monotonic decision.
        assert any("non-monotonic" in w.lower() for w in warnings), warnings

    def test_huge_gap_caps_at_500_points_with_size_warning(self):
        """Gap > 50 km -> fabrication capped at 500 points + explicit size warning."""
        file_a = _build_gpx_content(_line(45.0000, 6.0), filename="a.gpx")
        # ~60 km north (0.54 deg lat) -> well over the 50 km cap trigger.
        file_b = _build_gpx_content(_line(45.5400, 6.0), filename="b.gpx")

        merged_gpx, warnings = GPXMergeService.merge_gpx_files(
            [file_a, file_b],
            sort_by_time=False,
            interpolate_gaps=True,
        )

        inserted = _total_points(merged_gpx) - 10
        assert inserted == 500, f"expected cap at 500, got {inserted}"
        # Explicit warning about the large gap size.
        assert any(
            "large gap" in w.lower() or "capped" in w.lower() for w in warnings
        ), warnings
