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

  // Prepare chart data - using {x, y} format for linear scale
  const chartData = useMemo(() => {
    return {
      datasets: [
        {
          label: 'Altitude (m)',
          data: sampledPoints.map((p) => ({ x: p.distance, y: p.elevation })),
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

      // Vertical line at aid station - full height, visible
      // Use numeric values for linear scale positioning
      annotations[`line-${index}`] = {
        type: 'line',
        xMin: distanceKm,
        xMax: distanceKm,
        borderColor: 'rgba(220, 38, 38, 0.9)',
        borderWidth: 2,
        borderDash: [8, 4],
      };

      // Check if label is in the last 15% of track (needs left alignment)
      const isNearEnd = distanceKm > totalDistanceKm * 0.85;

      // Alternate labels TOP and BOTTOM to avoid overlap
      const isTop = index % 2 === 0;

      // More aggressive vertical stagger (4 levels instead of 2)
      const staggerLevel = index % 4;
      const baseOffset = [0, 35, 15, 50][staggerLevel];

      annotations[`label-${index}`] = {
        type: 'label',
        xValue: distanceKm,
        yValue: isTop ? 'max' : 'min',
        yAdjust: isTop ? (-20 - baseOffset) : (20 + baseOffset),
        // Shift labels near the end to the left
        xAdjust: isNearEnd ? -80 : 0,
        content: [
          `${emoji} ${pt.station.name}`,
          `${distanceKm.toFixed(1)}km | ${timeStr}`,
        ],
        font: {
          size: 14,
          weight: 'bold',
          family: 'system-ui, -apple-system, sans-serif',
        },
        color: '#b91c1c',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: { top: 6, bottom: 6, left: 8, right: 8 },
        borderRadius: 6,
        borderColor: 'rgba(220, 38, 38, 0.4)',
        borderWidth: 1,
      };
    });

    return annotations;
  }, [passageTimes, totalDistanceKm]);

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
        xMin: sunriseKm,
        xMax: sunriseKm,
        borderColor: 'rgba(251, 191, 36, 1)',
        borderWidth: 4,
      };
      annotations['sunrise-label'] = {
        type: 'label',
        xValue: sunriseKm,
        yValue: 'max',
        yAdjust: -80,
        content: [`☀️ LEVER ${sunTimes.sunrise.slice(0, 5)}`],
        font: { size: 14, weight: 'bold' },
        color: '#b45309',
        backgroundColor: 'rgba(254, 243, 199, 0.98)',
        padding: { top: 6, bottom: 6, left: 10, right: 10 },
        borderRadius: 6,
        borderColor: 'rgba(251, 191, 36, 0.8)',
        borderWidth: 2,
      };
    }

    if (sunsetKm !== null) {
      annotations['sunset-line'] = {
        type: 'line',
        xMin: sunsetKm,
        xMax: sunsetKm,
        borderColor: 'rgba(249, 115, 22, 1)',
        borderWidth: 4,
      };
      annotations['sunset-label'] = {
        type: 'label',
        xValue: sunsetKm,
        yValue: 'max',
        yAdjust: -110,
        content: [`🌅 COUCHER ${sunTimes.sunset.slice(0, 5)}`],
        font: { size: 14, weight: 'bold' },
        color: '#c2410c',
        backgroundColor: 'rgba(255, 237, 213, 0.98)',
        padding: { top: 6, bottom: 6, left: 10, right: 10 },
        borderRadius: 6,
        borderColor: 'rgba(249, 115, 22, 0.8)',
        borderWidth: 2,
      };
    }

    return annotations;
  }, [sunTimes, departureTime, totalDistanceKm, passageTimes]);

  // Chart options with annotations
  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      // Add padding for labels outside the chart area
      layout: {
        padding: {
          top: 120,    // Space for labels above
          bottom: 80,  // Space for labels below
          left: 10,
          right: 60,   // Space for right-side labels
        },
      },
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
            title: (items: any) => `Distance: ${items[0].parsed.x.toFixed(1)} km`,
            label: (item: any) => `Altitude: ${Math.round(item.parsed.y)} m`,
          },
        },
        annotation: {
          clip: false, // Allow annotations outside chart area
          annotations: {
            ...aidStationAnnotations,
            ...sunAnnotations,
          },
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          display: true,
          title: {
            display: true,
            text: 'Distance (km)',
            font: { weight: 'bold' as const },
          },
          ticks: {
            maxTicksLimit: 15,
            callback: (value: string | number) => typeof value === 'number' ? value.toFixed(0) : value,
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
      {/* Taller chart for labels on TOP and BOTTOM */}
      <div className="h-[500px]">
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