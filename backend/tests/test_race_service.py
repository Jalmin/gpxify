"""
Unit tests for RaceService and its module-level helpers.

Uses the SQLite ``db_session`` fixture (tables created/dropped per test
by the autouse ``setup_database`` fixture in conftest).
"""
import uuid

import pytest

from app.db.models import RaceAidStation
from app.models.race import (
    RaceCreate,
    RaceUpdate,
    RaceAidStationCreate,
    RavitoType,
)
from app.services.race_service import (
    RaceService,
    haversine_distance,
    extract_waypoints_from_gpx,
    waypoint_to_aid_station,
)


SIMPLE_GPX = """<?xml version="1.0"?>
<gpx version="1.1" creator="t">
  <trk><name>R</name><trkseg>
    <trkpt lat="45.0" lon="6.0"><ele>1000</ele></trkpt>
    <trkpt lat="45.01" lon="6.01"><ele>1100</ele></trkpt>
    <trkpt lat="45.02" lon="6.02"><ele>1050</ele></trkpt>
  </trkseg></trk>
</gpx>"""

EMPTY_GPX = '<?xml version="1.0"?><gpx version="1.1" creator="t"></gpx>'


# --------------------------------------------------------------------------
# Module-level helpers
# --------------------------------------------------------------------------
class TestHelpers:
    def test_haversine_distance_known_value(self):
        # ~157m between these two close points
        d = haversine_distance(45.0, 6.0, 45.001, 6.001)
        assert d == pytest.approx(131, abs=20)

    def test_haversine_zero(self):
        assert haversine_distance(45.0, 6.0, 45.0, 6.0) == pytest.approx(0.0)

    def test_extract_waypoints_none_when_no_waypoints(self):
        assert extract_waypoints_from_gpx(SIMPLE_GPX) == []

    def test_extract_waypoints(self, sample_gpx_with_waypoints):
        wpts = extract_waypoints_from_gpx(sample_gpx_with_waypoints)
        assert len(wpts) == 2
        names = {w["short_name"] for w in wpts}
        assert "AS1" in names
        as1 = next(w for w in wpts if w["short_name"] == "AS1")
        assert as1["distance_km"] >= 0
        assert as1["elevation"] == 1100

    def test_waypoint_to_aid_station_type_by_symbol(self):
        water = waypoint_to_aid_station(
            {"name": "W", "distance_km": 1.0, "sym": "Drinking Water", "elevation": 100}, 0
        )
        assert water.type == RavitoType.EAU

        food = waypoint_to_aid_station(
            {"name": "F", "distance_km": 2.0, "sym": "Restaurant"}, 1
        )
        assert food.type == RavitoType.BOUFFE

        other = waypoint_to_aid_station(
            {"name": "O", "distance_km": 3.0, "sym": "Flag"}, 2
        )
        assert other.type == RavitoType.ASSISTANCE


class TestGenerateSlug:
    def test_lowercases_and_dashes(self):
        assert RaceService.generate_slug("UTMB 2024") == "utmb-2024"

    def test_strips_special_chars(self):
        assert RaceService.generate_slug("CCC! (Trail)") == "ccc-trail"

    def test_collapses_multiple_whitespace(self):
        assert RaceService.generate_slug("A   B C") == "a-b-c"

    def test_underscores_are_stripped(self):
        # '_' is removed by the special-char pass before separators collapse
        assert RaceService.generate_slug("A B__C") == "a-bc"

    def test_trims_leading_trailing_dashes(self):
        assert RaceService.generate_slug("--Hello--") == "hello"


