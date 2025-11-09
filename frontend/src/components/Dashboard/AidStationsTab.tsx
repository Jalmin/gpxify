import { Table } from 'lucide-react';
import { Card } from '../ui/Card';
import { AidStationTable } from '../AidStationTable';
import { AidStation, AidStationTableResponse, Track } from '../../types/gpx';

interface GPXFileData {
  id: string;
  filename: string;
  tracks: Track[];
}

interface AidStationTableState {
  aidStations: AidStation[];
  useNaismith: boolean;
  customPace: string;
  tableResult: AidStationTableResponse | null;
}

interface AidStationsTabProps {
  gpxFiles: GPXFileData[];
  gpxColors: Array<{
    bg: string;
    border: string;
    text: string;
    hex: string;
  }>;
  selectedGpxForAidStations: string | null;
  aidStationTableState: AidStationTableState;
  onSelectGpx: (id: string) => void;
  onStateChange: (state: AidStationTableState) => void;
}

export function AidStationsTab({
  gpxFiles,
  gpxColors,
  selectedGpxForAidStations,
  aidStationTableState,
  onSelectGpx,
  onStateChange,
}: AidStationsTabProps) {
  if (gpxFiles.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Table className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Aucun fichier GPX chargé</p>
          <p className="text-sm">Uploadez un fichier GPX pour créer un tableau de prévisions</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* GPX File Selector */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Sélectionner un fichier GPX</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {gpxFiles.map((file, index) => {
            const colorScheme = gpxColors[index % gpxColors.length];
            const isSelected =
              selectedGpxForAidStations === file.id ||
              (selectedGpxForAidStations === null && index === 0);

            return (
              <button
                key={file.id}
                onClick={() => onSelectGpx(file.id)}
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
                  {(
                    file.tracks.reduce((sum, t) => sum + t.statistics.total_distance, 0) / 1000
                  ).toFixed(1)}{' '}
                  km
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Aid Station Table */}
      <AidStationTable
        track={(() => {
          const selectedFile =
            gpxFiles.find((f) => f.id === selectedGpxForAidStations) || gpxFiles[0];
          return selectedFile.tracks.length > 0 ? selectedFile.tracks[0] : null;
        })()}
        aidStations={aidStationTableState.aidStations}
        useNaismith={aidStationTableState.useNaismith}
        customPace={aidStationTableState.customPace}
        tableResult={aidStationTableState.tableResult}
        onStateChange={onStateChange}
      />
    </div>
  );
}
