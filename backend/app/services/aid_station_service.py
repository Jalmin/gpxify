"""
Aid station service
Handles generation of aid station tables with time predictions
"""
from typing import List, Optional
import logging

from app.models.gpx import (
    TrackPoint,
    AidStation,
    AidStationSegment,
    AidStationTableResponse,
)
from app.services.time_calculator import TimeCalculator

logger = logging.getLogger(__name__)


class AidStationService:
    """Service for aid station table generation and management"""

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
            total_estimated_time_minutes=total_time_minutes
        )
