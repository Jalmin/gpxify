/**
 * Zustand store for global app state management
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Track,
  AidStationTableResponse,
  CalcMode,
  TrailPlannerConfig,
} from '../types/gpx';

export interface GPXFileData {
  id: string;
  filename: string;
  tracks: Track[];
}

export interface AidStation {
  name: string;
  distance_km: number;
}

export interface AidStationTableState {
  aidStations: AidStation[];
  calcMode: CalcMode;
  constantPaceKmh: number | null;
  trailPlannerConfig: TrailPlannerConfig | null;
  tableResult: AidStationTableResponse | null;
}

export const DEFAULT_AID_STATION_TABLE_STATE: AidStationTableState = {
  aidStations: [],
  calcMode: 'naismith',
  constantPaceKmh: null,
  trailPlannerConfig: null,
  tableResult: null,
};

interface AppState {
  // GPX Files
  files: GPXFileData[];
  selectedFileId: string | null;

  // Aid Stations
  aidStations: AidStation[];

  // Aid Station Table State
  aidStationTable: AidStationTableState;

  // UI State
  activeTab: 'analyze' | 'merge' | 'aid-stations' | 'race-recovery';

  // Actions
  addFile: (file: GPXFileData) => void;
  removeFile: (fileId: string) => void;
  selectFile: (fileId: string | null) => void;
  clearFiles: () => void;

  setAidStations: (stations: AidStation[]) => void;
  addAidStation: (station: AidStation) => void;
  removeAidStation: (index: number) => void;
  updateAidStation: (index: number, station: AidStation) => void;
  clearAidStations: () => void;

  setAidStationTable: (state: Partial<AidStationTableState>) => void;

  setActiveTab: (tab: 'analyze' | 'merge' | 'aid-stations' | 'race-recovery') => void;
}

export const AID_STATION_TABLE_STATE_VERSION = 2;

/**
 * Migrate persisted state from the pre-calcMode schema (v1 or unversioned)
 * to v2. Idempotent and safe when called with unknown shapes.
 *
 * v1 shape: { useNaismith: boolean, customPace: string, ... }
 * v2 shape: { calcMode, constantPaceKmh, trailPlannerConfig, ... }
 */
export function migrateAidStationTableState(
  raw: unknown,
): AidStationTableState {
  const obj = (raw ?? {}) as Record<string, unknown>;

  // Already migrated (v2) — trust and pass through with defaults for missing keys.
  if (typeof obj.calcMode === 'string') {
    return {
      ...DEFAULT_AID_STATION_TABLE_STATE,
      ...(obj as Partial<AidStationTableState>),
    };
  }

  // v1 / unversioned — derive new shape from legacy fields.
  const useNaismith = obj.useNaismith;
  const customPaceRaw = obj.customPace;
  const parsedPace =
    typeof customPaceRaw === 'string'
      ? parseFloat(customPaceRaw)
      : typeof customPaceRaw === 'number'
        ? customPaceRaw
        : NaN;

  const wasConstantPace = useNaismith === false;

  return {
    aidStations: Array.isArray(obj.aidStations)
      ? (obj.aidStations as AidStation[])
      : [],
    calcMode: wasConstantPace ? 'constant_pace' : 'naismith',
    constantPaceKmh:
      wasConstantPace && Number.isFinite(parsedPace) ? parsedPace : null,
    trailPlannerConfig: null,
    tableResult: (obj.tableResult as AidStationTableResponse) ?? null,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      files: [],
      selectedFileId: null,
      aidStations: [],
      aidStationTable: DEFAULT_AID_STATION_TABLE_STATE,
      activeTab: 'analyze',

      // File actions
      addFile: (file) =>
        set((state) => ({
          files: [...state.files, file],
          selectedFileId: file.id,
        })),

      removeFile: (fileId) =>
        set((state) => ({
          files: state.files.filter((f) => f.id !== fileId),
          selectedFileId:
            state.selectedFileId === fileId
              ? state.files[0]?.id || null
              : state.selectedFileId,
        })),

      selectFile: (fileId) =>
        set(() => ({
          selectedFileId: fileId,
        })),

      clearFiles: () =>
        set(() => ({
          files: [],
          selectedFileId: null,
        })),

      // Aid station actions
      setAidStations: (stations) =>
        set(() => ({
          aidStations: stations,
        })),

      addAidStation: (station) =>
        set((state) => ({
          aidStations: [...state.aidStations, station],
        })),

      removeAidStation: (index) =>
        set((state) => ({
          aidStations: state.aidStations.filter((_, i) => i !== index),
        })),

      updateAidStation: (index, station) =>
        set((state) => ({
          aidStations: state.aidStations.map((s, i) =>
            i === index ? station : s
          ),
        })),

      clearAidStations: () =>
        set(() => ({
          aidStations: [],
        })),

      // Aid station table actions
      setAidStationTable: (newState) =>
        set((state) => ({
          aidStationTable: {
            ...state.aidStationTable,
            ...newState,
          },
        })),

      // UI actions
      setActiveTab: (tab) =>
        set(() => ({
          activeTab: tab,
        })),
    }),
    {
      name: 'gpxify-storage',
      version: AID_STATION_TABLE_STATE_VERSION,
      migrate: (persistedState, fromVersion) => {
        // Always pass the aidStationTable sub-object through the migrator.
        // Works for any prior version, including unversioned v1.
        const state = (persistedState ?? {}) as Record<string, unknown>;
        if (fromVersion < AID_STATION_TABLE_STATE_VERSION) {
          return {
            ...state,
            aidStationTable: migrateAidStationTableState(state.aidStationTable),
          };
        }
        return state;
      },
      partialize: (state) => ({
        files: state.files,
        selectedFileId: state.selectedFileId,
        aidStations: state.aidStations,
        aidStationTable: state.aidStationTable,
      }),
    }
  )
);

// Selectors for optimized re-renders
export const useSelectedFile = () =>
  useAppStore((state) => {
    const selectedId = state.selectedFileId;
    return state.files.find((f) => f.id === selectedId) || null;
  });

export const useSelectedTrack = () =>
  useAppStore((state) => {
    const selectedId = state.selectedFileId;
    const file = state.files.find((f) => f.id === selectedId);
    return file?.tracks[0] || null;
  });
