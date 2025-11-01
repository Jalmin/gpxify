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
import { Track } from '@/types/gpx';

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

  return (
    <div className="w-full space-y-6">
      {/* Chart */}
      <div className="w-full h-64">
        <Line data={data} options={options} />
      </div>

      {/* Segment Explorer */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg">Explorateur de segment</h3>

        {/* Range Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full mt-2"
            />
          </div>
        </div>

        {/* Segment Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600">Distance</div>
            <div className="text-2xl font-bold text-blue-600">
              {segmentStats.distance.toFixed(2)} km
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600">Dénivelé positif (D+)</div>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(segmentStats.elevationGain)} m
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600">Dénivelé négatif (D-)</div>
            <div className="text-2xl font-bold text-red-600">
              {Math.round(segmentStats.elevationLoss)} m
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600">Altitude</div>
            <div className="text-lg font-semibold text-gray-700">
              {Math.round(segmentStats.startElevation)} → {Math.round(segmentStats.endElevation)} m
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
