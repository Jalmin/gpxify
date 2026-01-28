"""
PTP (Profile to Print) models for API
"""
from typing import List, Optional
from pydantic import BaseModel
from app.models.race import RavitoType


class ParsedRavito(BaseModel):
    """Ravito parsed from external table"""
    name: str
    distance_km: float
    elevation: Optional[int] = None
    type: Optional[RavitoType] = None
    services: Optional[List[str]] = None
    cutoff_time: Optional[str] = None


class ParsedRavitoTable(BaseModel):
    """Result of parsing external ravito table"""
    ravitos: List[ParsedRavito]
    race_name: Optional[str] = None
    total_distance: Optional[float] = None


class ParseRavitoTableRequest(BaseModel):
    """Request to parse ravito table with Claude"""
    raw_text: str


class ParseRavitoTableResponse(BaseModel):
    """Response from parsing ravito table"""
    success: bool
    data: Optional[ParsedRavitoTable] = None
    error: Optional[str] = None


class SunTimes(BaseModel):
    """Sunrise/sunset times for a specific date"""
    sunrise: str  # ISO datetime
    sunset: str
    civil_twilight_begin: str
    civil_twilight_end: str
    date: str


class GetSunTimesRequest(BaseModel):
    """Request for sun times"""
    lat: float
    lon: float
    dates: List[str]  # ISO date strings YYYY-MM-DD


class GetSunTimesResponse(BaseModel):
    """Response with sun times"""
    success: bool
    sun_times: List[SunTimes] = []
    error: Optional[str] = None
