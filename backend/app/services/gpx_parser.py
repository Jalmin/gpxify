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
)


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
        """Calculate track statistics"""

        # Use gpxpy built-in methods
        uphill, downhill = track.get_uphill_downhill()
        moving_data = track.get_moving_data()
        elevation_extremes = track.get_elevation_extremes()

        # Total distance
        total_distance = track.length_3d() or 0.0

        # Duration
        duration = None
        start_time = None
        end_time = None

        if moving_data and moving_data.moving_time:
            duration = moving_data.moving_time

        time_bounds = track.get_time_bounds()
        if time_bounds.start_time:
            start_time = time_bounds.start_time.isoformat()
        if time_bounds.end_time:
            end_time = time_bounds.end_time.isoformat()

        # Average elevation
        avg_elevation = None
        if track_points:
            elevations = [p.elevation for p in track_points if p.elevation is not None]
            if elevations:
                avg_elevation = sum(elevations) / len(elevations)

        return TrackStatistics(
            total_distance=total_distance,
            total_elevation_gain=uphill or 0.0,
            total_elevation_loss=downhill or 0.0,
            max_elevation=elevation_extremes.maximum if elevation_extremes else None,
            min_elevation=elevation_extremes.minimum if elevation_extremes else None,
            avg_elevation=avg_elevation,
            duration=duration,
            start_time=start_time,
            end_time=end_time,
        )

    @staticmethod
    def analyze_segment(
        track_points: List[TrackPoint], start_km: float, end_km: float
    ) -> dict:
        """
        Analyze a specific segment of the track (Phase 3)

        Args:
            track_points: List of track points
            start_km: Start distance in kilometers
            end_km: End distance in kilometers

        Returns:
            Dictionary with segment analysis
        """
        # Convert km to meters
        start_m = start_km * 1000
        end_m = end_km * 1000

        # Filter points in segment
        segment_points = [
            p for p in track_points if start_m <= p.distance <= end_m
        ]

        if len(segment_points) < 2:
            return {
                "error": "Segment too short or no points found",
                "distance": 0,
                "elevation_gain": 0,
                "elevation_loss": 0,
            }

        # Calculate segment statistics
        elevation_gain = 0.0
        elevation_loss = 0.0

        for i in range(1, len(segment_points)):
            prev = segment_points[i - 1]
            curr = segment_points[i]

            if prev.elevation is not None and curr.elevation is not None:
                ele_diff = curr.elevation - prev.elevation
                if ele_diff > 0:
                    elevation_gain += ele_diff
                else:
                    elevation_loss += abs(ele_diff)

        distance = segment_points[-1].distance - segment_points[0].distance

        return {
            "start_km": start_km,
            "end_km": end_km,
            "distance": distance,
            "elevation_gain": elevation_gain,
            "elevation_loss": elevation_loss,
            "num_points": len(segment_points),
        }

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
        min_elevation_gain_a: float = 300,  # meters for Type A
        max_distance_a: float = 10000,      # meters for Type A
        max_elevation_loss_a: float = 100,  # meters for Type A
        min_elevation_gain_b: float = 1000, # meters for Type B
        max_distance_b: float = 30000,      # meters for Type B
        max_elevation_loss_b: float = 300,  # meters for Type B
    ) -> List[ClimbSegment]:
        """
        Detect climb segments based on elevation criteria

        Type A criteria: >300m D+, <10km, <100m D-
        Type B criteria: >1000m D+, <30km, <300m D-

        Args:
            points: List of track points with elevation data
            Criteria parameters (with defaults matching requirements)

        Returns:
            List of detected climb segments
        """
        if len(points) < 2:
            return []

        climbs = []
        i = 0

        while i < len(points):
            # Try to find a climb starting at point i
            climb = GPXParser._find_climb_from_point(
                points, i,
                min_elevation_gain_a, max_distance_a, max_elevation_loss_a,
                min_elevation_gain_b, max_distance_b, max_elevation_loss_b
            )

            if climb:
                climbs.append(climb["climb"])
                # Skip to end of detected climb to avoid overlaps
                i = climb["end_idx"]
            else:
                i += 1

        return climbs

    @staticmethod
    def _find_climb_from_point(
        points: List[TrackPoint],
        start_idx: int,
        min_gain_a: float,
        max_dist_a: float,
        max_loss_a: float,
        min_gain_b: float,
        max_dist_b: float,
        max_loss_b: float,
    ) -> Optional[dict]:
        """
        Try to find a valid climb starting from start_idx

        Returns ClimbSegment if found, None otherwise
        """
        start_point = points[start_idx]
        current_gain = 0.0
        current_loss = 0.0
        prev_elevation = start_point.elevation or 0

        # Scan forward to find potential climb
        for end_idx in range(start_idx + 1, len(points)):
            end_point = points[end_idx]
            distance = end_point.distance - start_point.distance

            # Calculate elevation change
            current_elevation = end_point.elevation or 0
            elevation_diff = current_elevation - prev_elevation

            if elevation_diff > 0:
                current_gain += elevation_diff
            else:
                current_loss += abs(elevation_diff)

            prev_elevation = current_elevation

            # Check if we've exceeded max distance for either type
            if distance > max_dist_b:
                break

            # Check Type B criteria (more lenient, check first)
            if (distance <= max_dist_b and
                current_gain >= min_gain_b and
                current_loss <= max_loss_b):

                start_km = start_point.distance / 1000
                end_km = end_point.distance / 1000
                distance_km = distance / 1000
                avg_gradient = (current_gain / distance * 100) if distance > 0 else 0

                climb_segment = ClimbSegment(
                    start_km=start_km,
                    end_km=end_km,
                    distance_km=distance_km,
                    elevation_gain=current_gain,
                    elevation_loss=current_loss,
                    avg_gradient=avg_gradient,
                    climb_type="type_b"
                )
                return {"climb": climb_segment, "end_idx": end_idx}

            # Check Type A criteria
            if (distance <= max_dist_a and
                current_gain >= min_gain_a and
                current_loss <= max_loss_a):

                start_km = start_point.distance / 1000
                end_km = end_point.distance / 1000
                distance_km = distance / 1000
                avg_gradient = (current_gain / distance * 100) if distance > 0 else 0

                climb_segment = ClimbSegment(
                    start_km=start_km,
                    end_km=end_km,
                    distance_km=distance_km,
                    elevation_gain=current_gain,
                    elevation_loss=current_loss,
                    avg_gradient=avg_gradient,
                    climb_type="type_a"
                )
                return {"climb": climb_segment, "end_idx": end_idx}

        return None
