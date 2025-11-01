"""
GPX file parsing and analysis service using gpxpy
"""
import gpxpy
import gpxpy.gpx
from typing import List, Optional, Tuple
from app.models.gpx import (
    GPXData,
    Track,
    TrackPoint,
    TrackStatistics,
    Coordinate,
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
