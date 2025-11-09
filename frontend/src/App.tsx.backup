import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import L from 'leaflet';
import { Hero } from './components/Hero';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { FileUpload } from './components/FileUpload';
import { GPXMap } from './components/Map/GPXMap';
import { ElevationProfile } from './components/Map/ElevationProfile';
import { TrackStats } from './components/TrackStats';
import { StatCard } from './components/StatCard';
import { ShareButton } from './components/ShareButton';
import { SharedView } from './pages/SharedView';
import { FAQ } from './pages/FAQ';
import { Legal } from './pages/Legal';
import { RaceRecovery } from './pages/RaceRecovery';
import { GPXMerge } from './components/GPXMerge';
import { AidStationTable } from './components/AidStationTable';
import { gpxApi } from './services/api';
import { GPXData, AidStation, AidStationTableResponse } from './types/gpx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/Card';
import { Navigation, TrendingUp, TrendingDown, X, GripVertical, Merge, Table, ChevronDown, ChevronUp, Plus, Heart } from 'lucide-react';

interface GPXFileData extends GPXData {
  id: string;
  uploadedAt: Date;
}

interface AidStationTableState {
  aidStations: AidStation[];
  useNaismith: boolean;
  customPace: string;
  tableResult: AidStationTableResponse | null;
}

