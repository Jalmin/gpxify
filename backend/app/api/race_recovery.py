"""
Race Recovery API - Reconstruct complete GPX from partial recording
"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import Response
import gpxpy
import gpxpy.gpx
from datetime import datetime, timedelta
from typing import List, Tuple
import math
import logging
from app.utils.elevation_quality import assess_elevation_quality, smooth_elevation_data, interpolate_elevation_linear

router = APIRouter()
logger = logging.getLogger(__name__)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points in meters using Haversine formula
    """
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def find_closest_point_index(target_lat: float, target_lon: float,
                              points: List[gpxpy.gpx.GPXTrackPoint],
                              approx_distance_km: float = None,
                              distance_tolerance_km: float = 5.0,
                              max_search_ratio: float = 0.75) -> int:
    """
    Find the index of the closest point in a GPX track to a target coordinate

    Args:
        target_lat: Target latitude
        target_lon: Target longitude
        points: List of GPX track points
        approx_distance_km: Approximate distance covered in km (if known)
        distance_tolerance_km: Search within ± this many km around approx_distance (default 5 km)
        max_search_ratio: If approx_distance not provided, search in first X% (default 0.75)

    Returns:
        Index of the closest point
    """
    min_distance = float('inf')
    closest_index = 0

    # If approximate distance is provided, calculate cumulative distances and search in that range
    if approx_distance_km is not None:
        # Calculate cumulative distance for all points
        cumulative_distances = [0.0]
        for i in range(1, len(points)):
            prev_point = points[i - 1]
            curr_point = points[i]
            segment_dist = haversine_distance(
                prev_point.latitude, prev_point.longitude,
                curr_point.latitude, curr_point.longitude
            )
            cumulative_distances.append(cumulative_distances[-1] + segment_dist / 1000.0)  # km

        # Define search range
        min_km = max(0, approx_distance_km - distance_tolerance_km)
        max_km = approx_distance_km + distance_tolerance_km

        # Search only in points within the distance range
        for i, cum_dist in enumerate(cumulative_distances):
            if min_km <= cum_dist <= max_km:
                point = points[i]
                distance = haversine_distance(target_lat, target_lon, point.latitude, point.longitude)
                if distance < min_distance:
                    min_distance = distance
                    closest_index = i
    else:
        # Fallback: search in the first portion of the track
        max_search_index = int(len(points) * max_search_ratio)
        for i in range(max_search_index):
            point = points[i]
            distance = haversine_distance(target_lat, target_lon, point.latitude, point.longitude)
            if distance < min_distance:
                min_distance = distance
                closest_index = i

    return closest_index


def calculate_slope(point1: gpxpy.gpx.GPXTrackPoint,
                   point2: gpxpy.gpx.GPXTrackPoint) -> float:
    """
    Calculate slope between two points as a ratio (0.25 = 25%)
    Capped at 0.4 (40%)
    """
    if point1.elevation is None or point2.elevation is None:
        return 0.0

    elevation_diff = point2.elevation - point1.elevation
    horizontal_distance = haversine_distance(
        point1.latitude, point1.longitude,
        point2.latitude, point2.longitude
    )

    if horizontal_distance == 0:
        return 0.0

    slope = elevation_diff / horizontal_distance

    # Cap slope at 40%
    return max(min(slope, 0.4), -0.4)


def parse_time_duration(time_str: str) -> timedelta:
    """
    Parse time string in format HH:MM:SS or MM:SS to timedelta
    """
    parts = time_str.strip().split(':')

    if len(parts) == 3:  # HH:MM:SS
        hours, minutes, seconds = map(int, parts)
        return timedelta(hours=hours, minutes=minutes, seconds=seconds)
    elif len(parts) == 2:  # MM:SS
        minutes, seconds = map(int, parts)
        return timedelta(minutes=minutes, seconds=seconds)
    else:
        raise ValueError("Time format must be HH:MM:SS or MM:SS")


