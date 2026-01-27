import { useMemo } from 'react';
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
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line } from 'react-chartjs-2';
import { RaceAidStation, SunTimes } from '@/types/ptp';

// Register ChartJS components including annotation plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

interface PassageTime {
  station: RaceAidStation;
  arrival: Date;
  timeFromStart: number;
}

interface PTPElevationProfileProps {
  /** GPX content as string */
  gpxContent: string;
  /** Aid stations with passage times */
  passageTimes: PassageTime[];
  /** Departure time (optional) */
  departureTime?: Date;
  /** Sun times (optional) */
  sunTimes?: SunTimes | null;
  /** Total distance in km */
  totalDistanceKm: number;
}

interface ParsedPoint {
  distance: number; // km
  elevation: number; // m
  time?: Date;
}

/**
 * Parse GPX content to extract elevation data
 */
function parseGpxContent(gpxContent: string): ParsedPoint[] {
  const points: ParsedPoint[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxContent, 'text/xml');
    const trkpts = doc.querySelectorAll('trkpt');

    let totalDistance = 0;
    let prevLat: number | null = null;
    let prevLon: number | null = null;

    trkpts.forEach((trkpt) => {
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lon = parseFloat(trkpt.getAttribute('lon') || '0');
      const eleNode = trkpt.querySelector('ele');
      const elevation = eleNode ? parseFloat(eleNode.textContent || '0') : 0;

      // Calculate distance using Haversine formula
      if (prevLat !== null && prevLon !== null) {
        const R = 6371; // Earth's radius in km
        const dLat = ((lat - prevLat) * Math.PI) / 180;
        const dLon = ((lon - prevLon) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((prevLat * Math.PI) / 180) *
            Math.cos((lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;
      }

      points.push({
        distance: totalDistance,
        elevation,
      });

      prevLat = lat;
      prevLon = lon;
    });
  } catch (e) {
    console.error('Error parsing GPX:', e);
  }

  return points;
}

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get icon for station type
 */
function getStationEmoji(type: string): string {
  switch (type) {
    case 'eau':
      return '💧';
    case 'bouffe':
      return '🍽️';
    case 'assistance':
      return '👥';
    default:
      return '📍';
  }
}

export function PTPElevationProfile({
  gpxContent,
  passageTimes,
  departureTime,
  sunTimes,
  totalDistanceKm,
}: PTPElevationProfileProps) {
  // Parse GPX data
  const points = useMemo(() => parseGpxContent(gpxContent), [gpxContent]);

  // Downsample points for performance (max 500 points)
  const sampledPoints = useMemo(() => {
    if (points.length <= 500) return points;
    const step = Math.ceil(points.length / 500);
    return points.filter((_, i) => i % step === 0);
  }, [points]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const distances = sampledPoints.map((p) => p.distance.toFixed(1));
    const elevations = sampledPoints.map((p) => p.elevation);

    return {
      labels: distances,
      datasets: [
        {
          label: 'Altitude (m)',
          data: elevations,
          fill: true,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ],
    };
  }, [sampledPoints]);

  // Create annotations for aid stations
  const aidStationAnnotations = useMemo(() => {
    const annotations: Record<string, any> = {};

    passageTimes.forEach((pt, index) => {
      const distanceKm = pt.station.distance_km;
      const emoji = getStationEmoji(pt.station.type);
      const timeStr = formatTime(pt.arrival);

      // Vertical line at aid station - full height, more visible
      annotations[`line-${index}`] = {
        type: 'line',
        xMin: distanceKm.toFixed(1),
        xMax: distanceKm.toFixed(1),
        borderColor: 'rgba(239, 68, 68, 0.8)',
        borderWidth: 2,
        borderDash: [6, 4],
      };

      // Label with station info - BIGGER and more readable
      // Alternate between top and slightly lower to avoid overlap
      const yOffset = (index % 3) * 35; // 3 levels of staggering

      annotations[`label-${index}`] = {
        type: 'label',
        xValue: distanceKm.toFixed(1),
        yValue: 'max',
        yAdjust: -15 - yOffset,
        content: [
          `${emoji} ${pt.station.name}`,
          `${distanceKm}km | ${timeStr}`,
        ],
        font: {
          size: 12,
          weight: 'bold',
          family: 'system-ui, sans-serif',
        },
        color: '#dc2626',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: { top: 4, bottom: 4, left: 6, right: 6 },
        borderRadius: 4,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderWidth: 1,
      };
    });

    return annotations;
  }, [passageTimes]);

  // Create sun annotations
  const sunAnnotations = useMemo(() => {
    if (!sunTimes || !departureTime) return {};

    const annotations: Record<string, any> = {};

    // Use average pace from passage times if available, otherwise default 5km/h
    let basePaceKmH = 5;
    if (passageTimes.length > 1) {
      const lastStation = passageTimes[passageTimes.length - 1];
      const hoursToLast = lastStation.timeFromStart / 60;
      if (hoursToLast > 0) {
        basePaceKmH = lastStation.station.distance_km / hoursToLast;
      }
    }

    // Parse sun times (format: "HH:MM:SS")
    const parseTimeStr = (timeStr: string, nextDay = false): Date => {
      const [h, m] = timeStr.split(':').map(Number);
      const date = new Date(departureTime);
      if (nextDay) {
        date.setDate(date.getDate() + 1);
      }
      date.setHours(h, m, 0, 0);
      return date;
    };

    const sunriseTime = parseTimeStr(sunTimes.sunrise);
    let sunsetTime = parseTimeStr(sunTimes.sunset);

    // If sunset is before departure, it's next day's sunset
    if (sunsetTime.getTime() < departureTime.getTime()) {
      sunsetTime = parseTimeStr(sunTimes.sunset, true);
    }

    // Calculate km at sunrise/sunset
    const getKmAtTime = (time: Date): number | null => {
      const diffMs = time.getTime() - departureTime.getTime();
      if (diffMs < 0) return null;
      const hours = diffMs / (1000 * 60 * 60);
      const km = hours * basePaceKmH;
      return km <= totalDistanceKm ? km : null;
    };

    const sunriseKm = getKmAtTime(sunriseTime);
    const sunsetKm = getKmAtTime(sunsetTime);

    if (sunriseKm !== null && sunriseKm > 0) {
      annotations['sunrise-line'] = {
        type: 'line',
        xMin: sunriseKm.toFixed(1),
        xMax: sunriseKm.toFixed(1),
        borderColor: 'rgba(251, 191, 36, 0.9)',
        borderWidth: 3,
      };
      annotations['sunrise-label'] = {
        type: 'label',
        xValue: sunriseKm.toFixed(1),
        yValue: 'min',
        yAdjust: 25,
        content: [`☀️ Lever ${sunTimes.sunrise.slice(0, 5)}`],
        font: { size: 12, weight: 'bold' },
        color: '#d97706',
        backgroundColor: 'rgba(255, 251, 235, 0.95)',
        padding: { top: 4, bottom: 4, left: 6, right: 6 },
        borderRadius: 4,
        borderColor: 'rgba(251, 191, 36, 0.5)',
        borderWidth: 1,
      };
    }

    if (sunsetKm !== null) {
      annotations['sunset-line'] = {
        type: 'line',
        xMin: sunsetKm.toFixed(1),
        xMax: sunsetKm.toFixed(1),
        borderColor: 'rgba(249, 115, 22, 0.9)',
        borderWidth: 3,
      };
      annotations['sunset-label'] = {
        type: 'label',
        xValue: sunsetKm.toFixed(1),
        yValue: 'min',
        yAdjust: 50,
        content: [`🌅 Coucher ${sunTimes.sunset.slice(0, 5)}`],
        font: { size: 12, weight: 'bold' },
        color: '#ea580c',
        backgroundColor: 'rgba(255, 247, 237, 0.95)',
        padding: { top: 4, bottom: 4, left: 6, right: 6 },
        borderRadius: 4,
        borderColor: 'rgba(249, 115, 22, 0.5)',
        borderWidth: 1,
      };
    }

    return annotations;
  }, [sunTimes, departureTime, totalDistanceKm, passageTimes]);

  // Chart options with annotations
  const options = useMemo(
    () => ({
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
            title: (items: any) => `Distance: ${items[0].label} km`,
            label: (item: any) => `Altitude: ${Math.round(item.parsed.y)} m`,
          },
        },
        annotation: {
          annotations: {
            ...aidStationAnnotations,
            ...sunAnnotations,
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Distance (km)',
            font: { weight: 'bold' as const },
          },
          ticks: {
            maxTicksLimit: 15,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Altitude (m)',
            font: { weight: 'bold' as const },
          },
        },
      },
    }),
    [aidStationAnnotations, sunAnnotations]
  );

  if (points.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        Chargement du profil...
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Taller chart for better label visibility */}
      <div className="h-[400px]">
        <Line data={chartData} options={options} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-sm justify-center">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-red-500 border-dashed border-red-500" />
          <span>Ravitaillement</span>
        </div>
        {sunTimes && (
          <>
            <div className="flex items-center gap-1">
              <span>☀️</span>
              <span>Lever du soleil</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🌅</span>
              <span>Coucher du soleil</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}