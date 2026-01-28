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
          borderColor: '#1a1a1a',
          backgroundColor: 'rgba(0, 0, 0, 0.08)',
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

    // First pass: assign stagger levels based on proximity to avoid overlaps
    // Labels within 25km of each other need different levels
    const OVERLAP_THRESHOLD_KM = 25;
    const assignedLevels: number[] = [];

    passageTimes.forEach((pt, index) => {
      const distanceKm = pt.station.distance_km;

      // Find which levels are already used by nearby stations
      const usedLevels = new Set<number>();
      for (let i = 0; i < index; i++) {
        const prevDist = passageTimes[i].station.distance_km;
        if (Math.abs(distanceKm - prevDist) < OVERLAP_THRESHOLD_KM) {
          usedLevels.add(assignedLevels[i]);
        }
      }

      // Find the first available level (0, 1, 2)
      let level = 0;
      while (usedLevels.has(level) && level < 3) {
        level++;
      }
      assignedLevels.push(level);
    });

    // Second pass: create annotations
    passageTimes.forEach((pt, index) => {
      const distanceKm = pt.station.distance_km;
      const emoji = getStationEmoji(pt.station.type);
      const timeStr = formatTime(pt.arrival);

      // Split station name: "AS01 Lizard point" -> ["AS01", "Lizard point"]
      const nameParts = pt.station.name.match(/^(AS\d+)\s+(.+)$/i);
      const stationNumber = nameParts ? nameParts[1] : '';
      const stationName = nameParts ? nameParts[2] : pt.station.name;

      // Vertical line at aid station
      annotations[`line-${index}`] = {
        type: 'line',
        xMin: distanceKm,
        xMax: distanceKm,
        borderColor: 'rgba(220, 38, 38, 0.9)',
        borderWidth: 2,
        borderDash: [8, 4],
      };

      // 3 levels of vertical stagger (each label ~70px with 4 lines)
      const level = assignedLevels[index];
      const yOffset = level * 75;

      // No horizontal offset - labels stay aligned with their lines
      const xOffset = 0;

      annotations[`label-${index}`] = {
        type: 'label',
        xValue: distanceKm,
        yValue: 'max',
        yAdjust: -15 - yOffset,
        xAdjust: xOffset,
        content: [
          `${emoji} ${stationNumber}`,
          stationName,
          `${distanceKm.toFixed(1)} km`,
          timeStr,
        ],
        font: {
          size: 10,
          weight: 'bold',
          family: 'system-ui, -apple-system, sans-serif',
        },
        color: '#b91c1c',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: { top: 3, bottom: 3, left: 5, right: 5 },
        borderRadius: 4,
        borderColor: 'rgba(220, 38, 38, 0.4)',
        borderWidth: 1,
      };
    });

    return annotations;
  }, [passageTimes, totalDistanceKm]);

  // Create sun annotations with night zones
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
    const parseTimeStr = (timeStr: string, daysOffset = 0): Date => {
      const [h, m] = timeStr.split(':').map(Number);
      const date = new Date(departureTime);
      date.setDate(date.getDate() + daysOffset);
      date.setHours(h, m, 0, 0);
      return date;
    };

    // Calculate km at a given time
    const getKmAtTime = (time: Date): number => {
      const diffMs = time.getTime() - departureTime.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      return hours * basePaceKmH;
    };

    // Get sunrise/sunset times for day 0 and day 1 (for multi-day races)
    const sunriseDay0 = parseTimeStr(sunTimes.sunrise, 0);
    const sunsetDay0 = parseTimeStr(sunTimes.sunset, 0);
    const sunriseDay1 = parseTimeStr(sunTimes.sunrise, 1);
    const sunsetDay1 = parseTimeStr(sunTimes.sunset, 1);

    // Determine night zones based on departure time
    const nightZones: { startKm: number; endKm: number }[] = [];

    // Check if we start before sunrise (night at the beginning)
    if (departureTime < sunriseDay0) {
      const sunriseKm = getKmAtTime(sunriseDay0);
      if (sunriseKm > 0 && sunriseKm <= totalDistanceKm) {
        nightZones.push({ startKm: 0, endKm: sunriseKm });
      } else if (sunriseKm > totalDistanceKm) {
        // Entire race is at night before sunrise
        nightZones.push({ startKm: 0, endKm: totalDistanceKm });
      }
    }

    // Night after sunset day 0 until sunrise day 1 (or end of race)
    const sunsetKm0 = getKmAtTime(sunsetDay0);
    const sunriseKm1 = getKmAtTime(sunriseDay1);

    if (sunsetKm0 >= 0 && sunsetKm0 < totalDistanceKm) {
      // Night zone from sunset to either next sunrise or end of race
      const nightEndKm = Math.min(sunriseKm1, totalDistanceKm);
      if (nightEndKm > sunsetKm0) {
        nightZones.push({ startKm: sunsetKm0, endKm: nightEndKm });
      }
    }

    // Night after sunset day 1 (for very long races)
    const sunsetKm1 = getKmAtTime(sunsetDay1);
    if (sunsetKm1 >= 0 && sunsetKm1 < totalDistanceKm && sunriseKm1 < sunsetKm1) {
      nightZones.push({ startKm: sunsetKm1, endKm: totalDistanceKm });
    }

    // Create box annotations for night zones
    nightZones.forEach((zone, i) => {
      annotations[`night-zone-${i}`] = {
        type: 'box',
        xMin: zone.startKm,
        xMax: zone.endKm,
        backgroundColor: 'rgba(30, 41, 59, 0.15)', // Slate-800 with transparency
        borderWidth: 0,
        drawTime: 'beforeDatasetsDraw',
      };
    });

    // Calculate visible sunrise/sunset positions for labels
    const sunriseKm = departureTime < sunriseDay0
      ? getKmAtTime(sunriseDay0)
      : (getKmAtTime(sunriseDay1) <= totalDistanceKm ? getKmAtTime(sunriseDay1) : null);

    const sunsetKm = getKmAtTime(sunsetDay0) >= 0 && getKmAtTime(sunsetDay0) <= totalDistanceKm
      ? getKmAtTime(sunsetDay0)
      : (getKmAtTime(sunsetDay1) >= 0 && getKmAtTime(sunsetDay1) <= totalDistanceKm
          ? getKmAtTime(sunsetDay1)
          : null);

    // Sunrise line and label
    if (sunriseKm !== null && sunriseKm > 0 && sunriseKm <= totalDistanceKm) {
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

    // Sunset line and label
    if (sunsetKm !== null && sunsetKm >= 0 && sunsetKm <= totalDistanceKm) {
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
          top: 240,    // Space for 3 levels of 4-line labels (~75px each)
          bottom: 20,  // Minimal bottom padding
          left: 10,
          right: 100,  // More space for labels near track end
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
          min: 0,
          max: totalDistanceKm,
          title: {
            display: true,
            text: 'Distance (km)',
            font: { weight: 'bold' as const },
            color: '#1a1a1a',
          },
          ticks: {
            maxTicksLimit: 15,
            callback: (value: string | number) => typeof value === 'number' ? value.toFixed(0) : value,
            color: '#1a1a1a',
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Altitude (m)',
            font: { weight: 'bold' as const },
            color: '#1a1a1a',
          },
          ticks: {
            color: '#1a1a1a',
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
    }),
    [aidStationAnnotations, sunAnnotations]
  );

  if (points.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-600">
        Chargement du profil...
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Taller chart for stacked labels on TOP */}
      <div className="h-[600px]">
        <Line data={chartData} options={options} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-sm justify-center text-gray-800">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-red-600 border-dashed border-red-600" />
          <span>Ravitaillement</span>
        </div>
        {sunTimes && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-slate-800/15 border border-slate-300 rounded" />
              <span>Nuit</span>
            </div>
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