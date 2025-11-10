"""
GPX file parsing and analysis service using gpxpy

This module provides a unified interface to GPX processing services.
All actual implementations have been moved to specialized service modules.
"""
import gpxpy
import gpxpy.gpx
from typing import List, Optional, Tuple

from app.models.gpx import (
    GPXData,
    TrackPoint,
    AidStation,
    AidStationTableResponse,
)
from app.services.gpx_parse_service import GPXParseService
from app.services.gpx_export_service import GPXExportService
from app.services.gpx_merge_service import GPXMergeService
from app.services.aid_station_service import AidStationService
from app.services.statistics_calculator import StatisticsCalculator
from app.services.climb_detector import ClimbDetector


class GPXParser:
    """
    Unified interface for GPX file processing

    This class delegates to specialized services:
    - GPXParseService: Parse GPX files
    - GPXExportService: Generate GPX from segments
    - GPXMergeService: Merge multiple GPX files
    - AidStationService: Generate aid station tables
    """

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
        return GPXParseService.parse_gpx_file(file_content, filename)

    @staticmethod
    def _calculate_statistics(points: List[TrackPoint]):
        """
        Calculate track statistics (delegated to StatisticsCalculator)

        DEPRECATED: Use StatisticsCalculator.calculate_statistics() directly
        """
        return StatisticsCalculator.calculate_statistics(points)

    @staticmethod
    def analyze_segment(points: List[TrackPoint], start_km: float, end_km: float):
        """
        Analyze a segment of the track (delegated to StatisticsCalculator)

        DEPRECATED: Use StatisticsCalculator.analyze_segment() directly
        """
        return StatisticsCalculator.analyze_segment(points, start_km, end_km)

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
        return GPXExportService.generate_gpx_from_segment(
            points, start_km, end_km, track_name
        )

    @staticmethod
    def detect_climbs(
        points: List[TrackPoint],
        min_elevation_gain: float = 300,
        min_ratio: float = 4.0,
        min_gradient: float = 4.0,
        smoothing_window: int = 5,
        min_distance: float = 0.5
    ):
        """
        Detect significant climbs in the track (delegated to ClimbDetector)

        DEPRECATED: Use ClimbDetector.detect_climbs() directly
        """
        return ClimbDetector.detect_climbs(
            points,
            min_elevation_gain,
            min_ratio,
            min_gradient,
            smoothing_window,
            min_distance
        )

    @staticmethod
    def merge_gpx_files(
        files_content: List[Tuple[str, str]],
        gap_threshold_seconds: int = 300,
        interpolate_gaps: bool = False,
        sort_by_time: bool = True,
        merged_track_name: str = "Merged Track"
    ) -> Tuple[gpxpy.gpx.GPX, List[str]]:
        """
        Merge multiple GPX files into a single GPX track

        Args:
            files_content: List of tuples (filename, gpx_xml_content)
            gap_threshold_seconds: Time gap threshold to detect breaks
            interpolate_gaps: If True, interpolate missing points; if False, create new segment
            sort_by_time: Auto-sort by timestamp or keep manual order
            merged_track_name: Name for the merged track

        Returns:
            Tuple of (merged GPX object, list of warnings)
        """
        return GPXMergeService.merge_gpx_files(
            files_content,
            gap_threshold_seconds,
            interpolate_gaps,
            sort_by_time,
            merged_track_name
        )

    @staticmethod
    def generate_aid_station_table(
        points: List[TrackPoint],
        aid_stations: List[AidStation],
        use_naismith: bool = True,
        custom_pace_kmh: Optional[float] = None
    ) -> AidStationTableResponse:
        """
        Generate aid station table with segment statistics and time estimates

        Args:
            points: Track points with distance and elevation
            aid_stations: List of aid stations with km markers
            use_naismith: Use Naismith formula (True) or custom pace (False)
            custom_pace_kmh: Custom pace in km/h if not using Naismith

        Returns:
            AidStationTableResponse with segments and statistics
        """
        return AidStationService.generate_aid_station_table(
            points, aid_stations, use_naismith, custom_pace_kmh
        )
