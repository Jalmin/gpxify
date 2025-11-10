"""
GPX export service
Handles generation of GPX files from track data
"""
import gpxpy
import gpxpy.gpx
from typing import List
from datetime import datetime
import logging

from app.models.gpx import TrackPoint
from app.utils.elevation_quality import process_elevation_data

logger = logging.getLogger(__name__)


class GPXExportService:
    """Service for exporting GPX files"""

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

        # Convert TrackPoint objects to gpxpy points for elevation quality assessment
        gpx_points_for_assessment = []
        for point in segment_points:
            point_time = None
            if point.time:
                try:
                    point_time = datetime.fromisoformat(point.time.replace('Z', '+00:00'))
                except:
                    pass

            gpx_point = gpxpy.gpx.GPXTrackPoint(
                latitude=point.lat,
                longitude=point.lon,
                elevation=point.elevation,
                time=point_time
            )
            gpx_points_for_assessment.append(gpx_point)

        # Assess and process elevation quality for extracted segment
        processed_gpx_points, quality_report = process_elevation_data(gpx_points_for_assessment)
        logger.info(
            f"Extract segment {start_km:.1f}-{end_km:.1f}km from '{track_name}': "
            f"Elevation quality {quality_report['quality_score']:.1f}/100 ({quality_report['source']}), "
            f"action: {quality_report['processing_applied']}"
        )

        # Create new GPX object - clean and professional
        gpx = gpxpy.gpx.GPX()
        gpx.creator = "GPX Ninja - Extract Segment"

        # Add metadata
        gpx.name = f"{track_name} - Segment {start_km:.1f}km to {end_km:.1f}km"
        gpx.description = f"Segment extracted from {track_name} ({start_km:.1f}km - {end_km:.1f}km)"

        # Create track and segment
        gpx_track = gpxpy.gpx.GPXTrack()
        gpx_track.name = gpx.name
        gpx.tracks.append(gpx_track)

        gpx_segment = gpxpy.gpx.GPXTrackSegment()
        gpx_track.segments.append(gpx_segment)

        # Add processed points to segment (with improved elevation quality)
        for gpx_point in processed_gpx_points:
            gpx_segment.points.append(gpx_point)

        # Convert to XML string
        return gpx.to_xml()
