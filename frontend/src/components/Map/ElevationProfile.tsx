import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Track, ClimbSegment } from '@/types/gpx';
import { gpxApi } from '@/services/api';
import { ClimbsList } from '@/components/ClimbsList';
import { Download, TrendingUp as TrendingUpIcon } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ElevationProfileProps {
  track: Track;
  map?: L.Map;
}

interface SegmentStats {
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  startElevation: number;
  endElevation: number;
}

export function ElevationProfile({ track, map }: ElevationProfileProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const [segmentStart, setSegmentStart] = useState<number>(0);
  const [segmentEnd, setSegmentEnd] = useState<number>(track.statistics.total_distance / 1000);
  const [climbs, setClimbs] = useState<ClimbSegment[]>([]);
  const [isDetectingClimbs, setIsDetectingClimbs] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const segmentExplorerRef = useRef<HTMLDivElement>(null);

  // Prepare data for chart
  const distances = track.points.map(p => (p.distance / 1000).toFixed(2)); // km
  const elevations = track.points.map(p => p.elevation || 0);

  // Calculate segment statistics
  const segmentStats = useMemo<SegmentStats>(() => {
    const startIdx = track.points.findIndex(p => p.distance / 1000 >= segmentStart);
    const endIdx = track.points.findIndex(p => p.distance / 1000 >= segmentEnd);

    const startPoint = startIdx >= 0 ? startIdx : 0;
    const endPoint = endIdx >= 0 ? endIdx : track.points.length - 1;

    let elevationGain = 0;
    let elevationLoss = 0;

    for (let i = startPoint; i < endPoint; i++) {
      const currentElevation = track.points[i].elevation || 0;
      const nextElevation = track.points[i + 1].elevation || 0;
      const diff = nextElevation - currentElevation;

      if (diff > 0) {
        elevationGain += diff;
      } else {
        elevationLoss += Math.abs(diff);
      }
    }

    return {
      distance: (track.points[endPoint].distance - track.points[startPoint].distance) / 1000,
      elevationGain,
      elevationLoss,
      startElevation: track.points[startPoint].elevation || 0,
      endElevation: track.points[endPoint].elevation || 0,
    };
  }, [track.points, segmentStart, segmentEnd]);

  // Create segment highlight data
  const segmentData = elevations.map((elevation, index) => {
    const pointDistance = parseFloat(distances[index]);
    if (pointDistance >= segmentStart && pointDistance <= segmentEnd) {
      return elevation;
    }
    return null;
  });

  const data = {
    labels: distances,
    datasets: [
      {
        label: 'Altitude (m)',
        data: elevations,
        fill: true,
        borderColor: 'rgb(203, 213, 225)',
        backgroundColor: 'rgba(203, 213, 225, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
      {
        label: 'Segment sélectionné',
        data: segmentData,
        fill: true,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.3)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            return `Distance: ${items[0].label} km`;
          },
          label: (item: any) => {
            return `Altitude: ${Math.round(item.parsed.y)} m`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Distance (km)',
        },
        ticks: {
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Altitude (m)',
        },
      },
    },
    onClick: (_event: any, elements: any) => {
      if (elements.length > 0 && map) {
        const index = elements[0].index;
        const point = track.points[index];

        // Remove previous marker
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        // Add marker at clicked point
        const marker = L.marker([point.lat, point.lon], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        });

        marker.addTo(map);
        marker.bindPopup(
          `<strong>Distance:</strong> ${(point.distance / 1000).toFixed(2)} km<br/>
           <strong>Altitude:</strong> ${Math.round(point.elevation || 0)} m`
        ).openPopup();

        map.setView([point.lat, point.lon], map.getZoom());
        markerRef.current = marker;
      }
    },
  };

  // Cleanup marker on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current && map) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map]);

  const maxDistance = track.statistics.total_distance / 1000;

  // Handle export segment
  const handleExportSegment = async () => {
    setIsExporting(true);
    try {
      const blob = await gpxApi.exportSegment({
        track_points: track.points,
        start_km: segmentStart,
        end_km: segmentEnd,
        track_name: track.name || 'track'
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.name || 'track'}_segment_${segmentStart.toFixed(1)}km-${segmentEnd.toFixed(1)}km.gpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting segment:', error);
      alert('Erreur lors de l\'export du segment');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle detect climbs
  const handleDetectClimbs = async () => {
    setIsDetectingClimbs(true);
    try {
      const detectedClimbs = await gpxApi.detectClimbs({
        track_points: track.points,
        start_km: 0,
        end_km: maxDistance,
        track_name: track.name || 'track'
      });
      setClimbs(detectedClimbs);
    } catch (error) {
      console.error('Error detecting climbs:', error);
      alert('Erreur lors de la détection des montées');
    } finally {
      setIsDetectingClimbs(false);
    }
  };

  // Handle climb selection
  const handleSelectClimb = (climb: ClimbSegment) => {
    setSegmentStart(climb.start_km);
    setSegmentEnd(climb.end_km);

    // Scroll to segment explorer
    if (segmentExplorerRef.current) {
      segmentExplorerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Add temporary highlight effect
      segmentExplorerRef.current.classList.add('ring-4', 'ring-primary', 'ring-opacity-50');
      setTimeout(() => {
        segmentExplorerRef.current?.classList.remove('ring-4', 'ring-primary', 'ring-opacity-50');
      }, 2000);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Detect Climbs Button */}
      <div className="flex justify-end">
        <button
          onClick={handleDetectClimbs}
          disabled={isDetectingClimbs}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrendingUpIcon className="w-4 h-4" />
          {isDetectingClimbs ? 'Détection en cours...' : 'Détecter les montées'}
        </button>
      </div>

      {/* Climbs List */}
      {climbs.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <ClimbsList climbs={climbs} onSelectClimb={handleSelectClimb} />
        </div>
      )}

      {/* Chart */}
      <div className="w-full h-64">
        <Line data={data} options={options} />
      </div>

      {/* Segment Explorer */}
      <div
        ref={segmentExplorerRef}
        className="bg-secondary rounded-lg p-6 space-y-4 border border-border transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-foreground">Explorateur de segment</h3>
          <button
            onClick={handleExportSegment}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Export...' : 'Exporter GPX'}
          </button>
        </div>

        {/* Range Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Début du segment (km)
            </label>
            <input
              type="number"
              min={0}
              max={maxDistance}
              step={0.1}
              value={segmentStart.toFixed(1)}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (value < segmentEnd) {
                  setSegmentStart(value);
                }
              }}
              className="w-full px-3 py-2 bg-card border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="range"
              min={0}
              max={maxDistance}
              step={0.1}
              value={segmentStart}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (value < segmentEnd) {
                  setSegmentStart(value);
                }
              }}
              className="w-full mt-2 accent-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Fin du segment (km)
            </label>
            <input
              type="number"
              min={0}
              max={maxDistance}
              step={0.1}
              value={segmentEnd.toFixed(1)}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (value > segmentStart && value <= maxDistance) {
                  setSegmentEnd(value);
                }
              }}
              className="w-full px-3 py-2 bg-card border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="range"
              min={0}
              max={maxDistance}
              step={0.1}
              value={segmentEnd}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (value > segmentStart) {
                  setSegmentEnd(value);
                }
              }}
              className="w-full mt-2 accent-blue-500"
            />
          </div>
        </div>

        {/* Segment Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Distance</div>
            <div className="text-2xl font-bold text-blue-500">
              {segmentStats.distance.toFixed(2)} km
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Dénivelé positif (D+)</div>
            <div className="text-2xl font-bold text-green-500">
              {Math.round(segmentStats.elevationGain)} m
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Dénivelé négatif (D-)</div>
            <div className="text-2xl font-bold text-red-500">
              {Math.round(segmentStats.elevationLoss)} m
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Altitude</div>
            <div className="text-lg font-semibold text-foreground">
              {Math.round(segmentStats.startElevation)} → {Math.round(segmentStats.endElevation)} m
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
