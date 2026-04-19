"""
Time estimation utilities for GPX processing.

Supports three calculation modes via CalcMode:
- NAISMITH: classic modified Naismith rule for trail running
- CONSTANT_PACE: single flat km/h pace
- TRAIL_PLANNER: tunable 4-parameter model (flat pace + climb penalty +
  descent bonus + linear fatigue)
"""
import math
from typing import List, Optional

from app.models.gpx import CalcMode, TrailPlannerConfig


class TimeCalculator:
    """Service for time estimation calculations."""

    # Naismith's rule constants (modified for trail running)
    BASE_SPEED_KMH = 12.0
    CLIMB_PENALTY_MIN_PER_100M = 5
    DESCENT_PENALTY_MIN_PER_100M = 5
    STEEP_DESCENT_THRESHOLD = -12  # Gradient % threshold for steep descent bonus

    @staticmethod
    def estimate_segment_time(
        distance_km: float,
        elevation_gain: float,
        elevation_loss: float,
        avg_gradient: float,
        calc_mode: CalcMode = CalcMode.NAISMITH,
        constant_pace_kmh: Optional[float] = None,
        trail_planner_config: Optional[TrailPlannerConfig] = None,
        cumulative_distance_km: float = 0,
    ) -> Optional[float]:
        """Estimate time for a segment.

        Args:
            distance_km: Segment distance in kilometers.
            elevation_gain: Total D+ in meters.
            elevation_loss: Total D- in meters.
            avg_gradient: Average gradient as percentage.
            calc_mode: Which formula to use (NAISMITH, CONSTANT_PACE,
                TRAIL_PLANNER).
            constant_pace_kmh: Required if calc_mode=CONSTANT_PACE.
            trail_planner_config: Required if calc_mode=TRAIL_PLANNER.
            cumulative_distance_km: Distance run so far (used for the
                trail_planner fatigue model). Must be >= 0.

        Returns:
            Estimated time in minutes, or None if the required mode
            parameter is missing (defensive fallback).
        """
        if cumulative_distance_km < 0:
            raise ValueError("cumulative_distance_km must be >= 0")

        if calc_mode == CalcMode.NAISMITH:
            return TimeCalculator._calculate_naismith_time(
                distance_km, elevation_gain, elevation_loss, avg_gradient
            )
        if calc_mode == CalcMode.CONSTANT_PACE:
            if constant_pace_kmh is None:
                return None
            return TimeCalculator._calculate_pace_time(distance_km, constant_pace_kmh)
        if calc_mode == CalcMode.TRAIL_PLANNER:
            if trail_planner_config is None:
                return None
            return TimeCalculator._calculate_trail_planner_time(
                distance_km,
                elevation_gain,
                elevation_loss,
                trail_planner_config,
                cumulative_distance_km,
            )
        return None

    @staticmethod
    def _calculate_naismith_time(
        distance_km: float,
        elevation_gain: float,
        elevation_loss: float,
        avg_gradient: float,
    ) -> float:
        base = (distance_km / TimeCalculator.BASE_SPEED_KMH) * 60
        climb = (elevation_gain / 100) * TimeCalculator.CLIMB_PENALTY_MIN_PER_100M
        descent = 0.0
        if avg_gradient < TimeCalculator.STEEP_DESCENT_THRESHOLD:
            descent = (elevation_loss / 100) * TimeCalculator.DESCENT_PENALTY_MIN_PER_100M
        return max(0, base + climb - descent)

    @staticmethod
    def _calculate_pace_time(distance_km: float, pace_kmh: float) -> float:
        if pace_kmh <= 0:
            return 0
        return (distance_km / pace_kmh) * 60

    @staticmethod
    def _calculate_trail_planner_time(
        distance_km: float,
        elevation_gain: float,
        elevation_loss: float,
        config: TrailPlannerConfig,
        cumulative_distance_km: float,
    ) -> float:
        """Trail Planner formula with linear fatigue.

        raw = distance/pace*60 + (D+/100)*penalty - (D-/100)*bonus
        multiplier = 1 + floor(cumul / interval) * (fatigue_pct / 100)
        total = max(0, raw * multiplier)
        """
        base = (distance_km / config.flat_pace_kmh) * 60
        climb = (elevation_gain / 100) * config.climb_penalty_min_per_100m
        descent = (elevation_loss / 100) * config.descent_bonus_min_per_100m
        raw = base + climb - descent

        paliers = math.floor(cumulative_distance_km / config.fatigue_interval_km)
        multiplier = 1 + paliers * (config.fatigue_percent_per_interval / 100)

        return max(0, raw * multiplier)

    @staticmethod
    def format_time(minutes: float) -> str:
        """Format minutes to 'XhYYmin' or 'YYmin'."""
        hours = int(minutes // 60)
        mins = int(minutes % 60)
        if hours > 0:
            return f"{hours}h {mins:02d}min"
        return f"{mins}min"

    @staticmethod
    def calculate_cumulative_times(
        segment_times: List[float],
        start_time_minutes: float = 0,
    ) -> List[float]:
        """Cumulative times at the end of each segment."""
        cumulative: List[float] = []
        current = start_time_minutes
        for segment_time in segment_times:
            current += segment_time
            cumulative.append(current)
        return cumulative

    @staticmethod
    def estimate_pace_from_time(
        distance_km: float,
        time_minutes: float,
        elevation_gain: float = 0,
        elevation_loss: float = 0,
        avg_gradient: float = 0,
    ) -> dict:
        """Reverse-calculate a flat-equivalent pace from actual time and terrain."""
        if time_minutes <= 0 or distance_km <= 0:
            return {"actual_pace_kmh": 0, "flat_equivalent_pace_kmh": 0}

        actual_pace = distance_km / (time_minutes / 60)

        climb = (elevation_gain / 100) * TimeCalculator.CLIMB_PENALTY_MIN_PER_100M
        descent = 0.0
        if avg_gradient < TimeCalculator.STEEP_DESCENT_THRESHOLD:
            descent = (elevation_loss / 100) * TimeCalculator.DESCENT_PENALTY_MIN_PER_100M

        flat_time = max(time_minutes - climb + descent, time_minutes * 0.5)
        flat_pace = distance_km / (flat_time / 60)

        return {
            "actual_pace_kmh": actual_pace,
            "flat_equivalent_pace_kmh": flat_pace,
        }
