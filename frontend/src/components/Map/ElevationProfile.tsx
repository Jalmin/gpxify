import { useEffect, useRef } from 'react';
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

export function ElevationProfile({ track, map }: ElevationProfileProps) {
  const markerRef = useRef<L.Marker | null>(null);

  // Prepare data for chart
  const distances = track.points.map(p => (p.distance / 1000).toFixed(2)); // km
  const elevations = track.points.map(p => p.elevation || 0);

  const data = {
    labels: distances,
    datasets: [
      {
        label: 'Altitude (m)',
        data: elevations,
        fill: true,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
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

  return (
    <div className="w-full h-64">
      <Line data={data} options={options} />
    </div>
  );
}
