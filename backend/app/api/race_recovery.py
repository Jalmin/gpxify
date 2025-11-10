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

router = APIRouter()


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
                              max_search_ratio: float = 0.75) -> int:
    """
    Find the index of the closest point in a GPX track to a target coordinate

    Args:
        target_lat: Target latitude
        target_lon: Target longitude
        points: List of GPX track points
        max_search_ratio: Only search in the first X% of the track (default 0.75 = 75%)
                         This prevents matching with loops or return paths later in the track

    Returns:
        Index of the closest point
    """
    min_distance = float('inf')
    closest_index = 0

    # Only search in the first portion of the track to avoid false matches
    # with loops or sections where the track crosses itself
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
    official_time: str = Form(..., description="Temps officiel total (format: HH:MM:SS)")
):
    """
    Reconstruct a complete GPX file from:
    - Partial GPX recording (with timestamps) from watch
    - Complete GPX track (without timestamps) from race course
    - Official finish time

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

        # Find where incomplete GPX ends on complete track
        last_incomplete_point = incomplete_points[-1]
        cutoff_index = find_closest_point_index(
            last_incomplete_point.latitude,
            last_incomplete_point.longitude,
            complete_points
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

        avg_speed_missing = remaining_distance / remaining_time_seconds  # m/s

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

        # Add missing points with calculated timestamps
        # Start from cutoff_index + 1 to avoid duplicating the last recorded point
        current_time = last_time
        prev_point = incomplete_points[-1]  # Last recorded point

        for i in range(cutoff_index + 1, len(complete_points)):
            point = complete_points[i]

            # Calculate time from previous point to current point BEFORE creating the point
            slope = calculate_slope(prev_point, point)
            # vitesse = vitesse_moyenne * (1 - 2 * pente)
            adjusted_speed = avg_speed_missing * (1 - 2 * slope)

            # Ensure speed is positive
            if adjusted_speed <= 0:
                adjusted_speed = avg_speed_missing * 0.1  # Minimum 10% of average

            # Calculate distance from previous point
            distance_from_prev = haversine_distance(
                prev_point.latitude, prev_point.longitude,
                point.latitude, point.longitude
            )

            # Calculate time needed and increment current_time
            time_from_prev_seconds = distance_from_prev / adjusted_speed
            current_time += timedelta(seconds=time_from_prev_seconds)

            # NOW create the point with the incremented timestamp
            new_point = gpxpy.gpx.GPXTrackPoint(
                latitude=point.latitude,
                longitude=point.longitude,
                elevation=point.elevation,
                time=current_time
            )

            reconstructed_segment.points.append(new_point)

            # Update prev_point for next iteration
            prev_point = point

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
