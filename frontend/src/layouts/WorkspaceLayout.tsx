import L from 'leaflet';
import { useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ShareButton } from '../components/ShareButton';
import {
  QuickGuide,
  TabNavigation,
  AnalyzeTab,
  AidStationsTab,
  RaceRecoveryTab,
} from '../components/Dashboard';
import { GPXMerge } from '../components/GPXMerge';
import { useAppStore } from '../store/useAppStore';
import { useGPXUpload } from '../hooks/useGPXUpload';
import { useLeafletMap } from '../hooks/useLeafletMap';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { GPX_COLORS } from '../constants/colors';

/**
 * Main workspace layout for analyzing GPX files
 * Displays tabs for analysis, merge, aid stations, and race recovery
 */
export function WorkspaceLayout() {
  // Zustand store
  const gpxFiles = useAppStore((state) => state.files);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const removeFile = useAppStore((state) => state.removeFile);
  const clearFiles = useAppStore((state) => state.clearFiles);
  const selectedGpxForAidStations = useAppStore((state) => state.selectedFileId);
  const selectFile = useAppStore((state) => state.selectFile);
  const aidStationTableState = useAppStore((state) => state.aidStationTable);
  const setAidStationTable = useAppStore((state) => state.setAidStationTable);

  // Custom hooks
  const { handleFileSelect, isUploading } = useGPXUpload();
  const { map, setMap } = useLeafletMap();
  const { draggedIndex, handleDragStart, handleDragOver, handleDragEnd } = useDragAndDrop();

  // Calculate aggregate statistics
  const totalStats = useMemo(
    () =>
      gpxFiles.reduce(
        (acc, file) => {
          file.tracks.forEach((track) => {
            acc.distance += track.statistics.total_distance;
            acc.elevationGain += track.statistics.total_elevation_gain || 0;
            acc.elevationLoss += track.statistics.total_elevation_loss || 0;
          });
          return acc;
        },
        { distance: 0, elevationGain: 0, elevationLoss: 0 }
      ),
    [gpxFiles]
  );

  const handleMapReady = (mapInstance: L.Map) => {
    setMap(mapInstance);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        onClearAll={clearFiles}
        shareButton={
          <ShareButton
            appState={{
              gpxFiles,
              aidStationTable: aidStationTableState,
              selectedGpxForAidStations,
              timestamp: new Date().toISOString(),
            }}
          />
        }
      />

      <main className="container mx-auto p-4 space-y-4">
        {/* Quick Guide */}
        <QuickGuide />

        {/* Tabs */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content: Analyze */}
        {activeTab === 'analyze' && (
          <AnalyzeTab
            gpxFiles={gpxFiles}
            gpxColors={GPX_COLORS}
            totalStats={totalStats}
            map={map}
            onRemoveFile={removeFile}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onFileSelect={handleFileSelect}
            onMapReady={handleMapReady}
            isUploading={isUploading}
            draggedIndex={draggedIndex}
          />
        )}

        {/* Tab Content: Merge */}
        {activeTab === 'merge' && <GPXMerge />}

        {/* Tab Content: Aid Stations / Predictions */}
        {activeTab === 'aid-stations' && (
          <AidStationsTab
            gpxFiles={gpxFiles}
            gpxColors={GPX_COLORS}
            selectedGpxForAidStations={selectedGpxForAidStations}
            aidStationTableState={aidStationTableState}
            onSelectGpx={selectFile}
            onStateChange={setAidStationTable}
          />
        )}

        {/* Tab Content: Race Recovery */}
        {activeTab === 'race-recovery' && <RaceRecoveryTab />}
      </main>

      <Footer />
    </div>
  );
}
