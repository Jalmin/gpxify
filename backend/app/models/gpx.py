"""
GPX data models (Pydantic schemas for API)
"""
from typing import List, Optional
from pydantic import BaseModel


class Coordinate(BaseModel):
    """Single GPS coordinate point"""
    lat: float
    lon: float
    elevation: Optional[float] = None
    time: Optional[str] = None


class TrackPoint(BaseModel):
    """Extended track point with calculated metrics"""
    lat: float
    lon: float
    elevation: Optional[float] = None
    distance: float  # Cumulative distance in meters
    time: Optional[str] = None


class TrackStatistics(BaseModel):
    """Statistics for a GPX track"""
    total_distance: float  # meters
    total_elevation_gain: float  # meters
    total_elevation_loss: float  # meters
    max_elevation: Optional[float] = None
    min_elevation: Optional[float] = None
    avg_elevation: Optional[float] = None
    duration: Optional[float] = None  # seconds
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class Track(BaseModel):
    """A single GPS track from GPX file"""
    name: Optional[str] = None
    points: List[TrackPoint]
    statistics: TrackStatistics


class GPXData(BaseModel):
    """Complete GPX file data"""
    filename: str
    tracks: List[Track]
    waypoints: List[Coordinate] = []


class GPXUploadResponse(BaseModel):
    """Response after GPX upload"""
    success: bool
    message: str
    data: Optional[GPXData] = None
    file_id: Optional[str] = None


class SegmentAnalysis(BaseModel):
    """Analysis of a specific segment (Phase 3)"""
    start_km: float
    end_km: float
    distance: float  # meters
    elevation_gain: float  # meters
    elevation_loss: float  # meters
    avg_slope: float  # percentage
    max_slope: float  # percentage
    segment_type: str  # "climb", "descent", "flat"


class ClimbSegment(BaseModel):
    """Detected climb segment with statistics"""
    start_km: float
    end_km: float
    distance_km: float
    elevation_gain: float  # D+ in meters
    elevation_loss: float  # D- in meters
    avg_gradient: float  # percentage


class ExportSegmentRequest(BaseModel):
    """Request to export a segment as GPX"""
    track_points: List[TrackPoint]
    start_km: float
    end_km: float
    track_name: str
