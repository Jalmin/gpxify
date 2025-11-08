"""
Climb detection service for GPX processing
"""
from typing import List, Optional
from app.models.gpx import TrackPoint, ClimbSegment
from app.services.elevation_service import ElevationService


class ClimbDetector:
    """Service for detecting and analyzing climb segments in GPX tracks"""

    @staticmethod
    def detect_climbs(
        points: List[TrackPoint],
        min_elevation_gain: float = 300,  # meters minimum D+
        min_ratio: float = 4.0,           # D+ must be > min_ratio * D-
        min_gradient: float = 4.0,        # minimum average gradient %
        smoothing_window: int = 5,        # smoothing window size
    ) -> List[ClimbSegment]:
        """
        Detect climb segments based on improved criteria

        New criteria:
        - D+ >= 300m (minimum absolute gain)
        - D+ > 4 × D- (ratio criterion - clean climbs)
        - Average gradient >= 4% (real climbs, not gentle slopes)

        Algorithm:
        1. Smooth elevations to reduce GPS noise
        2. For each point, try to find a climb
        3. Continue while D+/D- ratio > min_ratio
        4. Refine bounds to find true local min/max
        5. Keep climbs with highest D+ when overlapping
        6. Merge consecutive climbs separated by small gaps (< 1000m, < 100m D-)

        Args:
            points: List of track points with elevation data
            min_elevation_gain: Minimum D+ in meters (default 300)
            min_ratio: Minimum ratio D+/D- (default 4.0)
            min_gradient: Minimum average gradient % (default 4.0)
            smoothing_window: Window size for elevation smoothing (default 5)

        Returns:
            List of detected climb segments
        """
        if len(points) < 2:
            return []

        # Step 1: Smooth elevations
        smoothed_elevations = ElevationService.smooth_elevation(points, smoothing_window)

        # Step 2: Find all candidate climbs
        candidates = []
        i = 0

        while i < len(points) - 1:
            # Try to find a climb starting from point i
            candidate = ClimbDetector._find_climb_candidate(
                points,
                smoothed_elevations,
                i,
                min_elevation_gain,
                min_ratio,
                min_gradient
            )

            if candidate:
                candidates.append(candidate)
                # Skip past this climb
                i = candidate["end_idx"] + 1
            else:
                i += 1

        # Step 3: Remove overlapping climbs (keep highest D+)
        final_climbs = ClimbDetector._remove_overlaps(candidates)

        # Step 4: Merge consecutive climbs separated by small gaps (faux-plats)
        merged_climbs = ClimbDetector._merge_consecutive_climbs(
            final_climbs,
            points,
            smoothed_elevations,
            max_gap_distance=1000,  # 1000m max gap
            max_gap_descent=100,    # 100m max D- in gap
            min_elevation_gain=min_elevation_gain,
            min_ratio=min_ratio,
            min_gradient=min_gradient
        )

        return merged_climbs

    @staticmethod
    def _find_climb_candidate(
        points: List[TrackPoint],
        smoothed_elevations: List[float],
        start_idx: int,
        min_elevation_gain: float,
        min_ratio: float,
        min_gradient: float
    ) -> Optional[dict]:
        """
        Try to find a valid climb starting from start_idx

        NEW APPROACH: Continue climbing as long as ratio stays good,
        then check at the end if it meets minimum criteria.

        IMPROVED: Stop early if we detect a significant descent after reaching summit.

        Returns dictionary with climb info if found, None otherwise
        """
        prev_elevation = smoothed_elevations[start_idx]
        current_d_plus = 0.0
        current_d_minus = 0.0
        best_end_idx = None
        peak_elevation = smoothed_elevations[start_idx]
        descent_from_peak = 0.0
        max_descent_from_peak = 50  # Stop if we descend more than 50m from highest point

        # Scan forward accumulating D+ and D-, continuing as long as ratio is good
        for end_idx in range(start_idx + 1, len(points)):
            current_elevation = smoothed_elevations[end_idx]
            elev_diff = current_elevation - prev_elevation

            if elev_diff > 0:
                current_d_plus += elev_diff
                # Update peak if we reached a new high
                if current_elevation > peak_elevation:
                    peak_elevation = current_elevation
                    descent_from_peak = 0
            else:
                current_d_minus += abs(elev_diff)
                # Track descent from peak
                descent_from_peak = peak_elevation - current_elevation

            prev_elevation = current_elevation

            # Track the last point where we still have a good climb
            if current_d_plus >= min_elevation_gain:
                if current_d_minus == 0 or current_d_plus / current_d_minus > min_ratio:
                    best_end_idx = end_idx

            # STOP CONDITIONS:
            # 1. Descended too much from peak (we're past the summit)
            if descent_from_peak > max_descent_from_peak:
                break

            # 2. Ratio becomes bad (too much D- overall)
            if current_d_minus > 0 and current_d_plus / current_d_minus < min_ratio:
                break

        # Check if we found a valid climb
        if best_end_idx is not None:
            # Refine bounds to find true local min/max
            refined_start = ElevationService.find_local_minimum(
                points, smoothed_elevations, start_idx, search_distance=10
            )
            refined_end = ElevationService.find_local_maximum(
                points, smoothed_elevations, best_end_idx, search_distance=10
            )

            # Recalculate stats with refined bounds
            stats = ClimbDetector._calculate_climb_stats(
                points, smoothed_elevations, refined_start, refined_end
            )

            # Verify final criteria
            if (stats["d_plus"] >= min_elevation_gain and
                (stats["d_minus"] == 0 or stats["d_plus"] > min_ratio * stats["d_minus"]) and
                stats["avg_gradient"] >= min_gradient):

                # Create climb segment
                start_km = points[refined_start].distance / 1000
                end_km = points[refined_end].distance / 1000
                distance_km = stats["distance"] / 1000

                climb_segment = ClimbSegment(
                    start_km=start_km,
                    end_km=end_km,
                    distance_km=distance_km,
                    elevation_gain=stats["d_plus"],
                    elevation_loss=stats["d_minus"],
                    avg_gradient=stats["avg_gradient"]
                )

                return {
                    "climb": climb_segment,
                    "start_idx": refined_start,
                    "end_idx": refined_end,
                    "d_plus": stats["d_plus"]
                }

        return None

    @staticmethod
    def _remove_overlaps(candidates: List[dict]) -> List[ClimbSegment]:
        """
        Remove overlapping climbs, keeping the one with highest D+

        Args:
            candidates: List of climb candidates with start_idx, end_idx, d_plus

        Returns:
            List of non-overlapping ClimbSegments
        """
        if not candidates:
            return []

        # Sort by D+ descending (highest first)
        sorted_candidates = sorted(candidates, key=lambda x: x["d_plus"], reverse=True)

        final_climbs = []
        used_ranges = []

        for candidate in sorted_candidates:
            start = candidate["start_idx"]
            end = candidate["end_idx"]

            # Check if this range overlaps with any already selected
            overlaps = False
            for used_start, used_end in used_ranges:
                if not (end < used_start or start > used_end):
                    # Ranges overlap
                    overlaps = True
                    break

            if not overlaps:
                final_climbs.append(candidate["climb"])
                used_ranges.append((start, end))

        # Sort by start position for display
        final_climbs.sort(key=lambda x: x.start_km)

        return final_climbs

    @staticmethod
    def _merge_consecutive_climbs(
        climbs: List[ClimbSegment],
        points: List[TrackPoint],
        smoothed_elevations: List[float],
        max_gap_distance: float = 500,  # meters
        max_gap_descent: float = 50,    # meters
        min_elevation_gain: float = 300,
        min_ratio: float = 4.0,
        min_gradient: float = 4.0,
    ) -> List[ClimbSegment]:
        """
        Merge consecutive climbs that are separated by small gaps (faux-plats)

        Args:
            climbs: List of detected climbs (sorted by start position)
            points: Original track points
            smoothed_elevations: Smoothed elevation data
            max_gap_distance: Maximum distance between climbs to consider merging (meters)
            max_gap_descent: Maximum D- in gap to allow merging (meters)
            min_elevation_gain: Minimum D+ for merged climb
            min_ratio: Minimum D+/D- ratio for merged climb
            min_gradient: Minimum gradient for merged climb

        Returns:
            List of climbs with consecutive ones merged
        """
        if len(climbs) <= 1:
            return climbs

        merged = []
        i = 0

        while i < len(climbs):
            current_climb = climbs[i]

            # Find current climb indices
            current_start_idx = None
            current_end_idx = None
            for idx, point in enumerate(points):
                if abs(point.distance / 1000 - current_climb.start_km) < 0.01:
                    current_start_idx = idx
                if abs(point.distance / 1000 - current_climb.end_km) < 0.01:
                    current_end_idx = idx
                    break

            if current_start_idx is None or current_end_idx is None:
                merged.append(current_climb)
                i += 1
                continue

            # Try to merge with next climb(s)
            merged_end_idx = current_end_idx
            j = i + 1

            while j < len(climbs):
                next_climb = climbs[j]

                # Find next climb start index
                next_start_idx = None
                for idx, point in enumerate(points):
                    if abs(point.distance / 1000 - next_climb.start_km) < 0.01:
                        next_start_idx = idx
                        break

                if next_start_idx is None:
                    break

                # Check gap distance
                gap_distance = points[next_start_idx].distance - points[merged_end_idx].distance
                if gap_distance > max_gap_distance:
                    break  # Gap too large

                # Check D- in gap
                gap_d_minus = 0.0
                for idx in range(merged_end_idx + 1, next_start_idx + 1):
                    elev_diff = smoothed_elevations[idx] - smoothed_elevations[idx - 1]
                    if elev_diff < 0:
                        gap_d_minus += abs(elev_diff)

                if gap_d_minus > max_gap_descent:
                    break  # Too much descent in gap

                # Find next climb end index
                next_end_idx = None
                for idx, point in enumerate(points):
                    if abs(point.distance / 1000 - next_climb.end_km) < 0.01:
                        next_end_idx = idx
                        break

                if next_end_idx is None:
                    break

                # Try merging: check if merged climb meets criteria
                merged_stats = ClimbDetector._calculate_climb_stats(
                    points, smoothed_elevations, current_start_idx, next_end_idx
                )

                # Check if merged climb is valid
                if (merged_stats["d_plus"] >= min_elevation_gain and
                    (merged_stats["d_minus"] == 0 or merged_stats["d_plus"] > min_ratio * merged_stats["d_minus"]) and
                    merged_stats["avg_gradient"] >= min_gradient):

                    # Valid merge, continue to next climb
                    merged_end_idx = next_end_idx
                    j += 1
                else:
                    # Merged climb doesn't meet criteria, stop here
                    break

            # Create final merged climb
            if merged_end_idx != current_end_idx:
                # We merged climbs
                final_stats = ClimbDetector._calculate_climb_stats(
                    points, smoothed_elevations, current_start_idx, merged_end_idx
                )

                merged_climb = ClimbSegment(
                    start_km=points[current_start_idx].distance / 1000,
                    end_km=points[merged_end_idx].distance / 1000,
                    distance_km=final_stats["distance"] / 1000,
                    elevation_gain=final_stats["d_plus"],
                    elevation_loss=final_stats["d_minus"],
                    avg_gradient=final_stats["avg_gradient"]
                )
                merged.append(merged_climb)
                i = j  # Skip all merged climbs
            else:
                # No merge, keep original
                merged.append(current_climb)
                i += 1

        return merged

    @staticmethod
    def _calculate_climb_stats(
        points: List[TrackPoint],
        smoothed_elevations: List[float],
        start_idx: int,
        end_idx: int
    ) -> dict:
        """
        Calculate D+, D-, distance, and gradient for a segment

        Args:
            points: List of track points
            smoothed_elevations: Smoothed elevation data
            start_idx: Start index
            end_idx: End index

        Returns:
            Dictionary with elevation_gain, elevation_loss, distance, avg_gradient
        """
        d_plus = 0.0
        d_minus = 0.0

        # Calculate D+ and D- using smoothed elevations
        for i in range(start_idx + 1, end_idx + 1):
            elev_diff = smoothed_elevations[i] - smoothed_elevations[i - 1]
            if elev_diff > 0:
                d_plus += elev_diff
            else:
                d_minus += abs(elev_diff)

        # Calculate distance
        distance = points[end_idx].distance - points[start_idx].distance

        # Calculate average gradient
        avg_gradient = (d_plus / distance * 100) if distance > 0 else 0

        return {
            "d_plus": d_plus,
            "d_minus": d_minus,
            "distance": distance,
            "avg_gradient": avg_gradient
        }
