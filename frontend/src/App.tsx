import { useState } from 'react';
import L from 'leaflet';
import { FileUpload } from './components/FileUpload';
import { GPXMap } from './components/Map/GPXMap';
import { ElevationProfile } from './components/Map/ElevationProfile';
import { TrackStats } from './components/TrackStats';
import { gpxApi } from './services/api';
import { GPXData } from './types/gpx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/Card';
import { Mountain } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Mountain className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">GPXIFY</h1>
              <p className="text-sm text-muted-foreground">Analyseur de fichiers GPX</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {gpxFiles.length === 0 ? (
          /* Upload Section */
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Importer un fichier GPX</CardTitle>
                <CardDescription>
                  Téléchargez un fichier GPX pour visualiser votre trace et analyser le profil
                  d'altitude
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onFileSelect={handleFileSelect} isUploading={isUploading} />

                {error && (
                  <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Preview */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🗺️</div>
                    <h3 className="font-semibold mb-1">Carte interactive</h3>
                    <p className="text-sm text-muted-foreground">
                      Visualisez votre trace sur une carte outdoor
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <h3 className="font-semibold mb-1">Profil d'altitude</h3>
                    <p className="text-sm text-muted-foreground">
                      Analysez l'élévation et la pente de votre parcours
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl mb-2">📈</div>
                    <h3 className="font-semibold mb-1">Statistiques</h3>
                    <p className="text-sm text-muted-foreground">
                      Distance, dénivelé, durée et plus encore
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Analysis View */
          <div className="space-y-6">
            {/* Files List & Upload */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Fichiers GPX ({gpxFiles.length})</CardTitle>
                    <CardDescription>Comparez plusieurs traces sur la même carte</CardDescription>
                  </div>
                  <button
                    onClick={() => setGpxFiles([])}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Tout supprimer
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gpxFiles.map((file, index) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'][index % 5] }}></div>
                        <div>
                          <div className="font-medium">{file.filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {file.tracks.length} trace(s) · {(file.tracks.reduce((sum, t) => sum + t.statistics.total_distance, 0) / 1000).toFixed(2)} km
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                  <div className="pt-2">
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

      {/* Footer */}
      <footer className="mt-16 py-6 border-t bg-white">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>GPXIFY v1.0.0 - Phase 1 MVP</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
