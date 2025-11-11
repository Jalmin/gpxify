import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { SharedView } from './pages/SharedView';
import { FAQ } from './pages/FAQ';
import { Legal } from './pages/Legal';
import { RaceRecovery } from './pages/RaceRecovery';
import { Marketing } from './pages/Marketing';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { useAppStore } from './store/useAppStore';

function App() {
  const gpxFiles = useAppStore((state) => state.files);
  const setAidStations = useAppStore((state) => state.setAidStations);
  const selectFile = useAppStore((state) => state.selectFile);
  const setAidStationTable = useAppStore((state) => state.setAidStationTable);

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
   * Analyze page: redirect to home if no GPX, otherwise show workspace
   */
  const AnalyzePage = () => {
    if (gpxFiles.length === 0) {
      return <Navigate to="/" replace />;
    }
    return <WorkspaceLayout />;
  };

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Marketing />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/race-recovery" element={<RaceRecovery />} />
        <Route path="/share/:shareId" element={<SharedView onStateLoaded={handleStateLoaded} />} />
      </Routes>
    </>
  );
}

export default App;
