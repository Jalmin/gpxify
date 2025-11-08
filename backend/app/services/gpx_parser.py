"""
GPX file parsing and analysis service using gpxpy
"""
import gpxpy
import gpxpy.gpx
from typing import List, Optional, Tuple
from datetime import datetime
from app.models.gpx import (
    GPXData,
    Track,
    TrackPoint,
    TrackStatistics,
    Coordinate,
    ClimbSegment,
    MergeOptions,
    MergeGPXRequest,
    MergeGPXResponse,
    GPXFileInput,
    AidStation,
    AidStationSegment,
    AidStationTableRequest,
    AidStationTableResponse,
)
from app.services.distance_calculator import DistanceCalculator
from app.services.elevation_service import ElevationService
from app.services.climb_detector import ClimbDetector
from app.services.statistics_calculator import StatisticsCalculator
from app.services.time_calculator import TimeCalculator


class GPXParser:
    """Service for parsing and analyzing GPX files"""

    @staticmethod
    def parse_gpx_file(file_content: str, filename: str) -> GPXData:
        """
        Parse GPX file content and extract track data with statistics

        Args:
            file_content: GPX file content as string
            filename: Original filename

        Returns:
            GPXData object with tracks and statistics
        """
        gpx = gpxpy.parse(file_content)

        tracks = []
        waypoints = []

        # Parse waypoints
        for waypoint in gpx.waypoints:
            waypoints.append(
                Coordinate(
                    lat=waypoint.latitude,
                    lon=waypoint.longitude,
                    elevation=waypoint.elevation,
                )
            )

        # Parse tracks
        for track in gpx.tracks:
            track_points = []
            cumulative_distance = 0.0

            for segment in track.segments:
                previous_point = None

                for point in segment.points:
                    # Calculate distance from previous point
                    if previous_point:
                        distance_delta = point.distance_3d(previous_point) or 0
                        cumulative_distance += distance_delta

                    track_points.append(
                        TrackPoint(
                            lat=point.latitude,
                            lon=point.longitude,
                            elevation=point.elevation,
                            distance=cumulative_distance,
                            time=point.time.isoformat() if point.time else None,
                        )
                    )

                    previous_point = point

            # Calculate statistics
            statistics = GPXParser._calculate_statistics(track, track_points)

            tracks.append(
                Track(
                    name=track.name,
                    points=track_points,
                    statistics=statistics,
                )
            )

        return GPXData(
            filename=filename,
            tracks=tracks,
            waypoints=waypoints,
        )

    @staticmethod
    def _calculate_statistics(
        track: gpxpy.gpx.GPXTrack, track_points: List[TrackPoint]
    ) -> TrackStatistics:
        """Calculate track statistics using StatisticsCalculator service"""
        return StatisticsCalculator.calculate_track_statistics(track, track_points)

    @staticmethod
    def analyze_segment(
        track_points: List[TrackPoint], start_km: float, end_km: float
    ) -> dict:
        """
        Analyze a specific segment of the track using StatisticsCalculator

        Args:
            track_points: List of track points
            start_km: Start distance in kilometers
            end_km: End distance in kilometers

        Returns:
            Dictionary with segment analysis
        """
        return StatisticsCalculator.analyze_segment(track_points, start_km, end_km)

    @staticmethod
    def generate_gpx_from_segment(
        points: List[TrackPoint],
        start_km: float,
        end_km: float,
        track_name: str
    ) -> str:
        """
        Generate GPX XML string from a segment of track points

        Args:
            points: List of all track points
            start_km: Start of segment in kilometers
            end_km: End of segment in kilometers
            track_name: Name for the exported track

        Returns:
            GPX XML string
        """
        # Filter points within segment range
        start_m = start_km * 1000
        end_m = end_km * 1000
        segment_points = [p for p in points if start_m <= p.distance <= end_m]

        if not segment_points:
            raise ValueError("No points found in the specified segment range")

        # Create new GPX object
        gpx = gpxpy.gpx.GPX()

        # Add metadata
        gpx.name = f"{track_name} - Segment {start_km:.1f}km to {end_km:.1f}km"
        gpx.description = f"Exported segment from GPXIFY"

        # Create track and segment
        gpx_track = gpxpy.gpx.GPXTrack()
        gpx_track.name = gpx.name
        gpx.tracks.append(gpx_track)

        gpx_segment = gpxpy.gpx.GPXTrackSegment()
        gpx_track.segments.append(gpx_segment)

        # Add points to segment
        for point in segment_points:
            # Parse time string to datetime if available
            point_time = None
            if point.time:
                try:
                    point_time = datetime.fromisoformat(point.time.replace('Z', '+00:00'))
                except:
                    pass  # Skip if time parsing fails

            gpx_point = gpxpy.gpx.GPXTrackPoint(
                latitude=point.lat,
                longitude=point.lon,
                elevation=point.elevation,
                time=point_time
            )
            gpx_segment.points.append(gpx_point)

        # Convert to XML string
        return gpx.to_xml()


    @staticmethod
    def detect_climbs(
        points: List[TrackPoint],
        min_elevation_gain: float = 300,  # meters minimum D+
        min_ratio: float = 4.0,           # D+ must be > min_ratio * D-
        min_gradient: float = 4.0,        # minimum average gradient %
        smoothing_window: int = 5,        # smoothing window size
    ) -> List[ClimbSegment]:
        """
        Detect climb segments using ClimbDetector service

        Args:
            points: List of track points with elevation data
            min_elevation_gain: Minimum D+ in meters (default 300)
            min_ratio: Minimum ratio D+/D- (default 4.0)
            min_gradient: Minimum average gradient % (default 4.0)
            smoothing_window: Window size for elevation smoothing (default 5)

        Returns:
            List of detected climb segments
        """
        return ClimbDetector.detect_climbs(
            points,
            min_elevation_gain,
            min_ratio,
            min_gradient,
            smoothing_window
        )

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
                            # Get start time for sorting
                            start_time = None
                            for point in segment.points:
                                if point.time:
                                    start_time = point.time
                                    break

                            all_segments.append({
                                'filename': filename,
                                'segment': segment,
                                'start_time': start_time,
                                'points': segment.points
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

        # Create merged GPX
        merged_gpx = gpxpy.gpx.GPX()
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
                            f"Gap detected: {gap_minutes:.1f} minutes between segments (from {last_point.latitude:.5f},{last_point.longitude:.5f} to {first_point.latitude:.5f},{first_point.longitude:.5f})"
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

        warnings.insert(0, f"Successfully merged {len(all_segments)} segment(s) from {len(files_content)} file(s) into {len(merged_track.segments)} segment(s) with {total_points} total points")

        return merged_gpx, warnings

    @staticmethod
    def generate_aid_station_table(
        points: List[TrackPoint],
        aid_stations: List[AidStation],
        use_naismith: bool = True,
        custom_pace_kmh: Optional[float] = None
    ) -> AidStationTableResponse:
        """
        Generate aid station table with segment statistics and time estimates

        Uses Naismith's rule (modified) for time estimation:
        - Base: 12 km/h on flat terrain
        - Add 5 min per 100m D+ (climbing)
        - Subtract 5 min per 100m D- for steep descents (>12% grade)

        Args:
            points: Track points with distance and elevation
            aid_stations: List of aid stations with km markers (must be sorted by distance)
            use_naismith: Use Naismith formula (True) or custom pace (False)
            custom_pace_kmh: Custom pace in km/h if not using Naismith

        Returns:
            AidStationTableResponse with segments and statistics
        """
        if len(aid_stations) < 2:
            raise ValueError("At least 2 aid stations are required")

        if not points:
            raise ValueError("No track points provided")

        # Sort aid stations by distance to be safe
        sorted_stations = sorted(aid_stations, key=lambda s: s.distance_km)

        segments = []
        total_distance = 0.0
        total_d_plus = 0.0
        total_d_minus = 0.0
        total_time_minutes = 0.0

        # Process each segment between consecutive aid stations
        for i in range(len(sorted_stations) - 1):
            from_station = sorted_stations[i]
            to_station = sorted_stations[i + 1]

            # Find points in this segment
            start_km = from_station.distance_km
            end_km = to_station.distance_km

            # Convert to meters for comparison with point.distance
            start_m = start_km * 1000
            end_m = end_km * 1000

            # Find closest points to start and end
            segment_points = [p for p in points if start_m <= p.distance <= end_m]

            if not segment_points:
                raise ValueError(f"No points found between {from_station.name} and {to_station.name}")

            # Calculate statistics for this segment
            segment_distance = end_km - start_km
            d_plus = 0.0
            d_minus = 0.0
            total_elevation_change = 0.0

            for j in range(1, len(segment_points)):
                prev = segment_points[j - 1]
                curr = segment_points[j]

                if prev.elevation is not None and curr.elevation is not None:
                    elev_diff = curr.elevation - prev.elevation
                    total_elevation_change += abs(elev_diff)
                    if elev_diff > 0:
                        d_plus += elev_diff
                    else:
                        d_minus += abs(elev_diff)

            # Calculate average gradient
            avg_gradient = 0.0
            if segment_distance > 0:
                total_elev_change_signed = (segment_points[-1].elevation or 0) - (segment_points[0].elevation or 0)
                avg_gradient = (total_elev_change_signed / (segment_distance * 1000)) * 100

            # Estimate time using TimeCalculator
            estimated_time_minutes = TimeCalculator.estimate_segment_time(
                distance_km=segment_distance,
                elevation_gain=d_plus,
                elevation_loss=d_minus,
                avg_gradient=avg_gradient,
                use_naismith=use_naismith,
                custom_pace_kmh=custom_pace_kmh
            )

            # Create segment
            segment = AidStationSegment(
                from_station=from_station.name,
                to_station=to_station.name,
                start_km=start_km,
                end_km=end_km,
                distance_km=segment_distance,
                elevation_gain=d_plus,
                elevation_loss=d_minus,
                estimated_time_minutes=estimated_time_minutes,
                avg_gradient=avg_gradient
            )

            segments.append(segment)

            # Accumulate totals
            total_distance += segment_distance
            total_d_plus += d_plus
            total_d_minus += d_minus
            if estimated_time_minutes:
                total_time_minutes += estimated_time_minutes

        return AidStationTableResponse(
            success=True,
            message=f"Generated aid station table with {len(segments)} segments",
            segments=segments,
            total_distance_km=total_distance,
            total_elevation_gain=total_d_plus,
            total_elevation_loss=total_d_minus,
            total_time_minutes=total_time_minutes if use_naismith or custom_pace_kmh else None
        )
