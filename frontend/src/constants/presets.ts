import type { TrailPlannerConfig } from '@/types/gpx';

export const TRAIL_PLANNER_PRESETS: Record<string, TrailPlannerConfig> = {
  'trail-moyen': {
    flat_pace_kmh: 10,
    climb_penalty_min_per_100m: 6,
    descent_bonus_min_per_100m: 3,
    fatigue_percent_per_interval: 5,
    fatigue_interval_km: 20,
  },
};

export const DEFAULT_TRAIL_PLANNER_PRESET_ID = 'trail-moyen';

export const DEFAULT_TRAIL_PLANNER_CONFIG: TrailPlannerConfig =
  TRAIL_PLANNER_PRESETS[DEFAULT_TRAIL_PLANNER_PRESET_ID];

export const TRAIL_PLANNER_LIMITS = {
  flat_pace_kmh: { min: 1, max: 30 },
  climb_penalty_min_per_100m: { min: 0, max: 30 },
  descent_bonus_min_per_100m: { min: 0, max: 20 },
  fatigue_percent_per_interval: { min: 0, max: 50 },
  fatigue_interval_km: { min: 0.1, max: 100 },
} as const;
