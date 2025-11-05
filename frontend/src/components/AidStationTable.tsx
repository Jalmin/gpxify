import { useState } from 'react';
import { Plus, X, Table as TableIcon, Download, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Tooltip } from './ui/Tooltip';
import { GPXMap } from './Map/GPXMap';
import { Track, AidStation, AidStationTableRequest, AidStationTableResponse } from '@/types/gpx';

interface AidStationTableProps {
  track: Track | null;
}

export function AidStationTable({ track }: AidStationTableProps) {
  const [aidStations, setAidStations] = useState<AidStation[]>([]);
  const [newStationName, setNewStationName] = useState('');
  const [newStationKm, setNewStationKm] = useState('');
  const [useNaismith, setUseNaismith] = useState(true);
  const [customPace, setCustomPace] = useState('12');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tableResult, setTableResult] = useState<AidStationTableResponse | null>(null);

  const handleAddStation = () => {
    if (!newStationName || !newStationKm) {
      alert('Veuillez remplir le nom et la distance');
      return;
    }

    const km = parseFloat(newStationKm);
    if (isNaN(km) || km < 0) {
      alert('Distance invalide');
      return;
    }

    const newStation: AidStation = {
      name: newStationName,
      distance_km: km,
    };

    setAidStations((prev) => [...prev, newStation].sort((a, b) => a.distance_km - b.distance_km));
    setNewStationName('');
    setNewStationKm('');
  };

  const handleRemoveStation = (index: number) => {
    setAidStations((prev) => prev.filter((_, i) => i !== index));
    setTableResult(null);
  };

  const handleGenerate = async () => {
    if (!track) {
      alert('Aucune trace chargée');
      return;
    }

    if (aidStations.length < 2) {
      alert('Au moins 2 ravitaillements sont nécessaires');
      return;
    }

    setIsGenerating(true);

    try {
      const request: AidStationTableRequest = {
        track_points: track.points,
        aid_stations: aidStations,
        use_naismith: useNaismith,
        custom_pace_kmh: useNaismith ? undefined : parseFloat(customPace),
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/gpx/aid-station-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la génération';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          // If JSON parsing fails, try to get text
          const text = await response.text();
          errorMessage = `Erreur ${response.status}: ${text.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }

      const result: AidStationTableResponse = await response.json();
      setTableResult(result);
    } catch (error) {
      console.error('Generate error:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const formatCumulativeTime = (segments: AidStationTableResponse['segments'], upToIndex: number) => {
    if (!segments) return '-';
    const totalMinutes = segments.slice(0, upToIndex + 1).reduce((sum, seg) => sum + (seg.estimated_time_minutes || 0), 0);
    return formatTime(totalMinutes);
  };

  const createSegmentTracks = (): Track[] => {
    if (!track || !tableResult) return [];

    return tableResult.segments.map((segment) => {
      // Convert km to meters for comparison
      const startMeters = segment.start_km * 1000;
      const endMeters = segment.end_km * 1000;

      // Filter points that fall within this segment's distance range
      const segmentPoints = track.points.filter(
        (p) => p.distance >= startMeters && p.distance <= endMeters
      );

      return {
        name: `${segment.from_station} → ${segment.to_station}`,
        points: segmentPoints,
        statistics: {
          total_distance: segment.distance_km * 1000,
          total_elevation_gain: segment.elevation_gain,
          total_elevation_loss: segment.elevation_loss,
        },
      };
    });
  };

  const exportToCSV = () => {
    if (!tableResult) return;

    // Helper function to escape CSV values
    const escapeCSV = (value: string | number): string => {
      const str = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['De', 'À', 'Distance (km)', 'D+ (m)', 'D- (m)', 'Pente moy. (%)', 'Temps estimé', 'Temps cumulé'];
    const rows = tableResult.segments.map((seg, index) => [
      escapeCSV(seg.from_station),
      escapeCSV(seg.to_station),
      seg.distance_km.toFixed(2),
      Math.round(seg.elevation_gain),
      Math.round(seg.elevation_loss),
      seg.avg_gradient.toFixed(1),
      escapeCSV(formatTime(seg.estimated_time_minutes)),
      escapeCSV(formatCumulativeTime(tableResult.segments, index)),
    ]);

    // Add BOM for UTF-8 encoding (helps Excel recognize UTF-8)
    const BOM = '\uFEFF';
    const csv = BOM + [
      headers.map(h => escapeCSV(h)).join(','),
      ...rows.map((row) => row.join(',')),
      '',
      `Total,${tableResult.total_distance_km.toFixed(2)} km,${Math.round(tableResult.total_elevation_gain)} m,${Math.round(tableResult.total_elevation_loss)} m,,${escapeCSV(formatTime(tableResult.total_time_minutes))},`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tableau_ravitaillement.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!track) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <TableIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Chargez d'abord une trace GPX pour créer un tableau de ravitaillement</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Tableau de ravitaillement</h2>
        <p className="text-sm text-muted-foreground">
          Créez un tableau style UTMB avec les statistiques entre chaque ravitaillement
        </p>
      </div>

      {/* Add Aid Station */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Ajouter des ravitaillements</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Nom du ravito</label>
            <input
              type="text"
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
              placeholder="Ex: Chamonix, Courmayeur..."
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleAddStation()}
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium mb-1">Km</label>
            <input
              type="number"
              step="0.1"
              value={newStationKm}
              onChange={(e) => setNewStationKm(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleAddStation()}
            />
          </div>
          <Button onClick={handleAddStation} className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        </div>

        {aidStations.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Ravitaillements ({aidStations.length})</p>
            {aidStations.map((station, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {index + 1}
                  </div>
                  <span className="font-medium">{station.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {station.distance_km.toFixed(1)} km
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveStation(index)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Time Estimation Options */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold">Options de calcul</h3>
          <Tooltip content="Choisissez entre la formule de Naismith (adaptée au trail avec dénivelé) ou une allure constante personnalisée pour calculer les temps estimés." />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="naismith"
              checked={useNaismith}
              onChange={() => setUseNaismith(true)}
              className="w-4 h-4"
            />
            <label htmlFor="naismith" className="text-sm flex-1">
              <strong>Formule de Naismith</strong> (recommandée)
              <span className="block text-xs text-muted-foreground mt-1">
                12 km/h plat + 5 min par 100m D+ - 5 min par 100m D- (pente &gt; 12%)
              </span>
            </label>
            <Tooltip content="Cette formule classique ajuste automatiquement votre vitesse en fonction du dénivelé. Elle est particulièrement adaptée aux parcours de trail et randonnée avec du relief." />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="custom-pace"
              checked={!useNaismith}
              onChange={() => setUseNaismith(false)}
              className="w-4 h-4"
            />
            <label htmlFor="custom-pace" className="text-sm flex-1">
              <strong>Allure personnalisée</strong>
            </label>
            {!useNaismith && (
              <input
                type="number"
                step="0.1"
                value={customPace}
                onChange={(e) => setCustomPace(e.target.value)}
                className="w-20 px-2 py-1 bg-background border border-border rounded text-sm"
              />
            )}
            {!useNaismith && <span className="text-sm">km/h</span>}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={aidStations.length < 2 || isGenerating}
          className="w-full mt-4 gap-2"
        >
          <TableIcon className="w-4 h-4" />
          {isGenerating ? 'Génération...' : 'Générer le tableau'}
        </Button>
      </Card>

      {/* Map with colored segments */}
      {tableResult && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Carte des segments</h3>
          <div className="w-full" style={{ height: '500px' }}>
            <GPXMap tracks={createSegmentTracks()} />
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">Légende :</span>
            {tableResult.segments.map((segment, index) => {
              const colors = ['#ef4444', '#a855f7', '#22c55e', '#f97316', '#ec4899'];
              const color = colors[index % colors.length];
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs">
                    {segment.from_station} → {segment.to_station}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Results Table */}
      {tableResult && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tableau de ravitaillement</h3>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">De</th>
                  <th className="text-left p-2 font-semibold">À</th>
                  <th className="text-right p-2 font-semibold">Δ Distance</th>
                  <th className="text-right p-2 font-semibold">D+</th>
                  <th className="text-right p-2 font-semibold">D-</th>
                  <th className="text-right p-2 font-semibold">Pente moy.</th>
                  <th className="text-right p-2 font-semibold">Temps estimé</th>
                  <th className="text-right p-2 font-semibold">Temps cumulé</th>
                </tr>
              </thead>
              <tbody>
                {tableResult.segments.map((segment, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2">{segment.from_station}</td>
                    <td className="p-2">{segment.to_station}</td>
                    <td className="p-2 text-right font-medium">{segment.distance_km.toFixed(2)} km</td>
                    <td className="p-2 text-right">
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round(segment.elevation_gain)} m
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <TrendingDown className="w-3 h-3" />
                        {Math.round(segment.elevation_loss)} m
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <span className={segment.avg_gradient > 0 ? 'text-orange-600' : 'text-blue-600'}>
                        {segment.avg_gradient.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(segment.estimated_time_minutes)}
                      </span>
                    </td>
                    <td className="p-2 text-right font-semibold">
                      {formatCumulativeTime(tableResult.segments, index)}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="border-t-2 border-border font-bold bg-muted/50">
                  <td className="p-2" colSpan={2}>TOTAL</td>
                  <td className="p-2 text-right">{tableResult.total_distance_km.toFixed(2)} km</td>
                  <td className="p-2 text-right text-green-600">
                    {Math.round(tableResult.total_elevation_gain)} m
                  </td>
                  <td className="p-2 text-right text-red-600">
                    {Math.round(tableResult.total_elevation_loss)} m
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right">{formatTime(tableResult.total_time_minutes)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
