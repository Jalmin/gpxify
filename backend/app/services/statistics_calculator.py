"""
Statistics calculation utilities for GPX processing
"""
from typing import List, Optional
from app.models.gpx import TrackPoint, TrackStatistics
import gpxpy.gpx


class StatisticsCalculator:
    """Service for calculating track and segment statistics"""

    @staticmethod
    def calculate_track_statistics(
        track: gpxpy.gpx.GPXTrack,
        track_points: List[TrackPoint]
    ) -> TrackStatistics:
        """
        Calculate comprehensive statistics for a GPX track

        Args:
            track: GPXTrack object with built-in methods
            track_points: List of track points for additional calculations

        Returns:
            TrackStatistics object with all calculated metrics
        """
        # Use gpxpy built-in methods for efficiency
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
        track_points: List[TrackPoint],
        start_km: float,
        end_km: float
    ) -> dict:
        """
        Analyze a specific segment of the track

        Args:
            track_points: List of track points
            start_km: Start distance in kilometers
            end_km: End distance in kilometers

        Returns:
            Dictionary with segment analysis:
            - start_km: Start position
            - end_km: End position
            - distance: Segment distance in meters
            - elevation_gain: Total D+ in meters
            - elevation_loss: Total D- in meters
            - num_points: Number of GPS points in segment
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
    def get_elevation_profile(
        track_points: List[TrackPoint],
        sample_rate: int = 100
    ) -> List[dict]:
        """
        Generate elevation profile data points for visualization

        Args:
            track_points: List of track points
            sample_rate: Take every Nth point (default 100)

        Returns:
            List of dicts with distance_km and elevation
        """
        if not track_points:
            return []

        profile = []
        for i, point in enumerate(track_points):
            if i % sample_rate == 0 or i == len(track_points) - 1:
                profile.append({
                    "distance_km": point.distance / 1000,
                    "elevation": point.elevation or 0
                })

        return profile

    @staticmethod
    def calculate_gradient_profile(
        track_points: List[TrackPoint],
        window_distance: float = 500  # meters
    ) -> List[dict]:
        """
        Calculate gradient profile using a rolling window

        Args:
            track_points: List of track points
            window_distance: Distance window for gradient calculation (meters)

        Returns:
            List of dicts with distance_km and gradient_percent
        """
        if len(track_points) < 2:
            return []

        gradients = []

        for i, point in enumerate(track_points):
            # Find points within window
            window_start = point.distance - window_distance / 2
            window_end = point.distance + window_distance / 2

            window_points = [
                p for p in track_points
                if window_start <= p.distance <= window_end and p.elevation is not None
            ]

            if len(window_points) >= 2:
                # Calculate gradient over window
                elevation_diff = window_points[-1].elevation - window_points[0].elevation
                distance_diff = window_points[-1].distance - window_points[0].distance

                if distance_diff > 0:
                    gradient = (elevation_diff / distance_diff) * 100
                    gradients.append({
                        "distance_km": point.distance / 1000,
                        "gradient_percent": gradient
                    })

        return gradients

    @staticmethod
    def get_speed_profile(
        track_points: List[TrackPoint],
        time_window: int = 300  # seconds (5 minutes)
    ) -> List[dict]:
        """
        Calculate speed profile from track points with time data

        Args:
            track_points: List of track points with time
            time_window: Time window for speed averaging (seconds)

        Returns:
            List of dicts with distance_km and speed_kmh
        """
        from datetime import datetime

        speeds = []

        for i in range(1, len(track_points)):
            prev = track_points[i - 1]
            curr = track_points[i]

            if prev.time and curr.time:
                try:
                    # Parse timestamps
                    prev_time = datetime.fromisoformat(prev.time.replace('Z', '+00:00'))
                    curr_time = datetime.fromisoformat(curr.time.replace('Z', '+00:00'))

                    time_diff = (curr_time - prev_time).total_seconds()
                    distance_diff = curr.distance - prev.distance

                    if time_diff > 0:
                        # Calculate speed in km/h
                        speed_mps = distance_diff / time_diff
                        speed_kmh = speed_mps * 3.6

                        speeds.append({
                            "distance_km": curr.distance / 1000,
                            "speed_kmh": speed_kmh,
                            "time": curr.time
                        })
                except:
                    pass  # Skip points with invalid time data

        return speeds
