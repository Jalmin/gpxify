"""
Race service
Handles CRUD operations for races and aid stations
"""
from typing import List, Optional, Tuple
from uuid import UUID
import logging
import re
import math
import gpxpy
from sqlalchemy.orm import Session

from app.db.models import Race, RaceAidStation
from app.models.race import RaceCreate, RaceUpdate, RaceAidStationCreate, RavitoType
from app.services.gpx_parser import GPXParser

logger = logging.getLogger(__name__)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters using Haversine formula"""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c


def extract_waypoints_from_gpx(gpx_content: str) -> List[dict]:
    """
    Extract waypoints from GPX content and calculate their distance along the track.

    Returns list of dicts with: name, lat, lon, sym, desc, distance_km, elevation
    """
    gpx = gpxpy.parse(gpx_content)

    if not gpx.waypoints:
        return []

    # Build track points list for distance calculation
    track_points = []
    cumulative_distances = []
    cumulative_distance = 0.0

    for track in gpx.tracks:
        for segment in track.segments:
            for i, point in enumerate(segment.points):
                track_points.append((point.latitude, point.longitude, point.elevation))
                if i > 0:
                    prev = segment.points[i-1]
                    cumulative_distance += haversine_distance(
                        prev.latitude, prev.longitude,
                        point.latitude, point.longitude
                    )
                cumulative_distances.append(cumulative_distance)

    if not track_points:
        return []

    waypoints = []
    for wpt in gpx.waypoints:
        # Skip non-aid station waypoints (like "Start", "Finish" without AS prefix)
        name = wpt.name or wpt.description or ""

        # Find closest track point to calculate distance
        min_dist = float('inf')
        closest_idx = 0
        for i, (lat, lon, ele) in enumerate(track_points):
            dist = haversine_distance(wpt.latitude, wpt.longitude, lat, lon)
            if dist < min_dist:
                min_dist = dist
                closest_idx = i

        # Get distance along track and elevation
        distance_km = cumulative_distances[closest_idx] / 1000 if cumulative_distances else 0
        elevation = track_points[closest_idx][2] if track_points[closest_idx][2] else None

        waypoints.append({
            'name': wpt.description or wpt.name or "Unknown",
            'short_name': wpt.name or "",
            'lat': wpt.latitude,
            'lon': wpt.longitude,
            'sym': wpt.symbol or "",
            'distance_km': round(distance_km, 2),
            'elevation': int(elevation) if elevation else None,
        })

    # Sort by distance along track
    waypoints.sort(key=lambda w: w['distance_km'])

    return waypoints


def waypoint_to_aid_station(wpt: dict, position_order: int) -> RaceAidStationCreate:
    """Convert a waypoint dict to RaceAidStationCreate"""
    # Determine type based on symbol
    sym = wpt.get('sym', '').lower()
    if 'drinking water' in sym or 'water' in sym:
        ravito_type = RavitoType.EAU
    elif 'restaurant' in sym or 'food' in sym:
        ravito_type = RavitoType.BOUFFE
    else:
        ravito_type = RavitoType.ASSISTANCE

    return RaceAidStationCreate(
        name=wpt['name'],
        distance_km=wpt['distance_km'],
        elevation=wpt.get('elevation'),
        type=ravito_type,
        services=None,
        cutoff_time=None,
        position_order=position_order,
    )


class RaceService:
    """Service for race CRUD operations"""

    @staticmethod
    def generate_slug(name: str) -> str:
        """Generate a URL-friendly slug from race name"""
        slug = name.lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s_]+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        return slug.strip('-')

    @staticmethod
    def create_race(db: Session, race_data: RaceCreate) -> Race:
        """
        Create a new race with GPX data and aid stations

        Args:
            db: Database session
            race_data: Race creation data including GPX content

        Returns:
            Created Race object
        """
        # Parse GPX to extract statistics
        gpx_data = GPXParser.parse_gpx_file(race_data.gpx_content, race_data.name)

        if not gpx_data.tracks:
            raise ValueError("GPX file contains no tracks")

        track = gpx_data.tracks[0]
        stats = track.statistics

        # Get start location from first point
        start_lat = None
        start_lon = None
        if track.points:
            start_lat = track.points[0].lat
            start_lon = track.points[0].lon

        # Create race
        race = Race(
            name=race_data.name,
            slug=race_data.slug,
            gpx_content=race_data.gpx_content,
            total_distance_km=stats.total_distance / 1000,
            total_elevation_gain=int(stats.total_elevation_gain),
            total_elevation_loss=int(stats.total_elevation_loss),
            start_location_lat=start_lat,
            start_location_lon=start_lon,
            is_published=False,
        )

        db.add(race)
        db.flush()  # Get the race ID

        # Create aid stations - use provided or extract from GPX waypoints
        aid_stations_to_create = race_data.aid_stations

        if not aid_stations_to_create:
            # Try to extract waypoints from GPX
            waypoints = extract_waypoints_from_gpx(race_data.gpx_content)
            # Filter to only AS (aid station) waypoints
            as_waypoints = [w for w in waypoints if w['short_name'].upper().startswith('AS')]
            if as_waypoints:
                aid_stations_to_create = [
                    waypoint_to_aid_station(w, i) for i, w in enumerate(as_waypoints)
                ]
                logger.info(f"Extracted {len(aid_stations_to_create)} aid stations from GPX waypoints")

        for i, station_data in enumerate(aid_stations_to_create or []):
            station = RaceAidStation(
                race_id=race.id,
                name=station_data.name,
                distance_km=station_data.distance_km,
                elevation=station_data.elevation,
                type=station_data.type.value,
                services=station_data.services,
                cutoff_time=station_data.cutoff_time,
                position_order=station_data.position_order or i,
            )
            db.add(station)

        db.commit()
        db.refresh(race)

        logger.info(f"Created race: {race.name} ({race.slug})")
        return race

    @staticmethod
    def get_race_by_id(db: Session, race_id: UUID) -> Optional[Race]:
        """Get a race by ID"""
        return db.query(Race).filter(Race.id == race_id).first()

    @staticmethod
    def get_race_by_slug(db: Session, slug: str) -> Optional[Race]:
        """Get a race by slug"""
        return db.query(Race).filter(Race.slug == slug).first()

    @staticmethod
    def get_all_races(db: Session, published_only: bool = False) -> List[Race]:
        """Get all races, optionally filtered by published status"""
        query = db.query(Race)
        if published_only:
            query = query.filter(Race.is_published == True)
        return query.order_by(Race.name).all()

    @staticmethod
    def update_race(db: Session, race_id: UUID, update_data: RaceUpdate) -> Optional[Race]:
        """
        Update a race

        Args:
            db: Database session
            race_id: Race ID to update
            update_data: Fields to update

        Returns:
            Updated Race or None if not found
        """
        race = db.query(Race).filter(Race.id == race_id).first()
        if not race:
            return None

        # Update basic fields
        if update_data.name is not None:
            race.name = update_data.name

        if update_data.is_published is not None:
            race.is_published = update_data.is_published

        # Update GPX content if provided
        if update_data.gpx_content is not None:
            race.gpx_content = update_data.gpx_content
            # Re-parse GPX for statistics
            gpx_data = GPXParser.parse_gpx_file(update_data.gpx_content, race.name)
            if gpx_data.tracks:
                track = gpx_data.tracks[0]
                stats = track.statistics
                race.total_distance_km = stats.total_distance / 1000
                race.total_elevation_gain = int(stats.total_elevation_gain)
                race.total_elevation_loss = int(stats.total_elevation_loss)
                if track.points:
                    race.start_location_lat = track.points[0].lat
                    race.start_location_lon = track.points[0].lon

        # Update aid stations if provided OR if GPX was updated and race has no stations
        aid_stations_to_create = update_data.aid_stations

        # If GPX was updated and no aid stations provided, try to extract from waypoints
        if update_data.gpx_content is not None and aid_stations_to_create is None:
            existing_count = db.query(RaceAidStation).filter(RaceAidStation.race_id == race_id).count()
            if existing_count == 0:
                waypoints = extract_waypoints_from_gpx(update_data.gpx_content)
                as_waypoints = [w for w in waypoints if w['short_name'].upper().startswith('AS')]
                if as_waypoints:
                    aid_stations_to_create = [
                        waypoint_to_aid_station(w, i) for i, w in enumerate(as_waypoints)
                    ]
                    logger.info(f"Extracted {len(aid_stations_to_create)} aid stations from GPX waypoints")

        if aid_stations_to_create is not None:
            # Delete existing aid stations
            db.query(RaceAidStation).filter(RaceAidStation.race_id == race_id).delete()

            # Create new aid stations
            for i, station_data in enumerate(aid_stations_to_create):
                station = RaceAidStation(
                    race_id=race.id,
                    name=station_data.name,
                    distance_km=station_data.distance_km,
                    elevation=station_data.elevation,
                    type=station_data.type.value,
                    services=station_data.services,
                    cutoff_time=station_data.cutoff_time,
                    position_order=station_data.position_order or i,
                )
                db.add(station)

        db.commit()
        db.refresh(race)

        logger.info(f"Updated race: {race.name}")
        return race

    @staticmethod
    def delete_race(db: Session, race_id: UUID) -> bool:
        """
        Delete a race

        Args:
            db: Database session
            race_id: Race ID to delete

        Returns:
            True if deleted, False if not found
        """
        race = db.query(Race).filter(Race.id == race_id).first()
        if not race:
            return False

        db.delete(race)
        db.commit()

        logger.info(f"Deleted race: {race.name}")
        return True

    @staticmethod
    def add_aid_station(
        db: Session,
        race_id: UUID,
        station_data: RaceAidStationCreate
    ) -> Optional[RaceAidStation]:
        """Add an aid station to a race"""
        race = db.query(Race).filter(Race.id == race_id).first()
        if not race:
            return None

        # Get next position order
        max_order = db.query(RaceAidStation).filter(
            RaceAidStation.race_id == race_id
        ).count()

        station = RaceAidStation(
            race_id=race_id,
            name=station_data.name,
            distance_km=station_data.distance_km,
            elevation=station_data.elevation,
            type=station_data.type.value,
            services=station_data.services,
            cutoff_time=station_data.cutoff_time,
            position_order=station_data.position_order or max_order,
        )

        db.add(station)
        db.commit()
        db.refresh(station)

        return station

    @staticmethod
    def delete_aid_station(db: Session, station_id: UUID) -> bool:
        """Delete an aid station"""
        station = db.query(RaceAidStation).filter(RaceAidStation.id == station_id).first()
        if not station:
            return False

        db.delete(station)
        db.commit()
        return True
