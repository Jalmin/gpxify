import { describe, it, expect } from 'vitest';
import {
  migrateAidStationTableState,
  DEFAULT_AID_STATION_TABLE_STATE,
} from '@/store/useAppStore';

describe('migrateAidStationTableState', () => {
  it('returns defaults when input is empty or null', () => {
    expect(migrateAidStationTableState(null)).toEqual(
      DEFAULT_AID_STATION_TABLE_STATE,
    );
    expect(migrateAidStationTableState(undefined)).toEqual(
      DEFAULT_AID_STATION_TABLE_STATE,
    );
    expect(migrateAidStationTableState({})).toEqual(
      DEFAULT_AID_STATION_TABLE_STATE,
    );
  });

  it('migrates v1 useNaismith=true to calcMode=naismith', () => {
    const migrated = migrateAidStationTableState({
      aidStations: [{ name: 'Start', distance_km: 0 }],
      useNaismith: true,
      customPace: '12',
      tableResult: null,
    });

    expect(migrated.calcMode).toBe('naismith');
    expect(migrated.constantPaceKmh).toBeNull();
    expect(migrated.trailPlannerConfig).toBeNull();
    expect(migrated.aidStations).toEqual([{ name: 'Start', distance_km: 0 }]);
  });

  it('migrates v1 useNaismith=false + customPace=10 to constant_pace / 10 km/h', () => {
    const migrated = migrateAidStationTableState({
      aidStations: [],
      useNaismith: false,
      customPace: '10',
      tableResult: null,
    });

    expect(migrated.calcMode).toBe('constant_pace');
    expect(migrated.constantPaceKmh).toBe(10);
    expect(migrated.trailPlannerConfig).toBeNull();
  });

  it('falls back to naismith when useNaismith field is missing', () => {
    const migrated = migrateAidStationTableState({
      aidStations: [],
    });
    expect(migrated.calcMode).toBe('naismith');
  });

  it('keeps constantPaceKmh=null when legacy customPace is invalid', () => {
    const migrated = migrateAidStationTableState({
      useNaismith: false,
      customPace: 'abc',
    });
    expect(migrated.calcMode).toBe('constant_pace');
    expect(migrated.constantPaceKmh).toBeNull();
  });

  it('passes through already-migrated (v2) state', () => {
    const v2 = {
      aidStations: [{ name: 'A', distance_km: 5 }],
      calcMode: 'trail_planner' as const,
      constantPaceKmh: null,
      trailPlannerConfig: {
        flat_pace_kmh: 10,
        climb_penalty_min_per_100m: 6,
        descent_bonus_min_per_100m: 3,
        fatigue_percent_per_interval: 5,
        fatigue_interval_km: 20,
      },
      tableResult: null,
    };
    const migrated = migrateAidStationTableState(v2);
    expect(migrated.calcMode).toBe('trail_planner');
    expect(migrated.trailPlannerConfig).toEqual(v2.trailPlannerConfig);
    expect(migrated.aidStations).toEqual(v2.aidStations);
  });
});
