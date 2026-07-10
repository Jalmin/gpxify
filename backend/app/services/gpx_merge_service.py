"""
GPX merge service
Handles merging of multiple GPX files into a single track
"""
import gpxpy
import gpxpy.gpx
from typing import List, Tuple
from datetime import datetime, timedelta
import logging

from app.utils.elevation_quality import process_elevation_data
from app.services.distance_calculator import DistanceCalculator

logger = logging.getLogger(__name__)


class GPXMergeService:
    """Service for merging GPX files"""

    # Target spacing (metres) between fabricated points inside a filled gap.
    INTERPOLATION_SPACING_M = 100
    # Hard cap on fabricated points per gap (guards against absurd gaps).
    MAX_INTERPOLATED_POINTS = 500
    # Above this size (metres) a filled gap gets an explicit size warning.
    LARGE_GAP_M = 50000

    @staticmethod
    def merge_gpx_files(
        files_content: List[Tuple[str, str]],  # List of (filename, content)
        gap_threshold_seconds: int = 300,
        interpolate_gaps: bool = False,
        sort_by_time: bool = True,
        merged_track_name: str = "Merged Track",
        spatial_gap_threshold_m: int = 500
    ) -> Tuple[gpxpy.gpx.GPX, List[str]]:
        """
        Merge multiple GPX files into a single GPX track

        Args:
            files_content: List of tuples (filename, gpx_xml_content)
            gap_threshold_seconds: Time gap threshold to detect breaks
            interpolate_gaps: If True, interpolate missing points; if False, create new segment
            sort_by_time: Auto-sort by timestamp or keep manual order
            merged_track_name: Name for the merged track
            spatial_gap_threshold_m: Haversine distance (metres) between the last
                point of one file and the first of the next above which a spatial
                gap is reported. Active even when tracks have no timestamps.

        Returns:
            Tuple of (merged GPX object, list of warnings)
        """
        warnings = []
        all_segments = []

        # Parse all GPX files and extract segments with metadata
        for filename, content in files_content:
            try:
                gpx = gpxpy.parse(content)
                for track in gpx.tracks:
                    for segment in track.segments:
                        if segment.points:
                            # Process elevation quality for this segment
                            processed_points, quality_report = process_elevation_data(segment.points)
                            logger.info(
                                f"Merge - {filename}: Elevation quality {quality_report['quality_score']:.1f}/100, "
                                f"action: {quality_report['processing_applied']}"
                            )

                            # Get start time for sorting
                            start_time = None
                            for point in processed_points:
                                if point.time:
                                    start_time = point.time
                                    break

                            all_segments.append({
                                'filename': filename,
                                'segment': segment,
                                'start_time': start_time,
                                'points': processed_points  # Use processed points with improved elevation
                            })
            except Exception as e:
                warnings.append(f"Error parsing {filename}: {str(e)}")

        if not all_segments:
            raise ValueError("No valid GPS tracks found in the provided files")

        # Sort segments by time if requested and if timestamps exist
        if sort_by_time:
            # Check if all segments have timestamps
            segments_with_time = [s for s in all_segments if s['start_time'] is not None]
            if segments_with_time:
                if len(segments_with_time) < len(all_segments):
                    warnings.append(
                        f"Only {len(segments_with_time)}/{len(all_segments)} segments have timestamps. "
                        "Segments without time will be placed at the end."
                    )
                # Sort: segments with time first (by time), then segments without time
                all_segments.sort(
                    key=lambda x: (x['start_time'] is None, x['start_time'] or datetime.max)
                )
            else:
                warnings.append("No segments have timestamps. Using original order.")

        # Create merged GPX - clean and professional
        merged_gpx = gpxpy.gpx.GPX()
        merged_gpx.creator = "GPX Ninja - Merge"
        merged_gpx.name = merged_track_name
        merged_gpx.description = f"Merged from {len(files_content)} GPX files"

        merged_track = gpxpy.gpx.GPXTrack()
        merged_track.name = merged_track_name
        merged_gpx.tracks.append(merged_track)

        # Merge segments
        current_segment = gpxpy.gpx.GPXTrackSegment()
        merged_track.segments.append(current_segment)

        last_point = None
        last_time = None
        last_filename = None

        for seg_info in all_segments:
            segment = seg_info['segment']
            filename = seg_info['filename']

            # Check for gaps and overlaps with previous segment.
            # Gate only on last_point so spatial detection runs even when the
            # tracks carry no timestamps.
            if last_point and segment.points:
                first_point = segment.points[0]
                first_time = first_point.time

                # True when a gap (temporal or spatial) warrants splitting into
                # a new segment. A single split is created even if both fire.
                should_split = False

                # --- Temporal gap (unchanged behaviour) ---
                if first_time and last_time:
                    time_gap = (first_time - last_time).total_seconds()

                    if time_gap < 0:
                        # Overlap detected
                        warnings.append(
                            f"Overlap detected: {filename} starts {abs(time_gap):.0f}s before previous segment ended. "
                            "Keeping chronological order."
                        )
                    elif time_gap > gap_threshold_seconds:
                        # Gap detected
                        gap_minutes = time_gap / 60
                        warnings.append(
                            f"Gap detected: {gap_minutes:.1f} minutes between segments "
                            f"(from {last_point.latitude:.5f},{last_point.longitude:.5f} "
                            f"to {first_point.latitude:.5f},{first_point.longitude:.5f})"
                        )
                        should_split = True

                # --- Spatial gap (new) — active with or without timestamps ---
                try:
                    distance = DistanceCalculator.haversine_distance(
                        last_point.latitude,
                        last_point.longitude,
                        first_point.latitude,
                        first_point.longitude,
                    )
                    if distance > spatial_gap_threshold_m:
                        warnings.append(
                            f"Spatial gap: {distance:.0f}m between "
                            f"{last_filename} and {filename} "
                            f"at ({first_point.latitude},{first_point.longitude})"
                        )
                        should_split = True
                except Exception as e:
                    # Never let spatial detection break the merge: log & skip
                    # this junction only.
                    logger.warning(
                        f"Spatial gap detection skipped between "
                        f"{last_filename} and {filename}: {e}"
                    )

                # Single split honouring interpolate_gaps. When interpolation
                # is requested we FABRICATE points inside the gap (linear
                # lat/lon/ele/time) instead of splitting into a new segment.
                if should_split:
                    if interpolate_gaps:
                        try:
                            interp_points, interp_warnings = (
                                GPXMergeService._interpolate_gap(
                                    last_point,
                                    first_point,
                                    last_filename,
                                    filename,
                                )
                            )
                        except Exception as e:
                            # Aberrant data: never fail the merge. Fall back to
                            # the T22 split behaviour and trace the decision.
                            logger.warning(
                                f"Gap interpolation failed between "
                                f"{last_filename} and {filename}: {e}. "
                                "Falling back to split."
                            )
                            warnings.append(
                                f"Gap interpolation failed between "
                                f"{last_filename} and {filename}: fell back to "
                                "splitting into a new segment"
                            )
                            current_segment = gpxpy.gpx.GPXTrackSegment()
                            merged_track.segments.append(current_segment)
                        else:
                            if interp_points:
                                current_segment.points.extend(interp_points)
                                warnings.extend(interp_warnings)
                            else:
                                # Nothing to fabricate: fall back to a split so
                                # the visual gap is still honoured.
                                current_segment = gpxpy.gpx.GPXTrackSegment()
                                merged_track.segments.append(current_segment)
                    else:
                        current_segment = gpxpy.gpx.GPXTrackSegment()
                        merged_track.segments.append(current_segment)

            # Add all points from this segment
            for point in segment.points:
                new_point = gpxpy.gpx.GPXTrackPoint(
                    latitude=point.latitude,
                    longitude=point.longitude,
                    elevation=point.elevation,
                    time=point.time
                )
                current_segment.points.append(new_point)

                if point.time:
                    last_time = point.time
                last_point = point

            # Remember which file provided the current tail, for the next
            # junction's spatial/temporal gap message.
            if segment.points:
                last_filename = filename

        # Final validation
        total_points = sum(len(seg.points) for seg in merged_track.segments)
        if total_points == 0:
            raise ValueError("Merged GPX has no points")

        warnings.insert(
            0,
            f"Successfully merged {len(all_segments)} segment(s) from {len(files_content)} file(s) "
            f"into {len(merged_track.segments)} segment(s) with {total_points} total points"
        )

        return merged_gpx, warnings

    @staticmethod
    def _interpolate_gap(
        start_point: gpxpy.gpx.GPXTrackPoint,
        end_point: gpxpy.gpx.GPXTrackPoint,
        file_a: str,
        file_b: str,
    ) -> Tuple[List[gpxpy.gpx.GPXTrackPoint], List[str]]:
        """Fabricate intermediate points linearly across a detected gap.

        Generates points every ~``INTERPOLATION_SPACING_M`` metres (min 1,
        capped at ``MAX_INTERPOLATED_POINTS``) between ``start_point`` (tail of
        the previous segment) and ``end_point`` (head of the next). Latitude,
        longitude and — when available on BOTH boundaries — elevation and time
        are linearly interpolated. A one-sided elevation is never extrapolated
        (``elevation=None``); non-monotonic timestamps never produce a bogus
        time (``time=None`` + warning).

        Returns:
            Tuple of (fabricated points, warnings). Every filled gap yields an
            ``"interpolated N points"`` warning for full traceability.
        """
        warnings: List[str] = []

        distance = DistanceCalculator.haversine_distance(
            start_point.latitude,
            start_point.longitude,
            end_point.latitude,
            end_point.longitude,
        )

        # Number of points to insert BETWEEN the two (existing) boundaries.
        # e.g. a 1000 m gap at 100 m spacing => 10 intervals => 9 inserted.
        num_intervals = round(distance / GPXMergeService.INTERPOLATION_SPACING_M)
        num_points = max(1, num_intervals - 1)

        capped = False
        if num_points > GPXMergeService.MAX_INTERPOLATED_POINTS:
            num_points = GPXMergeService.MAX_INTERPOLATED_POINTS
            capped = True

        # Decide whether time can be safely interpolated (both present AND
        # strictly monotonic: B after A).
        interp_time = False
        if start_point.time is not None and end_point.time is not None:
            if end_point.time > start_point.time:
                interp_time = True
            else:
                warnings.append(
                    f"Non-monotonic timestamps between {file_a} and {file_b}: "
                    "fabricated points left without time"
                )

        # Elevation interpolated only when BOTH boundaries carry one.
        interp_ele = (
            start_point.elevation is not None and end_point.elevation is not None
        )

        new_points: List[gpxpy.gpx.GPXTrackPoint] = []
        for i in range(1, num_points + 1):
            fraction = i / (num_points + 1)

            lat = start_point.latitude + fraction * (
                end_point.latitude - start_point.latitude
            )
            lon = start_point.longitude + fraction * (
                end_point.longitude - start_point.longitude
            )

            ele = None
            if interp_ele:
                ele = start_point.elevation + fraction * (
                    end_point.elevation - start_point.elevation
                )

            t = None
            if interp_time:
                delta_s = (end_point.time - start_point.time).total_seconds()
                t = start_point.time + timedelta(seconds=fraction * delta_s)

            new_points.append(
                gpxpy.gpx.GPXTrackPoint(
                    latitude=lat, longitude=lon, elevation=ele, time=t
                )
            )

        # Traceability: every fabricated gap is announced.
        warnings.append(
            f"interpolated {len(new_points)} points over {distance:.0f}m "
            f"between {file_a} and {file_b}"
        )

        if capped or distance > GPXMergeService.LARGE_GAP_M:
            warnings.append(
                f"Large gap of {distance:.0f}m between {file_a} and {file_b}: "
                f"interpolation capped at {GPXMergeService.MAX_INTERPOLATED_POINTS} "
                "points"
            )

        return new_points, warnings
