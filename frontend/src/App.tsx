import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import L from 'leaflet';
import { Hero } from './components/Hero';
import { Navbar } from './components/Navbar';
import { FileUpload } from './components/FileUpload';
import { GPXMap } from './components/Map/GPXMap';
import { ElevationProfile } from './components/Map/ElevationProfile';
import { TrackStats } from './components/TrackStats';
import { StatCard } from './components/StatCard';
import { ShareButton } from './components/ShareButton';
import { SharedView } from './pages/SharedView';
import { GPXMerge } from './components/GPXMerge';
import { gpxApi } from './services/api';
import { GPXData } from './types/gpx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/Card';
import { Navigation, TrendingUp, TrendingDown, X, GripVertical, Merge } from 'lucide-react';

interface GPXFileData extends GPXData {
  id: string;
  uploadedAt: Date;
}

function App() {
  const [gpxFiles, setGpxFiles] = useState<GPXFileData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [activeTab, setActiveTab] = useState<'analyze' | 'merge'>('analyze');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
      setError(err.response?.data?.detail || 'Erreur lors du téléchargement du fichier');
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

  // Color palette for GPX files
  const gpxColors = [
    { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-500', hex: '#3b82f6' },
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
                timestamp: new Date().toISOString(),
              }}
            />
          }
        />

        <main className="container mx-auto p-6 space-y-6">
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
          </div>

          {/* Tab Content: Analyze */}
          {activeTab === 'analyze' && (
            <>
              {/* Aggregate Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="pt-2 border-t border-border mt-4">
                  <FileUpload onFileSelect={handleFileSelect} isUploading={isUploading} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle>Carte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <GPXMap
                  tracks={gpxFiles.flatMap(f => f.tracks)}
                  onMapReady={handleMapReady}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gpxFiles.map((file) =>
              file.tracks.map((track, index) => (
                <TrackStats key={`${file.id}-${index}`} track={track} />
              ))
            )}
          </div>

              {/* Elevation Profile */}
              {gpxFiles.length > 0 && gpxFiles[0].tracks.length > 0 && map && (
                <Card>
                  <CardHeader>
                    <CardTitle>Profil d'altitude - {gpxFiles[0].filename}</CardTitle>
                    <CardDescription>
                      Cliquez sur le graphique pour voir la position sur la carte
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ElevationProfile track={gpxFiles[0].tracks[0]} map={map} />
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Tab Content: Merge */}
          {activeTab === 'merge' && <GPXMerge />}
        </main>
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/" element={renderMainApp()} />
      <Route path="/share/:shareId" element={<SharedView onStateLoaded={handleStateLoaded} />} />
    </Routes>
  );
}

export default App;
