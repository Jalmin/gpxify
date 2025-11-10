"""
Elevation data quality assessment and processing utilities
"""
import gpxpy.gpx
from typing import List, Dict
import math


def assess_elevation_quality(points: List[gpxpy.gpx.GPXTrackPoint]) -> Dict:
    """
    Assess the quality of elevation data in a GPX track

    Args:
        points: List of GPX track points

    Returns:
        Dictionary containing:
        - quality_score: 0-100 score
        - source: 'barometric'|'gps'|'unknown'
        - issues: List of detected issues
        - recommended_action: 'use'|'smooth'|'interpolate'
        - statistics: Detailed statistics
    """
    # Check if we have elevation data
    elevations = [p.elevation for p in points if p.elevation is not None]

    if not elevations:
        return {
            'quality_score': 0,
            'source': 'missing',
            'issues': ['no_elevation_data'],
            'recommended_action': 'interpolate',
            'statistics': {}
        }

    if len(elevations) < 10:
        return {
            'quality_score': 20,
            'source': 'insufficient',
            'issues': ['too_few_points'],
            'recommended_action': 'interpolate',
            'statistics': {'point_count': len(elevations)}
        }

    issues = []

    # 1. Detect big jumps (>20m between consecutive points)
    big_jumps = 0
    max_jump = 0
    for i in range(1, len(elevations)):
        jump = abs(elevations[i] - elevations[i-1])
        if jump > 20:
            big_jumps += 1
            max_jump = max(max_jump, jump)

    jump_ratio = big_jumps / len(elevations) if elevations else 0
    if jump_ratio > 0.05:  # More than 5% of points have big jumps
        issues.append(f'frequent_jumps ({big_jumps} jumps, max {max_jump:.1f}m)')

    # 2. Detect identical consecutive values (low-resolution GPS)
    identical_count = 0
    for i in range(1, len(elevations)):
        if elevations[i] == elevations[i-1]:
            identical_count += 1

    identical_ratio = identical_count / len(elevations) if elevations else 0
    if identical_ratio > 0.3:  # More than 30% identical
        issues.append(f'low_resolution ({identical_ratio:.1%} identical values)')

    # 3. Detect unrealistic patterns (constant elevation over long distance)
    # Check for sequences of 10+ identical values
    max_identical_sequence = 0
    current_sequence = 1
    for i in range(1, len(elevations)):
        if elevations[i] == elevations[i-1]:
            current_sequence += 1
            max_identical_sequence = max(max_identical_sequence, current_sequence)
        else:
            current_sequence = 1

    if max_identical_sequence > 10:
        issues.append(f'flat_sections ({max_identical_sequence} consecutive identical values)')

    # 4. Calculate quality score
    quality_score = 100.0

    # Penalize for jumps (0-40 points penalty)
    quality_score -= min(jump_ratio * 100, 40)

    # Penalize for low resolution (0-30 points penalty)
    quality_score -= min(identical_ratio * 50, 30)

    # Penalize for long flat sections (0-20 points penalty)
    if max_identical_sequence > 10:
        quality_score -= min((max_identical_sequence - 10) * 2, 20)

    quality_score = max(0, quality_score)

    # 5. Determine source type
    # Barometric: smooth, few jumps, good resolution
    # GPS: more variation, can have jumps, lower resolution
    if jump_ratio < 0.02 and identical_ratio < 0.1:
        source = 'barometric'
    elif jump_ratio < 0.1:
        source = 'gps'
    else:
        source = 'unknown'

    if quality_score < 40:
        source = 'unknown'

    # 6. Determine recommended action
    if quality_score >= 80:
        action = 'use'  # Use as-is
    elif quality_score >= 50:
        action = 'smooth'  # Apply smoothing
    else:
        action = 'interpolate'  # Need better data

    # 7. Collect statistics
    statistics = {
        'point_count': len(elevations),
        'min_elevation': min(elevations),
        'max_elevation': max(elevations),
        'elevation_range': max(elevations) - min(elevations),
        'big_jumps': big_jumps,
        'jump_ratio': jump_ratio,
        'max_jump': max_jump,
        'identical_ratio': identical_ratio,
        'max_identical_sequence': max_identical_sequence
    }

    return {
        'quality_score': quality_score,
        'source': source,
        'issues': issues,
        'recommended_action': action,
        'statistics': statistics
    }


def smooth_elevation_data(points: List[gpxpy.gpx.GPXTrackPoint],
                          window_size: int = 5) -> List[gpxpy.gpx.GPXTrackPoint]:
    """
    Smooth elevation data using a moving average filter

    Args:
        points: List of GPX track points
        window_size: Size of the moving average window (must be odd)

    Returns:
        New list of points with smoothed elevations
    """
    if window_size % 2 == 0:
        window_size += 1  # Ensure window size is odd

    elevations = [p.elevation if p.elevation is not None else 0 for p in points]
    smoothed = []

    half_window = window_size // 2

    for i in range(len(elevations)):
        # Define window boundaries
        start = max(0, i - half_window)
        end = min(len(elevations), i + half_window + 1)

        # Calculate average in window
        window_values = elevations[start:end]
        avg_elevation = sum(window_values) / len(window_values)
        smoothed.append(avg_elevation)

    # Create new points with smoothed elevations
    smoothed_points = []
    for point, new_ele in zip(points, smoothed):
        new_point = gpxpy.gpx.GPXTrackPoint(
            latitude=point.latitude,
            longitude=point.longitude,
            elevation=new_ele,
            time=point.time
        )
        smoothed_points.append(new_point)

    return smoothed_points


def interpolate_elevation_linear(points: List[gpxpy.gpx.GPXTrackPoint],
                                 base_elevation: float,
                                 distances: List[float],
                                 slopes: List[float]) -> List[gpxpy.gpx.GPXTrackPoint]:
    """
    Interpolate elevation based on terrain slope and distance

    Args:
        points: List of GPX track points (with potentially bad elevation data)
        base_elevation: Starting elevation (from last known good point)
        distances: List of distances for each segment
        slopes: List of slopes for each segment

    Returns:
        New list of points with interpolated elevations
    """
    interpolated_points = []
    current_elevation = base_elevation

    for i, (point, distance, slope) in enumerate(zip(points, distances, slopes)):
        # Calculate elevation change based on slope and distance
        elevation_change = distance * slope
        current_elevation += elevation_change

        # Create new point with interpolated elevation
        new_point = gpxpy.gpx.GPXTrackPoint(
            latitude=point.latitude,
            longitude=point.longitude,
            elevation=current_elevation,
            time=point.time
        )
        interpolated_points.append(new_point)

    return interpolated_points


def process_elevation_data(points: List[gpxpy.gpx.GPXTrackPoint],
                           force_action: str = None) -> tuple[List[gpxpy.gpx.GPXTrackPoint], Dict]:
    """
    Process elevation data based on quality assessment

    Args:
        points: List of GPX track points
        force_action: Override automatic action ('use'|'smooth'|'interpolate')

    Returns:
        Tuple of (processed_points, quality_report)
    """
    # Assess quality
    quality = assess_elevation_quality(points)

    # Determine action
    action = force_action or quality['recommended_action']

    # Apply processing
    if action == 'use':
        processed_points = points
    elif action == 'smooth':
        processed_points = smooth_elevation_data(points, window_size=5)
    else:  # interpolate or any other case
        # Cannot interpolate without additional context
        # Return smoothed data as fallback
        processed_points = smooth_elevation_data(points, window_size=7)

    # Add processing info to quality report
    quality['processing_applied'] = action

    return processed_points, quality