@router.post("/recover")
async def recover_race(
    incomplete_gpx: UploadFile = File(..., description="GPX partiel avec timestamps (de la montre)"),
    complete_gpx: UploadFile = File(..., description="GPX complet sans timestamps (tracé officiel)"),
    official_time: str = Form(..., description="Temps officiel total (format: HH:MM:SS)"),
    approx_distance_km: str = Form(None, description="Distance approximative parcourue en km (optionnel, aide à trouver le point d'arrêt)")
):
    """
    Reconstruct a complete GPX file from:
    - Partial GPX recording (with timestamps) from watch
    - Complete GPX track (without timestamps) from race course
    - Official finish time
    - Optional: Approximate distance covered (helps find accurate cutoff point)

    Calculates missing timestamps based on slope-adjusted speed.
    """
    try:
        # Parse official time
        official_duration = parse_time_duration(official_time)

        # Parse incomplete GPX (with timestamps)
        incomplete_content = await incomplete_gpx.read()
        incomplete_parsed = gpxpy.parse(incomplete_content)

        # Parse complete GPX (without timestamps - reference track)
        complete_content = await complete_gpx.read()
        complete_parsed = gpxpy.parse(complete_content)

        # Extract points
        incomplete_points = []
        for track in incomplete_parsed.tracks:
            for segment in track.segments:
                incomplete_points.extend(segment.points)

        complete_points = []
        for track in complete_parsed.tracks:
            for segment in track.segments:
                complete_points.extend(segment.points)

        if not incomplete_points or not complete_points:
            raise HTTPException(status_code=400, detail="GPX files must contain valid tracks")

        # Assess elevation data quality for both files
        incomplete_quality = assess_elevation_quality(incomplete_points)
        complete_quality = assess_elevation_quality(complete_points)

        logger.info(f"Incomplete GPX elevation quality: {incomplete_quality['quality_score']:.1f}/100 ({incomplete_quality['source']})")
        logger.info(f"Complete GPX elevation quality: {complete_quality['quality_score']:.1f}/100 ({complete_quality['source']})")

        # Process complete track elevation if quality is poor
        if complete_quality['recommended_action'] == 'smooth':
            logger.info("Smoothing complete GPX elevation data")
            complete_points = smooth_elevation_data(complete_points, window_size=7)
        elif complete_quality['quality_score'] < 50:
            logger.warning(f"Complete GPX has poor elevation quality. Issues: {complete_quality['issues']}")

        # Parse approximate distance if provided
        approx_km = None
        if approx_distance_km:
            try:
                approx_km = float(approx_distance_km.strip())
            except (ValueError, AttributeError):
                pass  # Ignore invalid input, will use fallback method

        # Find where incomplete GPX ends on complete track
        last_incomplete_point = incomplete_points[-1]
        cutoff_index = find_closest_point_index(
            last_incomplete_point.latitude,
            last_incomplete_point.longitude,
            complete_points,
            approx_distance_km=approx_km
        )

        # Calculate recorded distance and time
        recorded_distance = sum(
            haversine_distance(
                incomplete_points[i].latitude, incomplete_points[i].longitude,
                incomplete_points[i + 1].latitude, incomplete_points[i + 1].longitude
            )
            for i in range(len(incomplete_points) - 1)
        )

        first_time = incomplete_points[0].time
        last_time = incomplete_points[-1].time

        if first_time is None or last_time is None:
            raise HTTPException(
                status_code=400,
                detail="Le GPX incomplet doit contenir des timestamps"
            )

        recorded_time = (last_time - first_time).total_seconds()

        # Calculate remaining distance
        # Start from cutoff_index (not cutoff_index + 1) because we need the distance
        # from the last recorded point to the next point
        remaining_distance = sum(
            haversine_distance(
                complete_points[i].latitude, complete_points[i].longitude,
                complete_points[i + 1].latitude, complete_points[i + 1].longitude
            )
            for i in range(cutoff_index, len(complete_points) - 1)
        )

        # Calculate average speed for missing section
        remaining_time_seconds = official_duration.total_seconds() - recorded_time

        if remaining_time_seconds <= 0:
            raise HTTPException(
                status_code=400,
                detail="Le temps officiel doit être supérieur au temps enregistré"
            )

        # Pre-calculate all segments (distance + slope) for accurate time distribution
        segments = []
        prev_point = incomplete_points[-1]  # Last recorded point

        for i in range(cutoff_index + 1, len(complete_points)):
            point = complete_points[i]

            distance = haversine_distance(
                prev_point.latitude, prev_point.longitude,
                point.latitude, point.longitude
            )
            slope = calculate_slope(prev_point, point)

            segments.append({
                'distance': distance,
                'slope': slope,
                'point': point
            })

            prev_point = point

        # Use binary search to find optimal base speed that gives exact target time
        # This ensures: Σ(distance_i / (v_base * (1 - 2 * slope_i))) = remaining_time_seconds
        def calculate_total_time_with_base_speed(v_base: float) -> float:
            """Calculate total time using given base speed with slope adjustments"""
            total = 0.0
            for seg in segments:
                adjusted_speed = v_base * (1 - 2 * seg['slope'])
                # Apply realistic bounds
                adjusted_speed = max(adjusted_speed, v_base * 0.3)  # Min 30% of base
                adjusted_speed = min(adjusted_speed, v_base * 2.0)  # Max 200% of base
                total += seg['distance'] / adjusted_speed
            return total

        # Binary search for optimal base speed (50 iterations gives precision < 1 second)
        v_min = 0.1  # 0.1 m/s minimum (very slow)
        v_max = 10.0  # 10 m/s maximum (36 km/h, very fast for trail)
        optimal_base_speed = (v_min + v_max) / 2

        for _ in range(50):
            optimal_base_speed = (v_min + v_max) / 2
            calculated_time = calculate_total_time_with_base_speed(optimal_base_speed)

            if abs(calculated_time - remaining_time_seconds) < 1.0:  # Precision: 1 second
                break

            if calculated_time > remaining_time_seconds:
                # Too slow, increase speed
                v_min = optimal_base_speed
            else:
                # Too fast, decrease speed
                v_max = optimal_base_speed

        # Create reconstructed GPX - clean and professional
        reconstructed_gpx = gpxpy.gpx.GPX()
        reconstructed_gpx.creator = "GPX Ninja - Race Recovery"

        reconstructed_track = gpxpy.gpx.GPXTrack()
        reconstructed_gpx.tracks.append(reconstructed_track)
        reconstructed_segment = gpxpy.gpx.GPXTrackSegment()
        reconstructed_track.segments.append(reconstructed_segment)

        # Add recorded points with original timestamps (clean, no extensions)
        for point in incomplete_points:
            clean_point = gpxpy.gpx.GPXTrackPoint(
                latitude=point.latitude,
                longitude=point.longitude,
                elevation=point.elevation,
                time=point.time
            )
            reconstructed_segment.points.append(clean_point)

        # Add missing points with calculated timestamps using optimal base speed
        # Use interpolated elevation if complete track has poor quality
        current_time = last_time
        current_elevation = incomplete_points[-1].elevation if incomplete_points[-1].elevation is not None else 0

        use_interpolated_elevation = (incomplete_quality['quality_score'] > complete_quality['quality_score'] + 20)

        if use_interpolated_elevation:
            logger.info("Using interpolated elevation based on incomplete GPX (better quality)")

        for seg in segments:
            # Calculate adjusted speed with slope
            adjusted_speed = optimal_base_speed * (1 - 2 * seg['slope'])
            # Apply realistic bounds
            adjusted_speed = max(adjusted_speed, optimal_base_speed * 0.3)
            adjusted_speed = min(adjusted_speed, optimal_base_speed * 2.0)

            # Calculate time for this segment
            time_delta_seconds = seg['distance'] / adjusted_speed
            current_time += timedelta(seconds=time_delta_seconds)

            # Determine elevation to use
            if use_interpolated_elevation:
                # Interpolate elevation based on slope and distance
                elevation_change = seg['distance'] * seg['slope']
                current_elevation += elevation_change
                point_elevation = current_elevation
            else:
                # Use elevation from complete track (already smoothed if needed)
                point_elevation = seg['point'].elevation

            # Create point with calculated timestamp and elevation
            new_point = gpxpy.gpx.GPXTrackPoint(
                latitude=seg['point'].latitude,
                longitude=seg['point'].longitude,
                elevation=point_elevation,
                time=current_time
            )

            reconstructed_segment.points.append(new_point)

        # Generate GPX XML
        gpx_xml = reconstructed_gpx.to_xml()

        return Response(
            content=gpx_xml,
            media_type="application/gpx+xml",
            headers={
                "Content-Disposition": "attachment; filename=recovered_race.gpx"
            }
        )

    except HTTPException:
        # Re-raise HTTP exceptions (400 errors from validation)
        raise
    except gpxpy.gpx.GPXException as e:
        raise HTTPException(status_code=400, detail=f"Erreur de parsing GPX: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Erreur de format: {str(e)}")
    except (AttributeError, TypeError) as e:
        # Errors accessing point attributes (missing time, lat, lon, etc.)
        raise HTTPException(status_code=400, detail=f"Données GPX invalides: {str(e)}")
    except Exception as e:
        # Only truly unexpected errors should return 500
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")
