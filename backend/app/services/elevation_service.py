"""
Elevation analysis and smoothing utilities for GPX processing
"""
from typing import List, Optional
from app.models.gpx import TrackPoint
import gpxpy.gpx


class ElevationService:
    """Service for elevation-related calculations"""

    @staticmethod
    def smooth_elevation(
        points: List[TrackPoint], window_size: int = 5
    ) -> List[float]:
        """
        Smooth elevation data using moving average to reduce GPS noise

        Args:
            points: List of track points
            window_size: Size of the moving average window (default: 5)

        Returns:
            List of smoothed elevation values
        """
        if not points:
            return []

        smoothed = []
        half_window = window_size // 2

        for i in range(len(points)):
            # Define window bounds
            start = max(0, i - half_window)
            end = min(len(points), i + half_window + 1)

            # Calculate average elevation in window
            elevations = [
                p.elevation for p in points[start:end] if p.elevation is not None
            ]
            if elevations:
                avg_elev = sum(elevations) / len(elevations)
            else:
                avg_elev = points[i].elevation or 0

            smoothed.append(avg_elev)

        return smoothed

    @staticmethod
    def calculate_elevation_gain_loss(
        points: List[gpxpy.gpx.GPXTrackPoint],
        threshold: float = 1.0,
    ) -> tuple[float, float]:
        """
        Calculate total elevation gain and loss

        Args:
            points: List of GPX track points
            threshold: Minimum elevation change to count (meters)

        Returns:
            Tuple of (elevation_gain, elevation_loss) in meters
        """
        gain = 0.0
        loss = 0.0

        for i in range(1, len(points)):
            if points[i].elevation is not None and points[i - 1].elevation is not None:
                delta = points[i].elevation - points[i - 1].elevation

                if delta > threshold:
                    gain += delta
                elif delta < -threshold:
                    loss += abs(delta)

        return gain, loss

    @staticmethod
    def find_local_minimum(
        points: List[TrackPoint],
        smoothed_elevations: List[float],
        start_idx: int,
        search_distance: int = 10,
    ) -> int:
        """
        Find local minimum by looking backward from start_idx

        Args:
            points: List of track points
            smoothed_elevations: Smoothed elevation data
            start_idx: Starting index
            search_distance: How many points to look back

        Returns:
            Index of local minimum
        """
        min_idx = start_idx
        min_elev = smoothed_elevations[start_idx]

        # Look backward
        for i in range(max(0, start_idx - search_distance), start_idx):
            if smoothed_elevations[i] < min_elev:
                min_elev = smoothed_elevations[i]
                min_idx = i

        return min_idx

    @staticmethod
    def find_local_maximum(
        points: List[TrackPoint],
        smoothed_elevations: List[float],
        end_idx: int,
        search_distance: int = 10,
    ) -> int:
        """
        Find local maximum by looking forward from end_idx

        Args:
            points: List of track points
            smoothed_elevations: Smoothed elevation data
            end_idx: Starting index
            search_distance: How many points to look forward

        Returns:
            Index of local maximum
        """
        max_idx = end_idx
        max_elev = smoothed_elevations[end_idx]

        # Look forward
        for i in range(end_idx, min(len(points), end_idx + search_distance)):
            if smoothed_elevations[i] > max_elev:
                max_elev = smoothed_elevations[i]
                max_idx = i

        return max_idx

    @staticmethod
    def get_elevation_stats(
        points: List[gpxpy.gpx.GPXTrackPoint],
    ) -> dict:
        """
        Calculate elevation statistics for a track

        Args:
            points: List of GPX track points

        Returns:
            Dictionary with min, max, and average elevation
        """
        elevations = [p.elevation for p in points if p.elevation is not None]

        if not elevations:
            return {
                "min_elevation": None,
                "max_elevation": None,
                "avg_elevation": None,
            }

        return {
            "min_elevation": min(elevations),
            "max_elevation": max(elevations),
            "avg_elevation": sum(elevations) / len(elevations),
        }
