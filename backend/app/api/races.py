"""
Public API endpoints for races
No authentication required - only published races are visible
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.race import RaceResponse, RaceListResponse
from app.services.race_service import RaceService

router = APIRouter()


@router.get("", response_model=List[RaceListResponse])
async def list_published_races(db: Session = Depends(get_db)):
    """
    List all published races

    Public endpoint - no authentication required
    """
    races = RaceService.get_all_races(db, published_only=True)
    return [RaceListResponse(
        id=str(r.id),
        name=r.name,
        slug=r.slug,
        total_distance_km=r.total_distance_km,
        total_elevation_gain=r.total_elevation_gain,
        is_published=r.is_published,
    ) for r in races]


@router.get("/{slug}", response_model=RaceResponse)
async def get_race_by_slug(slug: str, db: Session = Depends(get_db)):
    """
    Get a published race by its slug

    Public endpoint - returns 404 for unpublished races
    """
    race = RaceService.get_race_by_slug(db, slug)

    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    if not race.is_published:
        raise HTTPException(status_code=404, detail="Race not found")

    return RaceResponse(
        id=str(race.id),
        name=race.name,
        slug=race.slug,
        gpx_content=race.gpx_content,
        total_distance_km=race.total_distance_km,
        total_elevation_gain=race.total_elevation_gain,
        total_elevation_loss=race.total_elevation_loss,
        start_location_lat=race.start_location_lat,
        start_location_lon=race.start_location_lon,
        is_published=race.is_published,
        aid_stations=[{
            "id": str(s.id),
            "name": s.name,
            "distance_km": s.distance_km,
            "elevation": s.elevation,
            "type": s.type,
            "services": s.services,
            "cutoff_time": s.cutoff_time,
            "position_order": s.position_order,
        } for s in race.aid_stations]
    )
