"""
Race service
Handles CRUD operations for races and aid stations
"""
from typing import List, Optional
from uuid import UUID
import logging
import re
from sqlalchemy.orm import Session

from app.db.models import Race, RaceAidStation
from app.models.race import RaceCreate, RaceUpdate, RaceAidStationCreate
from app.services.gpx_parser import GPXParser

logger = logging.getLogger(__name__)


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
        gpx_data = GPXParser.parse_gpx_content(race_data.gpx_content)

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

        # Create aid stations
        for i, station_data in enumerate(race_data.aid_stations):
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
            gpx_data = GPXParser.parse_gpx_content(update_data.gpx_content)
            if gpx_data.tracks:
                track = gpx_data.tracks[0]
                stats = track.statistics
                race.total_distance_km = stats.total_distance / 1000
                race.total_elevation_gain = int(stats.total_elevation_gain)
                race.total_elevation_loss = int(stats.total_elevation_loss)
                if track.points:
                    race.start_location_lat = track.points[0].lat
                    race.start_location_lon = track.points[0].lon

        # Update aid stations if provided
        if update_data.aid_stations is not None:
            # Delete existing aid stations
            db.query(RaceAidStation).filter(RaceAidStation.race_id == race_id).delete()

            # Create new aid stations
            for i, station_data in enumerate(update_data.aid_stations):
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
