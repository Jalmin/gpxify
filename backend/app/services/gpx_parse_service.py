"""
GPX file parsing service
Handles parsing of GPX files and extracting track data
"""
import gpxpy
import gpxpy.gpx
from typing import List
import logging

from app.models.gpx import GPXData, Track, TrackPoint, Coordinate
from app.services.distance_calculator import DistanceCalculator
from app.services.statistics_calculator import StatisticsCalculator
from app.utils.elevation_quality import process_elevation_data

logger = logging.getLogger(__name__)


class GPXParseService:
    """Service for parsing GPX files"""

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
        for track in gpx.tracks:
            track_points: List[TrackPoint] = []
            accumulated_distance = 0.0

            for segment in track.segments:
                segment_points = segment.points
                if not segment_points:
                    continue

                # Process elevation data (quality assessment + smoothing if needed)
                processed_points, quality_report = process_elevation_data(segment_points)
                logger.info(
                    f"Track '{track.name}': Elevation quality {quality_report['quality_score']:.1f}/100 "
                    f"({quality_report['source']}), action: {quality_report['processing_applied']}"
                )
                segment_points = processed_points

                for i, point in enumerate(segment_points):
                    # Calculate distance from previous point
                    if i > 0:
                        prev_point = segment_points[i - 1]
                        distance = DistanceCalculator.haversine_distance(
                            prev_point.latitude,
                            prev_point.longitude,
                            point.latitude,
                            point.longitude,
                        )
                        accumulated_distance += distance

                    track_point = TrackPoint(
                        lat=point.latitude,
                        lon=point.longitude,
                        elevation=point.elevation if point.elevation is not None else 0.0,
                        time=point.time,
                        distance=accumulated_distance,
                    )
                    track_points.append(track_point)

            if not track_points:
                continue

            # Calculate statistics using StatisticsCalculator
            statistics = StatisticsCalculator.calculate_statistics(track_points)

            # Get bounds
            bounds = gpx.get_bounds()
            bounds_data = None
            if bounds:
                bounds_data = {
                    "min_lat": bounds.min_latitude,
                    "max_lat": bounds.max_latitude,
                    "min_lon": bounds.min_longitude,
                    "max_lon": bounds.max_longitude,
                }

            track_obj = Track(
                name=track.name or "Sans nom",
                points=track_points,
                statistics=statistics,
                bounds=bounds_data,
            )
            tracks.append(track_obj)

        return GPXData(filename=filename, tracks=tracks)
