"""
GPX data models (Pydantic schemas for API)
"""
from enum import Enum
from typing import List, Optional
from fastapi import HTTPException
from pydantic import BaseModel, Field, model_validator


class CalcMode(str, Enum):
    """Time estimation mode for aid station table."""
    NAISMITH = "naismith"
    CONSTANT_PACE = "constant_pace"
    TRAIL_PLANNER = "trail_planner"


class TrailPlannerConfig(BaseModel):
    """User-tunable parameters for the Trail Planner calc mode."""
    flat_pace_kmh: float = Field(..., gt=0, le=30)
    climb_penalty_min_per_100m: float = Field(..., ge=0, le=30)
    descent_bonus_min_per_100m: float = Field(..., ge=0, le=20)
    fatigue_percent_per_interval: float = Field(default=0, ge=0, le=50)
    fatigue_interval_km: float = Field(default=20, gt=0)


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


class MergeOptions(BaseModel):
    """Options for merging GPX tracks"""
    gap_threshold_seconds: int = 300  # If gap > 5min, consider it a real gap
    interpolate_gaps: bool = False  # If True, draw straight line; if False, keep gap
    sort_by_time: bool = True  # Auto-sort by timestamp or keep manual order


class GPXFileInput(BaseModel):
    """Single GPX file for merging"""
    filename: str
    content: str  # GPX XML content as string


class MergeGPXRequest(BaseModel):
    """Request to merge multiple GPX files"""
    files: List[GPXFileInput]
    options: MergeOptions = MergeOptions()
    merged_track_name: Optional[str] = "Merged Track"


class MergeGPXResponse(BaseModel):
    """Response after merging GPX files"""
    success: bool
    message: str
    merged_gpx: Optional[str] = None  # Merged GPX XML
    data: Optional[GPXData] = None  # Parsed merged data for preview
    warnings: List[str] = []  # Warnings about gaps, overlaps, etc.


class AidStation(BaseModel):
    """Aid station marker on the track"""
    name: str
    distance_km: float  # Distance from start in km


class AidStationSegment(BaseModel):
    """Segment between two aid stations with statistics"""
    from_station: str
    to_station: str
    start_km: float
    end_km: float
    distance_km: float  # Delta distance for this segment
    elevation_gain: float  # D+ in meters
    elevation_loss: float  # D- in meters
    estimated_time_minutes: Optional[float] = None  # User-provided or calculated
    avg_gradient: float  # Average gradient %


class AidStationTableRequest(BaseModel):
    """Request to generate aid station table.

    Supports three time-estimation modes via `calc_mode`:
    - NAISMITH (default): modified Naismith rule for trail running
    - CONSTANT_PACE: flat km/h pace, requires `constant_pace_kmh`
    - TRAIL_PLANNER: 4 tunable parameters, requires `trail_planner_config`
    """
    track_points: List[TrackPoint]
    aid_stations: List[AidStation]
    calc_mode: CalcMode = CalcMode.NAISMITH
    # Parity with the frontend Zod schema (CalcConfigSchema.constant_pace_kmh)
    # and with TrailPlannerConfig.flat_pace_kmh. Prevents a crafted client
    # from submitting nonsense paces (e.g. 9999 km/h).
    constant_pace_kmh: Optional[float] = Field(default=None, gt=0, le=30)
    trail_planner_config: Optional[TrailPlannerConfig] = None

    @model_validator(mode="before")
    @classmethod
    def _reject_deprecated_fields(cls, data):
        if isinstance(data, dict) and "use_naismith" in data:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Field 'use_naismith' is deprecated. "
                    "Use 'calc_mode' enum: 'naismith' | 'constant_pace' | 'trail_planner'."
                ),
            )
        return data

    @model_validator(mode="after")
    def _enforce_calc_mode_coherence(self):
        if self.calc_mode == CalcMode.CONSTANT_PACE and self.constant_pace_kmh is None:
            raise ValueError(
                "constant_pace_kmh is required when calc_mode=constant_pace"
            )
        if self.calc_mode == CalcMode.TRAIL_PLANNER and self.trail_planner_config is None:
            raise ValueError(
                "trail_planner_config is required when calc_mode=trail_planner"
            )
        return self


class AidStationTableResponse(BaseModel):
    """Response with aid station table"""
    success: bool
    message: str
    segments: List[AidStationSegment]
    total_distance_km: float
    total_elevation_gain: float
    total_elevation_loss: float
    total_time_minutes: Optional[float] = None


class SaveStateRequest(BaseModel):
    """Request to save application state for sharing"""
    state_json: dict  # Complete application state


class SaveStateResponse(BaseModel):
    """Response after saving state"""
    success: bool
    share_id: str
    url: str
    expires_at: str  # ISO format timestamp


class SharedStateResponse(BaseModel):
    """Response when retrieving shared state"""
    success: bool
    share_id: str
    state_json: dict
    created_at: str
    view_count: int
