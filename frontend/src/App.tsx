import { useState } from 'react';
import L from 'leaflet';
import { FileUpload } from './components/FileUpload';
import { GPXMap } from './components/Map/GPXMap';
import { ElevationProfile } from './components/Map/ElevationProfile';
import { TrackStats } from './components/TrackStats';
import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { gpxApi } from './services/api';
import { GPXData } from './types/gpx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/Card';
import { Mountain, Route, TrendingUp, TrendingDown, X } from 'lucide-react';

interface GPXFileData extends GPXData {
  id: string;
  uploadedAt: Date;
}

function App() {
  const [gpxFiles, setGpxFiles] = useState<GPXFileData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);

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

  const handleMapReady = (mapInstance: L.Map) => {
    setMap(mapInstance);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar activeSection="dashboard" />

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {gpxFiles.length === 0 ? (
          /* Upload Section - Welcome Screen */
          <div className="flex items-center justify-center min-h-screen p-6">
            <div className="max-w-2xl w-full space-y-8">
              <div className="text-center space-y-4">
                <Mountain className="w-20 h-20 mx-auto text-primary" />
                <h1 className="text-4xl font-bold">Bienvenue sur GPXIFY</h1>
                <p className="text-xl text-muted-foreground">
                  Analysez vos traces GPX avec précision
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Importer un fichier GPX</CardTitle>
                  <CardDescription>
                    Téléchargez un ou plusieurs fichiers GPX pour commencer l'analyse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload onFileSelect={handleFileSelect} isUploading={isUploading} />

                  {error && (
                    <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md border border-destructive">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Feature Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Mountain className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold mb-2">Carte interactive</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualisez vos traces sur une carte détaillée
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold mb-2">Profil d'altitude</h3>
                  <p className="text-sm text-muted-foreground">
                    Analysez l'élévation et les segments
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Route className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold mb-2">Statistiques</h3>
                  <p className="text-sm text-muted-foreground">
                    Distance, dénivelé et durée détaillés
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Analysis View */
          <div className="p-6 space-y-6">
            {/* Header with Stats Overview */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Dashboard</h1>
                  <p className="text-muted-foreground mt-1">{gpxFiles.length} fichier(s) chargé(s)</p>
                </div>
                <button
                  onClick={() => setGpxFiles([])}
                  className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg border border-destructive transition-colors"
                >
                  Tout supprimer
                </button>
              </div>

              {/* Aggregate Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Distance totale"
                  value={`${(totalStats.distance / 1000).toFixed(2)} km`}
                  icon={Route}
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
                        className={`flex items-center justify-between p-4 rounded-lg border-2 ${colorScheme.border} ${colorScheme.bg} transition-all hover:scale-[1.02]`}
                      >
                        <div className="flex items-center gap-4">
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
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
