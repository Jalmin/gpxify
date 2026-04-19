"""
Aid station service
Handles generation of aid station tables with time predictions
"""
from typing import List, Optional
import logging

from app.models.gpx import (
    AidStation,
    AidStationSegment,
    AidStationTableResponse,
    CalcMode,
    TrackPoint,
    TrailPlannerConfig,
)
from app.services.time_calculator import TimeCalculator

logger = logging.getLogger(__name__)


class AidStationService:
    """Service for aid station table generation and management"""

    @staticmethod
    def generate_aid_station_table(
        points: List[TrackPoint],
        aid_stations: List[AidStation],
        calc_mode: CalcMode = CalcMode.NAISMITH,
        constant_pace_kmh: Optional[float] = None,
        trail_planner_config: Optional[TrailPlannerConfig] = None,
    ) -> AidStationTableResponse:
        """Generate aid station table with segment stats and time estimates.

        Args:
            points: Track points with distance and elevation.
            aid_stations: Ordered list of aid stations (at least 2).
            calc_mode: Time estimation mode (NAISMITH, CONSTANT_PACE, TRAIL_PLANNER).
            constant_pace_kmh: Required if calc_mode=CONSTANT_PACE.
            trail_planner_config: Required if calc_mode=TRAIL_PLANNER.

        Returns:
            AidStationTableResponse with segments and aggregated stats.
        """
        if len(aid_stations) < 2:
            raise ValueError("At least 2 aid stations are required")

        if not points:
            raise ValueError("No track points provided")

        sorted_stations = sorted(aid_stations, key=lambda s: s.distance_km)

        segments: List[AidStationSegment] = []
        total_distance = 0.0
        total_d_plus = 0.0
        total_d_minus = 0.0
        total_time_minutes = 0.0
        cumulative_distance_km = 0.0

        for i in range(len(sorted_stations) - 1):
            from_station = sorted_stations[i]
            to_station = sorted_stations[i + 1]

            start_km = from_station.distance_km
            end_km = to_station.distance_km

            start_m = start_km * 1000
            end_m = end_km * 1000

            segment_points = [p for p in points if start_m <= p.distance <= end_m]

            if not segment_points:
                raise ValueError(
                    f"No points found between {from_station.name} and {to_station.name}"
                )

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

            avg_gradient = 0.0
            if segment_distance > 0:
                total_elev_change_signed = (
                    (segment_points[-1].elevation or 0) - (segment_points[0].elevation or 0)
                )
                avg_gradient = (total_elev_change_signed / (segment_distance * 1000)) * 100

            estimated_time_minutes = TimeCalculator.estimate_segment_time(
                distance_km=segment_distance,
                elevation_gain=d_plus,
                elevation_loss=d_minus,
                avg_gradient=avg_gradient,
                calc_mode=calc_mode,
                constant_pace_kmh=constant_pace_kmh,
                trail_planner_config=trail_planner_config,
                cumulative_distance_km=cumulative_distance_km,
            )

            segment = AidStationSegment(
                from_station=from_station.name,
                to_station=to_station.name,
                start_km=start_km,
                end_km=end_km,
                distance_km=segment_distance,
                elevation_gain=d_plus,
                elevation_loss=d_minus,
                estimated_time_minutes=estimated_time_minutes,
                avg_gradient=avg_gradient,
            )

            segments.append(segment)

            total_distance += segment_distance
            total_d_plus += d_plus
            total_d_minus += d_minus
            if estimated_time_minutes:
                total_time_minutes += estimated_time_minutes

            # Advance the cumulative distance for the fatigue model on the
            # NEXT segment. This means the fatigue multiplier for a segment
            # is computed from the start-of-segment cumulative distance, not
            # a midpoint/end. Consequence: a segment that straddles a palier
            # (e.g. starts at 18km with interval_km=20) will NOT get the
            # upcoming palier bonus — only the segment after will. This is
            # coarse but intentional: it matches the TDD specs in
            # test_time_calculator.py (e.g. test_fatigue_one_palier uses
            # cumul=25 and expects exactly 1 palier).
            cumulative_distance_km += segment_distance

        return AidStationTableResponse(
            success=True,
            message=f"Generated aid station table with {len(segments)} segments",
            segments=segments,
            total_distance_km=total_distance,
            total_elevation_gain=total_d_plus,
            total_elevation_loss=total_d_minus,
            total_time_minutes=total_time_minutes,
        )
