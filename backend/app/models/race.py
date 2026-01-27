"""
Race models (Pydantic schemas for API)
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class RavitoType(str, Enum):
    """Types of aid stations"""
    EAU = "eau"
    BOUFFE = "bouffe"
    ASSISTANCE = "assistance"


class RaceAidStationBase(BaseModel):
    """Base aid station data"""
    name: str
    distance_km: float
    elevation: Optional[int] = None
    type: RavitoType
    services: Optional[List[str]] = None
    cutoff_time: Optional[str] = None
    position_order: int


class RaceAidStationCreate(RaceAidStationBase):
    """Data for creating an aid station"""
    pass


class RaceAidStationResponse(RaceAidStationBase):
    """Aid station response with ID"""
    id: str

    class Config:
        from_attributes = True


class RaceBase(BaseModel):
    """Base race data"""
    name: str
    slug: str = Field(..., pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None
    is_published: bool = False


class RaceCreate(RaceBase):
    """Data for creating a race"""
    gpx_content: str
    aid_stations: List[RaceAidStationCreate] = []


class RaceUpdate(BaseModel):
    """Data for updating a race"""
    name: Optional[str] = None
    gpx_content: Optional[str] = None
    is_published: Optional[bool] = None
    aid_stations: Optional[List[RaceAidStationCreate]] = None


class RaceResponse(RaceBase):
    """Race response with full data"""
    id: str
    total_distance_km: Optional[float] = None
    total_elevation_gain: Optional[int] = None
    total_elevation_loss: Optional[int] = None
    start_location_lat: Optional[float] = None
    start_location_lon: Optional[float] = None
    is_published: bool
    aid_stations: List[RaceAidStationResponse] = []

    class Config:
        from_attributes = True


class RaceListResponse(BaseModel):
    """List of races (public view)"""
    id: str
    name: str
    slug: str
    total_distance_km: Optional[float] = None
    total_elevation_gain: Optional[int] = None
    is_published: bool

    class Config:
        from_attributes = True


class AdminLoginRequest(BaseModel):
    """Admin login request"""
    password: str


class AdminLoginResponse(BaseModel):
    """Admin login response"""
    success: bool
    token: Optional[str] = None
    message: Optional[str] = None
