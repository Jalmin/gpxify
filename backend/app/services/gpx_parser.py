"""
GPX file parsing and analysis service using gpxpy
"""
import gpxpy
import gpxpy.gpx
from typing import List, Optional, Tuple
from datetime import datetime
from app.models.gpx import (
    GPXData,
    Track,
    TrackPoint,
    TrackStatistics,
    Coordinate,
    ClimbSegment,
)


class GPXParser:
    """Service for parsing and analyzing GPX files"""

    @staticmethod
    def parse_gpx_file(file_content: str, filename: str) -> GPXData:
        """
        Parse GPX file content and extract track data with statistics

        Args:
            file_content: GPX file content as string
            filename: Original filename

        Returns:
            GPXData object with tracks and statistics
        """
        gpx = gpxpy.parse(file_content)

        tracks = []
        waypoints = []

        # Parse waypoints
        for waypoint in gpx.waypoints:
            waypoints.append(
                Coordinate(
                    lat=waypoint.latitude,
                    lon=waypoint.longitude,
                    elevation=waypoint.elevation,
                )
            )

        # Parse tracks
        for track in gpx.tracks:
            track_points = []
            cumulative_distance = 0.0

            for segment in track.segments:
                previous_point = None

                for point in segment.points:
                    # Calculate distance from previous point
                    if previous_point:
                        distance_delta = point.distance_3d(previous_point) or 0
                        cumulative_distance += distance_delta

                    track_points.append(
                        TrackPoint(
                            lat=point.latitude,
                            lon=point.longitude,
                            elevation=point.elevation,
                            distance=cumulative_distance,
                            time=point.time.isoformat() if point.time else None,
                        )
                    )

                    previous_point = point

            # Calculate statistics
            statistics = GPXParser._calculate_statistics(track, track_points)

            tracks.append(
                Track(
                    name=track.name,
                    points=track_points,
                    statistics=statistics,
                )
            )

        return GPXData(
            filename=filename,
            tracks=tracks,
            waypoints=waypoints,
        )

    @staticmethod
    def _calculate_statistics(
        track: gpxpy.gpx.GPXTrack, track_points: List[TrackPoint]
    ) -> TrackStatistics:
        """Calculate track statistics"""

        # Use gpxpy built-in methods
        uphill, downhill = track.get_uphill_downhill()
        moving_data = track.get_moving_data()
        elevation_extremes = track.get_elevation_extremes()

        # Total distance
        total_distance = track.length_3d() or 0.0

        # Duration
        duration = None
        start_time = None
        end_time = None

        if moving_data and moving_data.moving_time:
            duration = moving_data.moving_time

        time_bounds = track.get_time_bounds()
        if time_bounds.start_time:
            start_time = time_bounds.start_time.isoformat()
        if time_bounds.end_time:
            end_time = time_bounds.end_time.isoformat()

        # Average elevation
        avg_elevation = None
        if track_points:
            elevations = [p.elevation for p in track_points if p.elevation is not None]
            if elevations:
                avg_elevation = sum(elevations) / len(elevations)

        return TrackStatistics(
            total_distance=total_distance,
            total_elevation_gain=uphill or 0.0,
            total_elevation_loss=downhill or 0.0,
            max_elevation=elevation_extremes.maximum if elevation_extremes else None,
            min_elevation=elevation_extremes.minimum if elevation_extremes else None,
            avg_elevation=avg_elevation,
            duration=duration,
            start_time=start_time,
            end_time=end_time,
        )

    @staticmethod
    def analyze_segment(
        track_points: List[TrackPoint], start_km: float, end_km: float
    ) -> dict:
        """
        Analyze a specific segment of the track (Phase 3)

        Args:
            track_points: List of track points
            start_km: Start distance in kilometers
            end_km: End distance in kilometers

        Returns:
            Dictionary with segment analysis
        """
        # Convert km to meters
        start_m = start_km * 1000
        end_m = end_km * 1000

        # Filter points in segment
        segment_points = [
            p for p in track_points if start_m <= p.distance <= end_m
        ]

        if len(segment_points) < 2:
            return {
                "error": "Segment too short or no points found",
                "distance": 0,
                "elevation_gain": 0,
                "elevation_loss": 0,
            }

        # Calculate segment statistics
        elevation_gain = 0.0
        elevation_loss = 0.0

        for i in range(1, len(segment_points)):
            prev = segment_points[i - 1]
            curr = segment_points[i]

            if prev.elevation is not None and curr.elevation is not None:
                ele_diff = curr.elevation - prev.elevation
                if ele_diff > 0:
                    elevation_gain += ele_diff
                else:
                    elevation_loss += abs(ele_diff)

        distance = segment_points[-1].distance - segment_points[0].distance

        return {
            "start_km": start_km,
            "end_km": end_km,
            "distance": distance,
            "elevation_gain": elevation_gain,
            "elevation_loss": elevation_loss,
            "num_points": len(segment_points),
        }

    @staticmethod
    def generate_gpx_from_segment(
        points: List[TrackPoint],
        start_km: float,
        end_km: float,
        track_name: str
    ) -> str:
        """
        Generate GPX XML string from a segment of track points

        Args:
            points: List of all track points
            start_km: Start of segment in kilometers
            end_km: End of segment in kilometers
            track_name: Name for the exported track

        Returns:
            GPX XML string
        """
        # Filter points within segment range
        start_m = start_km * 1000
        end_m = end_km * 1000
        segment_points = [p for p in points if start_m <= p.distance <= end_m]

        if not segment_points:
            raise ValueError("No points found in the specified segment range")

        # Create new GPX object
        gpx = gpxpy.gpx.GPX()

        # Add metadata
        gpx.name = f"{track_name} - Segment {start_km:.1f}km to {end_km:.1f}km"
        gpx.description = f"Exported segment from GPXIFY"

        # Create track and segment
        gpx_track = gpxpy.gpx.GPXTrack()
        gpx_track.name = gpx.name
        gpx.tracks.append(gpx_track)

        gpx_segment = gpxpy.gpx.GPXTrackSegment()
        gpx_track.segments.append(gpx_segment)

        # Add points to segment
        for point in segment_points:
            # Parse time string to datetime if available
            point_time = None
            if point.time:
                try:
                    point_time = datetime.fromisoformat(point.time.replace('Z', '+00:00'))
                except:
                    pass  # Skip if time parsing fails

            gpx_point = gpxpy.gpx.GPXTrackPoint(
                latitude=point.lat,
                longitude=point.lon,
                elevation=point.elevation,
                time=point_time
            )
            gpx_segment.points.append(gpx_point)

        # Convert to XML string
        return gpx.to_xml()

    @staticmethod
    def _smooth_elevation(points: List[TrackPoint], window_size: int = 5) -> List[float]:
        """
        Smooth elevation data using moving average to reduce GPS noise

        Args:
            points: List of track points
            window_size: Size of the moving average window

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
            elevations = [p.elevation for p in points[start:end] if p.elevation is not None]
            if elevations:
                avg_elev = sum(elevations) / len(elevations)
            else:
                avg_elev = points[i].elevation or 0

            smoothed.append(avg_elev)

        return smoothed

    @staticmethod
    def _find_local_minimum(
        points: List[TrackPoint],
        smoothed_elevations: List[float],
        start_idx: int,
        search_distance: int = 10
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
    def _find_local_maximum(
        points: List[TrackPoint],
        smoothed_elevations: List[float],
        end_idx: int,
        search_distance: int = 10
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
        smoothed_elevations = GPXParser._smooth_elevation(points, smoothing_window)

        # Step 2: Find all candidate climbs
        candidates = []
        i = 0

        while i < len(points) - 1:
            # Try to find a climb starting from point i
            candidate = GPXParser._find_climb_candidate(
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
        final_climbs = GPXParser._remove_overlaps(candidates)

        # Step 4: Merge consecutive climbs separated by small gaps (faux-plats)
        merged_climbs = GPXParser._merge_consecutive_climbs(
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

        Returns dictionary with climb info if found, None otherwise
        """
        prev_elevation = smoothed_elevations[start_idx]
        current_d_plus = 0.0
        current_d_minus = 0.0
        best_end_idx = None

        # Scan forward accumulating D+ and D-, continuing as long as ratio is good
        for end_idx in range(start_idx + 1, len(points)):
            current_elevation = smoothed_elevations[end_idx]
            elev_diff = current_elevation - prev_elevation

            if elev_diff > 0:
                current_d_plus += elev_diff
            else:
                current_d_minus += abs(elev_diff)

            prev_elevation = current_elevation

            # Track the last point where we still have a good climb
            if current_d_plus >= min_elevation_gain:
                if current_d_minus == 0 or current_d_plus / current_d_minus > min_ratio:
                    best_end_idx = end_idx

            # Check if ratio becomes bad (we've reached the top and started descending)
            if current_d_minus > 0 and current_d_plus / current_d_minus < min_ratio:
                # Ratio degraded, stop here
                break

        # Check if we found a valid climb
        if best_end_idx is not None:
            # Refine bounds to find true local min/max
            refined_start = GPXParser._find_local_minimum(
                points, smoothed_elevations, start_idx, search_distance=10
            )
            refined_end = GPXParser._find_local_maximum(
                points, smoothed_elevations, best_end_idx, search_distance=10
            )

            # Recalculate stats with refined bounds
            stats = GPXParser._calculate_climb_stats(
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
                merged_stats = GPXParser._calculate_climb_stats(
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
                final_stats = GPXParser._calculate_climb_stats(
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