# --------------------------------------------------------------------------
# CRUD
# --------------------------------------------------------------------------
class TestRaceCrud:
    def test_create_race_with_explicit_aid_stations(self, db_session):
        race_data = RaceCreate(
            name="Test Race",
            slug="test-race",
            gpx_content=SIMPLE_GPX,
            aid_stations=[
                RaceAidStationCreate(
                    name="AS1", distance_km=1.0, type=RavitoType.EAU, position_order=0
                )
            ],
        )
        race = RaceService.create_race(db_session, race_data)

        assert race.slug == "test-race"
        assert race.total_distance_km > 0
        assert len(race.aid_stations) == 1
        assert race.is_published is False

    def test_create_race_extracts_waypoints(self, db_session, sample_gpx_with_waypoints):
        race_data = RaceCreate(
            name="WPT Race",
            slug="wpt-race",
            gpx_content=sample_gpx_with_waypoints,
            aid_stations=[],
        )
        race = RaceService.create_race(db_session, race_data)

        # AS1 waypoint should be picked up as an aid station
        assert len(race.aid_stations) == 1
        assert race.aid_stations[0].name

    def test_create_race_no_tracks_raises(self, db_session):
        race_data = RaceCreate(
            name="Empty", slug="empty", gpx_content=EMPTY_GPX, aid_stations=[]
        )
        with pytest.raises(ValueError, match="no tracks"):
            RaceService.create_race(db_session, race_data)

    def test_get_by_id_and_slug(self, db_session):
        race = RaceService.create_race(
            db_session,
            RaceCreate(name="R", slug="r-slug", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        assert RaceService.get_race_by_id(db_session, race.id).slug == "r-slug"
        assert RaceService.get_race_by_slug(db_session, "r-slug").id == race.id

    def test_get_by_id_missing_returns_none(self, db_session):
        assert RaceService.get_race_by_id(db_session, uuid.uuid4()) is None

    def test_get_all_races_published_filter(self, db_session):
        RaceService.create_race(
            db_session,
            RaceCreate(name="A", slug="a", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        pub = RaceService.create_race(
            db_session,
            RaceCreate(name="B", slug="b", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        RaceService.update_race(db_session, pub.id, RaceUpdate(is_published=True))

        assert len(RaceService.get_all_races(db_session)) == 2
        published = RaceService.get_all_races(db_session, published_only=True)
        assert len(published) == 1
        assert published[0].slug == "b"

    def test_update_race_missing_returns_none(self, db_session):
        assert RaceService.update_race(db_session, uuid.uuid4(), RaceUpdate(name="x")) is None

    def test_update_race_name_and_publish(self, db_session):
        race = RaceService.create_race(
            db_session,
            RaceCreate(name="Old", slug="old", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        updated = RaceService.update_race(
            db_session, race.id, RaceUpdate(name="New", is_published=True)
        )
        assert updated.name == "New"
        assert updated.is_published is True

    def test_update_race_gpx_reparses_stats(self, db_session):
        race = RaceService.create_race(
            db_session,
            RaceCreate(name="G", slug="g", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        updated = RaceService.update_race(
            db_session, race.id, RaceUpdate(gpx_content=SIMPLE_GPX)
        )
        assert updated.total_distance_km > 0

    def test_update_race_extracts_waypoints_when_no_stations(
        self, db_session, sample_gpx_with_waypoints
    ):
        race = RaceService.create_race(
            db_session,
            RaceCreate(name="G2", slug="g2", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        updated = RaceService.update_race(
            db_session, race.id, RaceUpdate(gpx_content=sample_gpx_with_waypoints)
        )
        assert len(updated.aid_stations) == 1

    def test_update_race_replaces_aid_stations(self, db_session):
        race = RaceService.create_race(
            db_session,
            RaceCreate(
                name="G3",
                slug="g3",
                gpx_content=SIMPLE_GPX,
                aid_stations=[
                    RaceAidStationCreate(
                        name="Old AS", distance_km=1.0, type=RavitoType.EAU, position_order=0
                    )
                ],
            ),
        )
        updated = RaceService.update_race(
            db_session,
            race.id,
            RaceUpdate(
                aid_stations=[
                    RaceAidStationCreate(
                        name="New AS", distance_km=2.0, type=RavitoType.BOUFFE, position_order=0
                    ),
                    RaceAidStationCreate(
                        name="New AS2", distance_km=3.0, type=RavitoType.ASSISTANCE, position_order=1
                    ),
                ]
            ),
        )
        names = {s.name for s in updated.aid_stations}
        assert names == {"New AS", "New AS2"}

    def test_delete_race(self, db_session):
        race = RaceService.create_race(
            db_session,
            RaceCreate(name="D", slug="d", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        assert RaceService.delete_race(db_session, race.id) is True
        assert RaceService.get_race_by_id(db_session, race.id) is None

    def test_delete_race_missing_returns_false(self, db_session):
        assert RaceService.delete_race(db_session, uuid.uuid4()) is False


class TestAidStationOps:
    def test_add_aid_station(self, db_session):
        race = RaceService.create_race(
            db_session,
            RaceCreate(name="AS", slug="as-race", gpx_content=SIMPLE_GPX, aid_stations=[]),
        )
        station = RaceService.add_aid_station(
            db_session,
            race.id,
            RaceAidStationCreate(
                name="Ravito", distance_km=5.0, type=RavitoType.BOUFFE, position_order=0
            ),
        )
        assert station is not None
        assert station.name == "Ravito"

    def test_add_aid_station_missing_race(self, db_session):
        result = RaceService.add_aid_station(
            db_session,
            uuid.uuid4(),
            RaceAidStationCreate(
                name="X", distance_km=1.0, type=RavitoType.EAU, position_order=0
            ),
        )
        assert result is None

    def test_delete_aid_station(self, db_session):
        race = RaceService.create_race(
            db_session,
            RaceCreate(
                name="DAS",
                slug="das",
                gpx_content=SIMPLE_GPX,
                aid_stations=[
                    RaceAidStationCreate(
                        name="AS", distance_km=1.0, type=RavitoType.EAU, position_order=0
                    )
                ],
            ),
        )
        station = db_session.query(RaceAidStation).filter(
            RaceAidStation.race_id == race.id
        ).first()

        assert RaceService.delete_aid_station(db_session, station.id) is True
        assert RaceService.delete_aid_station(db_session, uuid.uuid4()) is False
