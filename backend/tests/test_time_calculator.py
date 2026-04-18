"""
Unit tests for TimeCalculator service.

Covers the 3 calc modes (NAISMITH, CONSTANT_PACE, TRAIL_PLANNER),
fatigue model, edge cases, and fallback behavior.
"""
import pytest

from app.models.gpx import CalcMode, TrailPlannerConfig
from app.services.time_calculator import TimeCalculator


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    # Pure unit tests here — no DB needed. Override conftest's autouse
    # fixture that otherwise fails on SQLite (ARRAY column is PG-only).
    yield


# ---------------------------------------------------------------------------
# Regression — NAISMITH mode (unchanged behavior)
# ---------------------------------------------------------------------------

class TestNaismithRegression:
    """Ensure the Naismith mode keeps identical behavior after migration."""

    def test_flat_10km(self):
        # 10km flat at 12 km/h = 50min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.NAISMITH,
        )
        assert time == pytest.approx(50.0, rel=1e-3)

    def test_climb_500m(self):
        # 10km + 500m D+ => 50 + (500/100)*5 = 75min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=500,
            elevation_loss=0,
            avg_gradient=5,
            calc_mode=CalcMode.NAISMITH,
        )
        assert time == pytest.approx(75.0, rel=1e-3)

    def test_steep_descent_bonus(self):
        # Steep descent (<-12%): bonus applies
        # 10km + 0 D+ + 500 D- gradient -15% => 50 - (500/100)*5 = 25min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=500,
            avg_gradient=-15,
            calc_mode=CalcMode.NAISMITH,
        )
        assert time == pytest.approx(25.0, rel=1e-3)

    def test_moderate_descent_no_bonus(self):
        # Moderate descent (>-12%): no bonus
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=500,
            avg_gradient=-5,
            calc_mode=CalcMode.NAISMITH,
        )
        assert time == pytest.approx(50.0, rel=1e-3)

    def test_never_negative(self):
        # Extreme steep descent should clamp at 0 (never negative)
        time = TimeCalculator.estimate_segment_time(
            distance_km=1.0,
            elevation_gain=0,
            elevation_loss=5000,
            avg_gradient=-30,
            calc_mode=CalcMode.NAISMITH,
        )
        assert time == 0


# ---------------------------------------------------------------------------
# Regression — CONSTANT_PACE mode
# ---------------------------------------------------------------------------

class TestConstantPaceRegression:
    def test_10km_at_10kmh(self):
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=500,  # ignored in constant_pace mode
            elevation_loss=500,
            avg_gradient=-10,
            calc_mode=CalcMode.CONSTANT_PACE,
            constant_pace_kmh=10.0,
        )
        assert time == pytest.approx(60.0, rel=1e-3)

    def test_zero_pace_returns_zero(self):
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.CONSTANT_PACE,
            constant_pace_kmh=0,
        )
        assert time == 0


# ---------------------------------------------------------------------------
# TRAIL_PLANNER mode
# ---------------------------------------------------------------------------

@pytest.fixture
def tp_default():
    """Default Trail Planner config without fatigue."""
    return TrailPlannerConfig(
        flat_pace_kmh=10,
        climb_penalty_min_per_100m=6,
        descent_bonus_min_per_100m=3,
        fatigue_percent_per_interval=0,
        fatigue_interval_km=20,
    )


@pytest.fixture
def tp_with_fatigue():
    """Trail Planner config with linear fatigue +5% / 20km."""
    return TrailPlannerConfig(
        flat_pace_kmh=10,
        climb_penalty_min_per_100m=6,
        descent_bonus_min_per_100m=3,
        fatigue_percent_per_interval=5,
        fatigue_interval_km=20,
    )