function App() {
  const [gpxFiles, setGpxFiles] = useState<GPXFileData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [activeTab, setActiveTab] = useState<'analyze' | 'merge' | 'aid-stations' | 'race-recovery'>('analyze');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedGpxForAidStations, setSelectedGpxForAidStations] = useState<string | null>(null);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [aidStationTableState, setAidStationTableState] = useState<AidStationTableState>({
    aidStations: [],
    useNaismith: true,
    customPace: '12',
    tableResult: null,
  });

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const response = await gpxApi.uploadGPX(file);

      if (response.success && response.data) {
        const newFile: GPXFileData = {
          ...response.data,
          id: response.file_id || crypto.randomUUID(),
          uploadedAt: new Date(),
        };
        setGpxFiles(prev => [...prev, newFile]);
      } else {
        setError(response.message || 'Erreur lors du téléchargement');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      // Provide more specific error messages
      let errorMessage = 'Erreur lors du téléchargement du fichier';

      if (err.response?.status === 413) {
        errorMessage = 'Fichier trop volumineux. La taille maximale est de 10 MB.';
      } else if (err.response?.status === 415) {
        errorMessage = 'Format de fichier non supporté. Veuillez uploader un fichier GPX valide.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.detail || 'Fichier GPX invalide. Vérifiez que votre fichier contient des données GPS valides.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer dans quelques instants.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (id: string) => {
    setGpxFiles(prev => prev.filter(f => f.id !== id));
  };

  // Drag & Drop for reordering files
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...gpxFiles];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);

    setGpxFiles(newFiles);
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
      setGpxFiles(state.gpxFiles);
    }
    if (state.aidStationTable) {
      setAidStationTableState(state.aidStationTable);
    }
    if (state.selectedGpxForAidStations) {
      setSelectedGpxForAidStations(state.selectedGpxForAidStations);
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

  // Color palette for GPX files (red first for better visibility)
  const gpxColors = [
    { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-500', hex: '#ef4444' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-500', hex: '#a855f7' },
    { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-500', hex: '#22c55e' },
    { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-500', hex: '#f97316' },
    { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-500', hex: '#ec4899' },
  ];

  const renderMainApp = () => {
    // Show Hero page if no files loaded
    if (gpxFiles.length === 0) {
      return <Hero onFileSelect={handleFileSelect} isUploading={isUploading} error={error} />;
    }

    // Show analysis dashboard with navbar
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar
          onClearAll={() => setGpxFiles([])}
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
          {/* Guide rapide */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">Que voulez-vous faire ?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium">📊 Analyser :</span>
                    <span className="text-muted-foreground">Stats, carte, profil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium">🔀 Fusionner :</span>
                    <span className="text-muted-foreground">Combinez plusieurs traces</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium">⏱️ Prévisions :</span>
                    <span className="text-muted-foreground">Tableau ravitaillements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium">🔋 Sauve ma course :</span>
                    <span className="text-muted-foreground">Batterie vide ?</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'analyze'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Analyser
            </button>
            <button
              onClick={() => setActiveTab('merge')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'merge'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Merge className="w-4 h-4" />
              Fusionner
            </button>
            <button
              onClick={() => setActiveTab('aid-stations')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'aid-stations'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table className="w-4 h-4" />
              Prévisions
            </button>
            <button
              onClick={() => setActiveTab('race-recovery')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'race-recovery'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className="w-4 h-4" />
              Sauve ma course
            </button>
          </div>

          {/* Tab Content: Analyze */}
          {activeTab === 'analyze' && (
            <>
              {/* Main Layout: Stats (1/3) + Map (2/3) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column: Stats and Files (1/3) */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Aggregate Statistics */}
                  <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
                    <StatCard
                      title="Distance totale"
                      value={`${(totalStats.distance / 1000).toFixed(2)} km`}
                      icon={Navigation}
                      color="blue"
                    />
                    <StatCard
                      title="Dénivelé positif total"
                      value={`${Math.round(totalStats.elevationGain)} m`}
                      icon={TrendingUp}
                      color="green"
                    />
                    <StatCard
                      title="Dénivelé négatif total"
                      value={`${Math.round(totalStats.elevationLoss)} m`}
                      icon={TrendingDown}
                      color="red"
                    />
                  </div>

                  {/* Files List & Upload */}
                  <Card>
            <CardHeader>
              <CardTitle>Fichiers GPX</CardTitle>
              <CardDescription>Gérez vos traces et ajoutez-en de nouvelles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gpxFiles.map((file, index) => {
                  const colorScheme = gpxColors[index % gpxColors.length];
                  return (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${colorScheme.border} ${colorScheme.bg} transition-all hover:scale-[1.02] cursor-move ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className={`w-3 h-3 rounded-full ${colorScheme.text}`} style={{ backgroundColor: colorScheme.hex }}></div>
                        <div>
                          <div className={`font-semibold ${colorScheme.text}`}>{file.filename}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                            <span>{file.tracks.length} trace(s)</span>
                            <span>·</span>
                            <span>{(file.tracks.reduce((sum, t) => sum + t.statistics.total_distance, 0) / 1000).toFixed(2)} km</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="p-2 hover:bg-destructive/20 rounded-lg transition-colors group"
                      >
                        <X className="w-5 h-5 text-muted-foreground group-hover:text-destructive" />
                      </button>
                    </div>
                  );
                })}

                {/* Collapsible Upload Section */}
                <div className="pt-2 border-t border-border mt-4">
                  <button
                    onClick={() => setShowUploadSection(!showUploadSection)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un fichier GPX</span>
                    </div>
                    {showUploadSection ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showUploadSection && (
                    <div className="mt-3 p-4 bg-muted/30 rounded-lg">
                      <FileUpload onFileSelect={handleFileSelect} isUploading={isUploading} />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
                  </Card>
                </div>

                {/* Right Column: Map (2/3) */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-lg">Carte</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="h-[600px]">
                        <GPXMap
                          tracks={gpxFiles.flatMap(f => f.tracks)}
                          onMapReady={handleMapReady}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Elevation Profile - Full Width Below */}
              {gpxFiles.length > 0 && gpxFiles[0].tracks.length > 0 && map && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg">Profil d'altitude - {gpxFiles[0].filename}</CardTitle>
                    <CardDescription className="text-sm">
                      Cliquez sur le graphique pour voir la position sur la carte
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3">
                    <ElevationProfile track={gpxFiles[0].tracks[0]} map={map} />
                  </CardContent>
                </Card>
              )}

              {/* Climbs Details - Full Width Below */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gpxFiles.map((file) =>
                  file.tracks.map((track, index) => (
                    <TrackStats key={`${file.id}-${index}`} track={track} />
                  ))
                )}
              </div>
            </>
          )}

          {/* Tab Content: Merge */}
          {activeTab === 'merge' && <GPXMerge />}

          {/* Tab Content: Aid Stations / Predictions */}
          {activeTab === 'aid-stations' && (
            <div className="space-y-6">
              {gpxFiles.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center text-muted-foreground">
                    <Table className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Aucun fichier GPX chargé</p>
                    <p className="text-sm">Uploadez un fichier GPX pour créer un tableau de prévisions</p>
                  </div>
                </Card>
              ) : (
                <>
                  {/* GPX File Selector */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Sélectionner un fichier GPX</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {gpxFiles.map((file, index) => {
                        const colorScheme = gpxColors[index % gpxColors.length];
                        const isSelected = selectedGpxForAidStations === file.id ||
                          (selectedGpxForAidStations === null && index === 0);

                        return (
                          <button
                            key={file.id}
                            onClick={() => setSelectedGpxForAidStations(file.id)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? `${colorScheme.border} ${colorScheme.bg} ring-2 ring-offset-2 ring-primary`
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colorScheme.hex }}
                              />
                              <span className={`font-medium text-sm ${isSelected ? colorScheme.text : ''}`}>
                                {file.filename}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {(file.tracks.reduce((sum, t) => sum + t.statistics.total_distance, 0) / 1000).toFixed(1)} km
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Aid Station Table */}
                  <AidStationTable
                    track={(() => {
                      const selectedFile = gpxFiles.find(f => f.id === selectedGpxForAidStations) || gpxFiles[0];
                      return selectedFile.tracks.length > 0 ? selectedFile.tracks[0] : null;
                    })()}
                    aidStations={aidStationTableState.aidStations}
                    useNaismith={aidStationTableState.useNaismith}
                    customPace={aidStationTableState.customPace}
                    tableResult={aidStationTableState.tableResult}
                    onStateChange={setAidStationTableState}
                  />
                </>
              )}
            </div>
          )}

          {/* Tab Content: Race Recovery */}
          {activeTab === 'race-recovery' && (
            <div className="space-y-6">
              <Card className="p-8">
                <div className="text-center space-y-4">
                  <Heart className="w-16 h-16 text-primary mx-auto" />
                  <h2 className="text-2xl font-bold">Sauve ma course</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Votre montre a rendu l'âme en pleine course ? Pas de panique !
                    Utilisez notre outil pour reconstruire votre trace GPX complète avec des timestamps précis.
                  </p>
                  <div className="pt-4">
                    <a
                      href="/race-recovery"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                    >
                      <Heart className="w-5 h-5" />
                      Ouvrir l'outil de récupération
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          )}
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
