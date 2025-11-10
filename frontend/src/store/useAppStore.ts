/**
 * Zustand store for global app state management
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track, AidStationTableResponse } from '../types/gpx';

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
  useNaismith: boolean;
  customPace: string;
  tableResult: AidStationTableResponse | null;
}

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

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      files: [],
      selectedFileId: null,
      aidStations: [],
      aidStationTable: {
        aidStations: [],
        useNaismith: true,
        customPace: '12',
        tableResult: null,
      },
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
      name: 'gpxify-storage', // LocalStorage key
      // Only persist files and aid stations, not UI state
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
