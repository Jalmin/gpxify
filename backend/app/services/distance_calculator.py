"""
Distance calculation utilities for GPX processing
"""
import math
from typing import Optional
import gpxpy.gpx


class DistanceCalculator:
    """Utility class for distance calculations"""

    EARTH_RADIUS_METERS = 6371000  # Earth radius in meters

    @staticmethod
    def haversine_distance(
        lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """
        Calculate great-circle distance between two points on Earth using Haversine formula

        Args:
            lat1: Latitude of first point in degrees
            lon1: Longitude of first point in degrees
            lat2: Latitude of second point in degrees
            lon2: Longitude of second point in degrees

        Returns:
            Distance in meters
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        # Haversine formula
        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return DistanceCalculator.EARTH_RADIUS_METERS * c

    @staticmethod
    def distance_3d(
        lat1: float,
        lon1: float,
        ele1: Optional[float],
        lat2: float,
        lon2: float,
        ele2: Optional[float],
    ) -> float:
        """
        Calculate 3D distance between two points (including elevation)

        Args:
            lat1: Latitude of first point in degrees
            lon1: Longitude of first point in degrees
            ele1: Elevation of first point in meters (optional)
            lat2: Latitude of second point in degrees
            lon2: Longitude of second point in degrees
            ele2: Elevation of second point in meters (optional)

        Returns:
            3D distance in meters
        """
        # Calculate horizontal distance
        horizontal = DistanceCalculator.haversine_distance(lat1, lon1, lat2, lon2)

        # Add vertical component if elevations are available
        if ele1 is not None and ele2 is not None:
            vertical = abs(ele2 - ele1)
            return math.sqrt(horizontal**2 + vertical**2)

        return horizontal

    @staticmethod
    def calculate_cumulative_distances(
        points: list[gpxpy.gpx.GPXTrackPoint],
    ) -> list[float]:
        """
        Calculate cumulative distance for each point in a track

        Args:
            points: List of GPX track points

        Returns:
            List of cumulative distances in meters
        """
        distances = []
        cumulative = 0.0

        for i, point in enumerate(points):
            if i > 0:
                prev_point = points[i - 1]
                delta = point.distance_3d(prev_point) or 0
                cumulative += delta

            distances.append(cumulative)

        return distances

    @staticmethod
    def total_distance(points: list[gpxpy.gpx.GPXTrackPoint]) -> float:
        """
        Calculate total distance of a track

        Args:
            points: List of GPX track points

        Returns:
            Total distance in meters
        """
        total = 0.0

        for i in range(1, len(points)):
            delta = points[i].distance_3d(points[i - 1]) or 0
            total += delta

        return total
