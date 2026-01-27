"""
Admin API endpoints for PTP (Profile to Print) feature
Protected by secret URL + password authentication
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
import secrets
import hashlib
import logging

from app.db.database import get_db
from app.models.race import (
    RaceCreate,
    RaceUpdate,
    RaceResponse,
    RaceListResponse,
    AdminLoginRequest,
    AdminLoginResponse,
)
from app.models.ptp import (
    ParseRavitoTableRequest,
    ParseRavitoTableResponse,
)
from app.services.race_service import RaceService
from app.services.ptp_service import PTPService
from app.core.config import settings
from app.middleware.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


def hash_password(password: str) -> str:
    """Hash password with SHA256 (simple approach for single admin)"""
    return hashlib.sha256(password.encode()).hexdigest()


def get_setting_from_db(db: Session, key: str) -> Optional[str]:
    """Get a setting value from admin_settings table"""
    from sqlalchemy import text
    result = db.execute(text("SELECT value FROM admin_settings WHERE key = :key"), {"key": key})
    row = result.fetchone()
    return row[0] if row else None


def set_setting_in_db(db: Session, key: str, value: str) -> None:
    """Set a setting value in admin_settings table"""
    from sqlalchemy import text
    # Delete existing
    db.execute(text("DELETE FROM admin_settings WHERE key = :key"), {"key": key})
    # Insert new
    db.execute(text("INSERT INTO admin_settings (key, value) VALUES (:key, :value)"), {"key": key, "value": value})
    db.commit()


def verify_admin_token_with_db(db: Session, token: str) -> bool:
    """Verify admin token against database"""
    stored_token = get_setting_from_db(db, "admin_session_token")
    return stored_token == token


def verify_admin_token(
    x_admin_token: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> bool:
    """Verify admin token from header against database"""
    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Admin token required")

    if not verify_admin_token_with_db(db, x_admin_token):
        raise HTTPException(status_code=403, detail="Invalid or expired token")

    return True


@router.post("/login", response_model=AdminLoginResponse)
@limiter.limit("5/minute")  # Prevent brute force
async def admin_login(request: Request, body: AdminLoginRequest, db: Session = Depends(get_db)):
    """
    Admin login with password

    Returns a session token if password is correct
    """
    # Get stored password hash from config, then fallback to database
    stored_hash = settings.ADMIN_PASSWORD_HASH

    # Fallback: try to get from database if not in env
    if not stored_hash:
        stored_hash = get_setting_from_db(db, "admin_password_hash")
        if stored_hash:
            logger.info("Using admin password hash from database")

    # If no password configured, use a default for development
    if not stored_hash:
        # Default password for dev: "admin123" (change in production!)
        stored_hash = hash_password("admin123")
        logger.warning("Using default admin password - change ADMIN_PASSWORD_HASH in production!")

    # Verify password
    if hash_password(body.password) != stored_hash:
        logger.warning(f"Failed admin login attempt from {request.client.host}")
        return AdminLoginResponse(
            success=False,
            message="Invalid password"
        )

    # Generate session token and store in database (works across workers)
    token = secrets.token_urlsafe(32)
    set_setting_in_db(db, "admin_session_token", token)

    logger.info(f"Admin login successful from {request.client.host}")

    return AdminLoginResponse(
        success=True,
        token=token
    )


@router.post("/logout")
async def admin_logout(x_admin_token: str = Header(...), db: Session = Depends(get_db)):
    """Logout and invalidate session token"""
    from sqlalchemy import text
    db.execute(text("DELETE FROM admin_settings WHERE key = 'admin_session_token'"))
    db.commit()
    return {"success": True}


# ============== RACE CRUD ==============

@router.get("/races", response_model=List[RaceListResponse])
async def list_all_races(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """List all races (including unpublished)"""
    races = RaceService.get_all_races(db, published_only=False)
    return [RaceListResponse(
        id=str(r.id),
        name=r.name,
        slug=r.slug,
        total_distance_km=r.total_distance_km,
        total_elevation_gain=r.total_elevation_gain,
        is_published=r.is_published,
        aid_stations=[{
            "id": str(s.id),
            "name": s.name,
            "distance_km": s.distance_km,
            "elevation": s.elevation,
            "type": s.type,
            "services": s.services,
            "cutoff_time": s.cutoff_time,
            "position_order": s.position_order,
        } for s in r.aid_stations]
    ) for r in races]


@router.post("/races", response_model=RaceResponse)
@limiter.limit("10/minute")
async def create_race(
    request: Request,
    body: RaceCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Create a new race"""
    # Check if slug already exists
    existing = RaceService.get_race_by_slug(db, body.slug)
    if existing:
        raise HTTPException(status_code=400, detail=f"Race with slug '{body.slug}' already exists")

    try:
        race = RaceService.create_race(db, body)
        return RaceResponse(
            id=str(race.id),
            name=race.name,
            slug=race.slug,
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/races/{race_id}", response_model=RaceResponse)
async def get_race(
    race_id: UUID,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Get a race by ID"""
    race = RaceService.get_race_by_id(db, race_id)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    return RaceResponse(
        id=str(race.id),
        name=race.name,
        slug=race.slug,
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


@router.put("/races/{race_id}", response_model=RaceResponse)
@limiter.limit("20/minute")
async def update_race(
    request: Request,
    race_id: UUID,
    body: RaceUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Update a race"""
    race = RaceService.update_race(db, race_id, body)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    return RaceResponse(
        id=str(race.id),
        name=race.name,
        slug=race.slug,
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


@router.delete("/races/{race_id}")
async def delete_race(
    race_id: UUID,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Delete a race"""
    success = RaceService.delete_race(db, race_id)
    if not success:
        raise HTTPException(status_code=404, detail="Race not found")

    return {"success": True, "message": "Race deleted"}


# ============== RAVITO TABLE PARSING ==============

@router.post("/parse-ravito-table", response_model=ParseRavitoTableResponse)
@limiter.limit("10/minute")
async def parse_ravito_table(
    request: Request,
    body: ParseRavitoTableRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """
    Parse a raw ravito table text using Claude API

    Returns structured ravito data that can be used to create aid stations
    """
    # Get API key from env or database
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        api_key = get_setting_from_db(db, "anthropic_api_key")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Anthropic API key not configured"
        )

    try:
        parsed = await PTPService.parse_ravito_table_with_claude(
            raw_text=body.raw_text,
            anthropic_api_key=api_key
        )

        return ParseRavitoTableResponse(success=True, data=parsed)

    except ValueError as e:
        return ParseRavitoTableResponse(success=False, error=str(e))

    except Exception as e:
        logger.error(f"Error parsing ravito table: {e}")
        return ParseRavitoTableResponse(
            success=False,
            error="An error occurred while parsing the table"
        )
