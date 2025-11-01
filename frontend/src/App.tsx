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

function App() {
  const [gpxData, setGpxData] = useState<GPXData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const response = await gpxApi.uploadGPX(file);

      if (response.success && response.data) {
        setGpxData(response.data);
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
        {!gpxData ? (
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
            {/* File Info Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{gpxData.filename}</CardTitle>
                    <CardDescription>{gpxData.tracks.length} trace(s) trouvée(s)</CardDescription>
                  </div>
                  <button
                    onClick={() => setGpxData(null)}
                    className="text-sm text-primary hover:underline"
                  >
                    Charger un autre fichier
                  </button>
                </div>
              </CardHeader>
            </Card>

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Carte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <GPXMap tracks={gpxData.tracks} onMapReady={handleMapReady} />
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gpxData.tracks.map((track, index) => (
                <TrackStats key={index} track={track} />
              ))}
            </div>

            {/* Elevation Profile */}
            {gpxData.tracks.length > 0 && map && (
              <Card>
                <CardHeader>
                  <CardTitle>Profil d'altitude</CardTitle>
                  <CardDescription>
                    Cliquez sur le graphique pour voir la position sur la carte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ElevationProfile track={gpxData.tracks[0]} map={map} />
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
