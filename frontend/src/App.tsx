import { Routes, Route } from 'react-router-dom';
import { Hero } from './components/Hero';
import { SharedView } from './pages/SharedView';
import { FAQ } from './pages/FAQ';
import { Legal } from './pages/Legal';
import { RaceRecovery } from './pages/RaceRecovery';
import { Marketing } from './pages/Marketing';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { useAppStore } from './store/useAppStore';
import { useGPXUpload } from './hooks/useGPXUpload';

function App() {
  const gpxFiles = useAppStore((state) => state.files);
  const setAidStations = useAppStore((state) => state.setAidStations);
  const selectFile = useAppStore((state) => state.selectFile);
  const setAidStationTable = useAppStore((state) => state.setAidStationTable);

  const { handleFileSelect, isUploading, error } = useGPXUpload();

  /**
   * Handle state loaded from shared link
   * Restores GPX files, aid stations, and selected file
   */
  const handleStateLoaded = (state: Record<string, any>) => {
    if (state.gpxFiles && Array.isArray(state.gpxFiles)) {
      state.gpxFiles.forEach((file: any) => {
        useAppStore.getState().addFile(file);
      });
    }

    if (state.aidStationTable) {
      setAidStationTable(state.aidStationTable);
      if (state.aidStationTable.aidStations) {
        setAidStations(state.aidStationTable.aidStations);
      }
    }

    if (state.selectedGpxForAidStations) {
      selectFile(state.selectedGpxForAidStations);
    }
  };

  /**
   * Render main app:
   * - Show Hero if no files loaded
   * - Show WorkspaceLayout if files are loaded
   */
  const renderMainApp = () => {
    if (gpxFiles.length === 0) {
      return <Hero onFileSelect={handleFileSelect} isUploading={isUploading} error={error} />;
    }

    return <WorkspaceLayout />;
  };

  return (
    <Routes>
      <Route path="/" element={<Marketing />} />
      <Route path="/analyze" element={renderMainApp()} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/race-recovery" element={<RaceRecovery />} />
      <Route path="/share/:shareId" element={<SharedView onStateLoaded={handleStateLoaded} />} />
    </Routes>
  );
}

export default App;
