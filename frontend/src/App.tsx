import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import L from 'leaflet';
import { Hero } from './components/Hero';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ShareButton } from './components/ShareButton';
import {
  QuickGuide,
  TabNavigation,
  AnalyzeTab,
  AidStationsTab,
  RaceRecoveryTab,
} from './components/Dashboard';
import { SharedView } from './pages/SharedView';
import { FAQ } from './pages/FAQ';
import { Legal } from './pages/Legal';
import { RaceRecovery } from './pages/RaceRecovery';
import { GPXMerge } from './components/GPXMerge';
import { AidStationTableResponse } from './types/gpx';
import { useAppStore } from './store/useAppStore';
import { useGPXUpload } from './hooks/useGPXUpload';
import { useLeafletMap } from './hooks/useLeafletMap';

interface AidStationTableState {
  aidStations: any[];
  useNaismith: boolean;
  customPace: string;
  tableResult: AidStationTableResponse | null;
}

// Color palette for GPX files (red first for better visibility)
const gpxColors = [
  { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-500', hex: '#ef4444' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-500', hex: '#a855f7' },
  { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-500', hex: '#22c55e' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-500', hex: '#f97316' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-500', hex: '#ec4899' },
];

function App() {
  // Zustand store
  const gpxFiles = useAppStore((state) => state.files);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const removeFile = useAppStore((state) => state.removeFile);
  const clearFiles = useAppStore((state) => state.clearFiles);
  const selectedGpxForAidStations = useAppStore((state) => state.selectedFileId);
  const selectFile = useAppStore((state) => state.selectFile);
  const setAidStations = useAppStore((state) => state.setAidStations);

  // Custom hooks
  const { handleFileSelect, isUploading, error } = useGPXUpload();
  const { map, setMap } = useLeafletMap();

  // Local state for drag & drop and aid station table
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [aidStationTableState, setAidStationTableState] = useState<AidStationTableState>({
    aidStations: [],
    useNaismith: true,
    customPace: '12',
    tableResult: null,
  });

  // Drag & Drop for reordering files
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Note: Reordering logic would need to be added to Zustand store
    // For now, keeping it in local state
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMapReady = (mapInstance: L.Map) => {
    setMap(mapInstance);
  };

  const handleStateLoaded = (state: Record<string, any>) => {
    if (state.gpxFiles && Array.isArray(state.gpxFiles)) {
      // Load files into Zustand store
      state.gpxFiles.forEach((file: any) => {
        useAppStore.getState().addFile(file);
      });
    }
    if (state.aidStationTable) {
      setAidStationTableState(state.aidStationTable);
      if (state.aidStationTable.aidStations) {
        setAidStations(state.aidStationTable.aidStations);
      }
    }
    if (state.selectedGpxForAidStations) {
      selectFile(state.selectedGpxForAidStations);
    }
  };

  // Calculate aggregate statistics
  const totalStats = gpxFiles.reduce(
    (acc, file) => {
      file.tracks.forEach((track) => {
        acc.distance += track.statistics.total_distance;
        acc.elevationGain += track.statistics.total_elevation_gain || 0;
        acc.elevationLoss += track.statistics.total_elevation_loss || 0;
      });
      return acc;
    },
    { distance: 0, elevationGain: 0, elevationLoss: 0 }
  );

  const renderMainApp = () => {
    // Show Hero page if no files loaded
    if (gpxFiles.length === 0) {
      return <Hero onFileSelect={handleFileSelect} isUploading={isUploading} error={error} />;
    }

    // Show analysis dashboard with navbar
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
              gpxColors={gpxColors}
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
              gpxColors={gpxColors}
              selectedGpxForAidStations={selectedGpxForAidStations}
              aidStationTableState={aidStationTableState}
              onSelectGpx={selectFile}
              onStateChange={setAidStationTableState}
            />
          )}

          {/* Tab Content: Race Recovery */}
          {activeTab === 'race-recovery' && <RaceRecoveryTab />}
        </main>

        <Footer />
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/" element={renderMainApp()} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/race-recovery" element={<RaceRecovery />} />
      <Route path="/share/:shareId" element={<SharedView onStateLoaded={handleStateLoaded} />} />
    </Routes>
  );
}

export default App;
