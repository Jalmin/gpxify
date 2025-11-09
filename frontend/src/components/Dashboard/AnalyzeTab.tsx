import L from 'leaflet';
import { GPXMap } from '../Map/GPXMap';
import { ElevationProfile } from '../Map/ElevationProfile';
import { TrackStats } from '../TrackStats';
import { StatsColumn } from './StatsColumn';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Track } from '../../types/gpx';

interface GPXFileData {
  id: string;
  filename: string;
  tracks: Track[];
}

interface AnalyzeTabProps {
  gpxFiles: GPXFileData[];
  gpxColors: Array<{
    bg: string;
    border: string;
    text: string;
    hex: string;
  }>;
  totalStats: {
    distance: number;
    elevationGain: number;
    elevationLoss: number;
  };
  map: L.Map | null;
  onRemoveFile: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onFileSelect: (file: File) => void;
  onMapReady: (map: L.Map) => void;
  isUploading: boolean;
  draggedIndex: number | null;
}

export function AnalyzeTab({
  gpxFiles,
  gpxColors,
  totalStats,
  map,
  onRemoveFile,
  onDragStart,
  onDragOver,
  onDragEnd,
  onFileSelect,
  onMapReady,
  isUploading,
  draggedIndex,
}: AnalyzeTabProps) {
  return (
    <>
      {/* Main Layout: Stats (1/3) + Map (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Stats and Files (1/3) */}
        <StatsColumn
          gpxFiles={gpxFiles}
          gpxColors={gpxColors}
          totalStats={totalStats}
          onRemoveFile={onRemoveFile}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onFileSelect={onFileSelect}
          isUploading={isUploading}
          draggedIndex={draggedIndex}
        />

        {/* Right Column: Map (2/3) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Carte</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="h-[600px]">
                <GPXMap tracks={gpxFiles.flatMap((f) => f.tracks)} onMapReady={onMapReady} />
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
  );
}
