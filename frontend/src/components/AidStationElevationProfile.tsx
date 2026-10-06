import { useEffect, useMemo, useRef, useState } from 'react';
import { AidStationSegment, Track } from '@/types/gpx';
import { getSegmentColor, segmentColorWithAlpha } from '@/constants/colors';
import { Line } from 'react-chartjs-2';
import { registerChartJsWithAnnotations } from '@/lib/chartSetup';
import { useDestroyChartsBeforeMount } from '@/hooks/useDestroyChartsBeforeMount';
import {
  labelEffectiveCenterKm,
  labelHalfWidthPx,
  labelXAdjust,
  requiredSeparationKm,
} from '@/utils/elevationLabelLayout';

registerChartJsWithAnnotations();

interface AidStationElevationProfileProps {
  track: Track;
  segments: AidStationSegment[];
}

function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0);
}

export function AidStationElevationProfile({
  track,
  segments,
}: AidStationElevationProfileProps) {
  useDestroyChartsBeforeMount();
  const containerRef = useRef<HTMLDivElement>(null);
  const [plotWidthPx, setPlotWidthPx] = useState(700);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setPlotWidthPx(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const totalDistanceKm = track.statistics.total_distance / 1000;

  const maxElevation = useMemo(
    () => Math.max(0, ...track.points.map((p) => p.elevation ?? 0)),
    [track.points],
  );

  const chartData = useMemo(() => {
    const datasets = segments.map((segment, index) => {
      const color = getSegmentColor(index);
      const startMeters = segment.start_km * 1000;
      const endMeters = segment.end_km * 1000;

      const segmentPoints = track.points.filter(
        (p) => p.distance >= startMeters && p.distance <= endMeters,
      );
      const sampled = downsamplePoints(segmentPoints, 300);

      return {
        label: `${segment.from_station} → ${segment.to_station}`,
        data: sampled.map((p) => ({
          x: p.distance / 1000,
          y: p.elevation ?? 0,
        })),
        fill: true,
        borderColor: color,
        backgroundColor: segmentColorWithAlpha(color, 0.3),
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      };
    });

    return { datasets };
  }, [track.points, segments]);

  const { boundaryAnnotations, chartPadding } = useMemo(() => {
    const annotations: Record<string, object> = {};
    const boundaries = new Map<number, string>();

    segments.forEach((segment) => {
      boundaries.set(segment.start_km, segment.from_station);
      boundaries.set(segment.end_km, segment.to_station);
    });

    const sortedBoundaries = [...boundaries.entries()].sort(([a], [b]) => a - b);

    const LABEL_ROW_HEIGHT = 36;
    const LABEL_Y_BASE = -10;
    const MAX_STAGGER_LEVELS = 5;

    const assignedLevels: number[] = [];
    sortedBoundaries.forEach(([km, name], index) => {
      const usedLevels = new Set<number>();
      const halfWidth = labelHalfWidthPx(name, km);
      const effKm = labelEffectiveCenterKm(km, name, plotWidthPx, totalDistanceKm);

      for (let i = 0; i < index; i++) {
        const [prevKm, prevName] = sortedBoundaries[i];
        const prevHalfWidth = labelHalfWidthPx(prevName, prevKm);
        const effPrevKm = labelEffectiveCenterKm(
          prevKm,
          prevName,
          plotWidthPx,
          totalDistanceKm,
        );
        const minGapKm = requiredSeparationKm(
          halfWidth,
          prevHalfWidth,
          plotWidthPx,
          totalDistanceKm,
        );
        if (Math.abs(effKm - effPrevKm) < minGapKm) {
          usedLevels.add(assignedLevels[i]);
        }
      }
      let level = 0;
      while (usedLevels.has(level) && level < MAX_STAGGER_LEVELS) level++;
      assignedLevels.push(level);
    });

    const maxLevel = assignedLevels.reduce((max, level) => Math.max(max, level), 0);
    const topPadding = 34 + maxLevel * LABEL_ROW_HEIGHT;

    sortedBoundaries.forEach(([km, name], index) => {
      const level = assignedLevels[index];
      const xAdjust = labelXAdjust(km, name, plotWidthPx, totalDistanceKm);

      annotations[`boundary-line-${index}`] = {
        type: 'line',
        xMin: km,
        xMax: km,
        borderColor: 'rgba(100, 116, 139, 0.6)',
        borderWidth: 1,
        borderDash: [4, 4],
      };
      annotations[`boundary-label-${index}`] = {
        type: 'label',
        xValue: km,
        yValue: maxElevation,
        yAdjust: LABEL_Y_BASE - level * LABEL_ROW_HEIGHT,
        xAdjust,
        textAlign: 'center',
        content: [name, `${km.toFixed(1)} km`],
        font: { size: 10, weight: 'bold' as const },
        color: '#475569',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: { top: 2, bottom: 2, left: 4, right: 4 },
        borderRadius: 3,
        borderColor: 'rgba(148, 163, 184, 0.5)',
        borderWidth: 1,
      };
    });

    return {
      boundaryAnnotations: annotations,
      chartPadding: { top: topPadding, bottom: 10, left: 8, right: 8 },
    };
  }, [segments, totalDistanceKm, maxElevation, plotWidthPx]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: chartPadding,
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          // Only show the hovered segment, not all datasets at the same x
          mode: 'nearest' as const,
          intersect: false,
          callbacks: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            title: (items: any) => `Distance : ${items[0].parsed.x.toFixed(1)} km`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label: (item: any) => {
              const label = item.dataset.label ?? 'Segment';
              return `${label} — ${Math.round(item.parsed.y)} m`;
            },
          },
        },
        annotation: {
          clip: false,
          annotations: boundaryAnnotations,
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
          },
          ticks: {
            maxTicksLimit: 12,
            callback: (value: string | number) =>
              typeof value === 'number' ? value.toFixed(0) : value,
          },
        },
        y: {
          display: true,
          max: maxElevation,
          title: {
            display: true,
            text: 'Altitude (m)',
            font: { weight: 'bold' as const },
          },
        },
      },
    }),
    [boundaryAnnotations, chartPadding, totalDistanceKm, maxElevation],
  );

  if (track.points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Aucune donnée d&apos;altitude disponible
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={containerRef} className="h-[400px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
