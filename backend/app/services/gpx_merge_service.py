"""
GPX merge service
Handles merging of multiple GPX files into a single track
"""
import gpxpy
import gpxpy.gpx
from typing import List, Tuple
from datetime import datetime
import logging

from app.utils.elevation_quality import process_elevation_data

logger = logging.getLogger(__name__)


class GPXMergeService:
    """Service for merging GPX files"""

    @staticmethod
    def merge_gpx_files(
        files_content: List[Tuple[str, str]],  # List of (filename, content)
        gap_threshold_seconds: int = 300,
        interpolate_gaps: bool = False,
        sort_by_time: bool = True,
        merged_track_name: str = "Merged Track"
    ) -> Tuple[gpxpy.gpx.GPX, List[str]]:
        """
        Merge multiple GPX files into a single GPX track

        Args:
            files_content: List of tuples (filename, gpx_xml_content)
            gap_threshold_seconds: Time gap threshold to detect breaks
            interpolate_gaps: If True, interpolate missing points; if False, create new segment
            sort_by_time: Auto-sort by timestamp or keep manual order
            merged_track_name: Name for the merged track

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

        for seg_info in all_segments:
            segment = seg_info['segment']
            filename = seg_info['filename']

            # Check for gaps and overlaps with previous segment
            if last_point and last_time and segment.points:
                first_point = segment.points[0]
                first_time = first_point.time

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

                        if not interpolate_gaps:
                            # Create new segment for visual gap on map
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
