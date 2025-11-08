"""
Time estimation utilities for GPX processing using Naismith's rule
"""
from typing import List, Optional


class TimeCalculator:
    """Service for time estimation calculations using Naismith's rule"""

    # Naismith's rule constants (modified for trail running)
    BASE_SPEED_KMH = 12.0  # Base speed on flat terrain (km/h)
    CLIMB_PENALTY_MIN_PER_100M = 5  # Add 5 minutes per 100m D+
    DESCENT_PENALTY_MIN_PER_100M = 5  # Subtract 5 minutes per 100m D- on steep descents
    STEEP_DESCENT_THRESHOLD = -12  # Gradient % threshold for steep descent bonus

    @staticmethod
    def estimate_segment_time(
        distance_km: float,
        elevation_gain: float,
        elevation_loss: float,
        avg_gradient: float,
        use_naismith: bool = True,
        custom_pace_kmh: Optional[float] = None
    ) -> Optional[float]:
        """
        Estimate time for a segment using Naismith's rule or custom pace

        Naismith's rule (modified for trail running):
        - Base: 12 km/h on flat terrain
        - Add 5 min per 100m D+ (climbing penalty)
        - Subtract 5 min per 100m D- for steep descents (>12% grade)

        Args:
            distance_km: Segment distance in kilometers
            elevation_gain: Total D+ in meters
            elevation_loss: Total D- in meters
            avg_gradient: Average gradient as percentage
            use_naismith: Use Naismith's rule (True) or custom pace (False)
            custom_pace_kmh: Custom pace in km/h if not using Naismith

        Returns:
            Estimated time in minutes, or None if cannot calculate
        """
        if use_naismith:
            return TimeCalculator._calculate_naismith_time(
                distance_km, elevation_gain, elevation_loss, avg_gradient
            )
        elif custom_pace_kmh:
            return TimeCalculator._calculate_pace_time(distance_km, custom_pace_kmh)
        else:
            return None

    @staticmethod
    def _calculate_naismith_time(
        distance_km: float,
        elevation_gain: float,
        elevation_loss: float,
        avg_gradient: float
    ) -> float:
        """
        Calculate time using Naismith's rule

        Args:
            distance_km: Distance in kilometers
            elevation_gain: D+ in meters
            elevation_loss: D- in meters
            avg_gradient: Average gradient as percentage

        Returns:
            Estimated time in minutes
        """
        # Base time: distance at base speed
        base_time_hours = distance_km / TimeCalculator.BASE_SPEED_KMH
        base_time_minutes = base_time_hours * 60

        # Add time for climbing: 5 min per 100m D+
        climb_time_minutes = (elevation_gain / 100) * TimeCalculator.CLIMB_PENALTY_MIN_PER_100M

        # Subtract time for steep descents: 5 min per 100m D- if gradient > 12%
        descent_time_minutes = 0.0
        if avg_gradient < TimeCalculator.STEEP_DESCENT_THRESHOLD:
            descent_time_minutes = (elevation_loss / 100) * TimeCalculator.DESCENT_PENALTY_MIN_PER_100M

        total_time = base_time_minutes + climb_time_minutes - descent_time_minutes

        # Ensure time is never negative
        return max(0, total_time)

    @staticmethod
    def _calculate_pace_time(distance_km: float, pace_kmh: float) -> float:
        """
        Calculate time using a simple constant pace

        Args:
            distance_km: Distance in kilometers
            pace_kmh: Pace in km/h

        Returns:
            Estimated time in minutes
        """
        if pace_kmh <= 0:
            return 0

        time_hours = distance_km / pace_kmh
        return time_hours * 60

    @staticmethod
    def format_time(minutes: float) -> str:
        """
        Format time in minutes to human-readable string

        Args:
            minutes: Time in minutes

        Returns:
            Formatted string like "2h 30min" or "45min"
        """
        hours = int(minutes // 60)
        mins = int(minutes % 60)

        if hours > 0:
            return f"{hours}h {mins:02d}min"
        else:
            return f"{mins}min"

    @staticmethod
    def calculate_cumulative_times(
        segment_times: List[float],
        start_time_minutes: float = 0
    ) -> List[float]:
        """
        Calculate cumulative times for a series of segments

        Args:
            segment_times: List of segment durations in minutes
            start_time_minutes: Starting time offset in minutes (default 0)

        Returns:
            List of cumulative times at the end of each segment
        """
        cumulative = []
        current_time = start_time_minutes

        for segment_time in segment_times:
            current_time += segment_time
            cumulative.append(current_time)

        return cumulative

    @staticmethod
    def estimate_pace_from_time(
        distance_km: float,
        time_minutes: float,
        elevation_gain: float = 0,
        elevation_loss: float = 0,
        avg_gradient: float = 0
    ) -> dict:
        """
        Reverse calculation: estimate flat pace from actual time and terrain

        Args:
            distance_km: Distance in kilometers
            time_minutes: Actual time taken in minutes
            elevation_gain: D+ in meters (optional, for adjusted pace)
            elevation_loss: D- in meters (optional, for adjusted pace)
            avg_gradient: Average gradient % (optional, for adjusted pace)

        Returns:
            Dictionary with:
            - actual_pace_kmh: Simple pace based on distance/time
            - flat_equivalent_pace_kmh: Estimated flat terrain pace (Naismith-adjusted)
        """
        if time_minutes <= 0 or distance_km <= 0:
            return {
                "actual_pace_kmh": 0,
                "flat_equivalent_pace_kmh": 0
            }

        # Simple pace
        time_hours = time_minutes / 60
        actual_pace = distance_km / time_hours

        # Estimate flat equivalent by removing Naismith penalties
        climb_time_minutes = (elevation_gain / 100) * TimeCalculator.CLIMB_PENALTY_MIN_PER_100M
        descent_time_minutes = 0.0
        if avg_gradient < TimeCalculator.STEEP_DESCENT_THRESHOLD:
            descent_time_minutes = (elevation_loss / 100) * TimeCalculator.DESCENT_PENALTY_MIN_PER_100M

        # Adjusted time (as if on flat terrain)
        flat_equivalent_time = time_minutes - climb_time_minutes + descent_time_minutes
        flat_equivalent_time = max(flat_equivalent_time, time_minutes * 0.5)  # Sanity check

        flat_equivalent_pace = distance_km / (flat_equivalent_time / 60)

        return {
            "actual_pace_kmh": actual_pace,
            "flat_equivalent_pace_kmh": flat_equivalent_pace
        }