class TestTrailPlanner:
    def test_baseline_flat(self, tp_default):
        # 10km @ 10 km/h plat = 60min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp_default,
        )
        assert time == pytest.approx(60.0, rel=1e-3)

    def test_climb(self, tp_default):
        # 10km + 500m D+ => 60 + 5*6 = 90min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=500,
            elevation_loss=0,
            avg_gradient=5,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp_default,
        )
        assert time == pytest.approx(90.0, rel=1e-3)

    def test_descent_bonus_always_applies(self, tp_default):
        # Unlike Naismith, trail_planner applies descent bonus on any descent
        # (not only steep). 10km + 500m D- => 60 - 5*3 = 45min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=500,
            avg_gradient=-5,  # moderate, not steep
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp_default,
        )
        assert time == pytest.approx(45.0, rel=1e-3)

    def test_fatigue_no_palier_below_interval(self, tp_with_fatigue):
        # cumul=15km, interval=20km => no fatigue step reached => multiplier = 1.0
        # 10km plat => 60min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp_with_fatigue,
            cumulative_distance_km=15,
        )
        assert time == pytest.approx(60.0, rel=1e-3)

    def test_fatigue_one_palier(self, tp_with_fatigue):
        # cumul=25km, interval=20km => floor(25/20) = 1 palier => +5% => *1.05
        # 10km plat => 60 * 1.05 = 63min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp_with_fatigue,
            cumulative_distance_km=25,
        )
        assert time == pytest.approx(63.0, rel=1e-3)

    def test_fatigue_two_paliers(self, tp_with_fatigue):
        # cumul=45km, interval=20km => floor(45/20) = 2 paliers => +10% => *1.10
        # 10km plat => 60 * 1.10 = 66min
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp_with_fatigue,
            cumulative_distance_km=45,
        )
        assert time == pytest.approx(66.0, rel=1e-3)

    def test_fatigue_zero_percent_disabled(self, tp_default):
        # fatigue_percent=0 => multiplier stays 1.0 no matter cumul
        time = TimeCalculator.estimate_segment_time(
            distance_km=10.0,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp_default,
            cumulative_distance_km=100,
        )
        assert time == pytest.approx(60.0, rel=1e-3)

    def test_zero_distance_returns_zero(self, tp_default):
        time = TimeCalculator.estimate_segment_time(
            distance_km=0,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp_default,
        )
        assert time == 0

    def test_extreme_descent_clamped_to_zero(self):
        # enormous descent bonus vs tiny distance => would be negative, clamp to 0
        tp = TrailPlannerConfig(
            flat_pace_kmh=10,
            climb_penalty_min_per_100m=6,
            descent_bonus_min_per_100m=20,  # huge
            fatigue_percent_per_interval=0,
            fatigue_interval_km=20,
        )
        time = TimeCalculator.estimate_segment_time(
            distance_km=1.0,
            elevation_gain=0,
            elevation_loss=5000,
            avg_gradient=-30,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=tp,
        )
        assert time == 0

    def test_missing_config_returns_none(self):
        # Defensive: if calc_mode=trail_planner but no config, return None
        # (service layer should have raised earlier; this is the defensive fallback)
        time = TimeCalculator.estimate_segment_time(
            distance_km=10,
            elevation_gain=0,
            elevation_loss=0,
            avg_gradient=0,
            calc_mode=CalcMode.TRAIL_PLANNER,
            trail_planner_config=None,
        )
        assert time is None

    def test_negative_cumulative_raises(self, tp_with_fatigue):
        # defensive: cumulative_km should never be negative
        with pytest.raises(ValueError, match="cumulative_distance_km"):
            TimeCalculator.estimate_segment_time(
                distance_km=10,
                elevation_gain=0,
                elevation_loss=0,
                avg_gradient=0,
                calc_mode=CalcMode.TRAIL_PLANNER,
                trail_planner_config=tp_with_fatigue,
                cumulative_distance_km=-1,
            )


# ---------------------------------------------------------------------------
# Pydantic validation on TrailPlannerConfig
# ---------------------------------------------------------------------------

class TestTrailPlannerConfigValidation:
    def test_flat_pace_must_be_positive(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            TrailPlannerConfig(
                flat_pace_kmh=0,
                climb_penalty_min_per_100m=6,
                descent_bonus_min_per_100m=3,
            )

    def test_flat_pace_max_30(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            TrailPlannerConfig(
                flat_pace_kmh=31,
                climb_penalty_min_per_100m=6,
                descent_bonus_min_per_100m=3,
            )

    def test_fatigue_interval_must_be_positive(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            TrailPlannerConfig(
                flat_pace_kmh=10,
                climb_penalty_min_per_100m=6,
                descent_bonus_min_per_100m=3,
                fatigue_interval_km=0,
            )

    def test_defaults(self):
        cfg = TrailPlannerConfig(
            flat_pace_kmh=10,
            climb_penalty_min_per_100m=6,
            descent_bonus_min_per_100m=3,
        )
        assert cfg.fatigue_percent_per_interval == 0
        assert cfg.fatigue_interval_km == 20


# ---------------------------------------------------------------------------
# Legacy helper: format_time (unchanged)
# ---------------------------------------------------------------------------

class TestFormatTime:
    def test_minutes_only(self):
        assert TimeCalculator.format_time(45) == "45min"

    def test_hours_and_minutes(self):
        assert TimeCalculator.format_time(90) == "1h 30min"

    def test_exact_hour(self):
        assert TimeCalculator.format_time(120) == "2h 00min"
