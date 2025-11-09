import { Navigation, TrendingUp, TrendingDown } from 'lucide-react';
import { StatCard } from '../StatCard';
import { FileList } from './FileList';
import { Track } from '../../types/gpx';

interface GPXFileData {
  id: string;
  filename: string;
  tracks: Track[];
}

interface StatsColumnProps {
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
  onRemoveFile: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  draggedIndex: number | null;
}

export function StatsColumn({
  gpxFiles,
  gpxColors,
  totalStats,
  onRemoveFile,
  onDragStart,
  onDragOver,
  onDragEnd,
  onFileSelect,
  isUploading,
  draggedIndex,
}: StatsColumnProps) {
  return (
    <div className="lg:col-span-1 space-y-4">
      {/* Aggregate Statistics */}
      <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
        <StatCard
          title="Distance totale"
          value={`${(totalStats.distance / 1000).toFixed(2)} km`}
          icon={Navigation}
          color="blue"
        />
        <StatCard
          title="Dénivelé positif total"
          value={`${Math.round(totalStats.elevationGain)} m`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Dénivelé négatif total"
          value={`${Math.round(totalStats.elevationLoss)} m`}
          icon={TrendingDown}
          color="red"
        />
      </div>

      {/* Files List */}
      <FileList
        gpxFiles={gpxFiles}
        gpxColors={gpxColors}
        onRemoveFile={onRemoveFile}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onFileSelect={onFileSelect}
        isUploading={isUploading}
        draggedIndex={draggedIndex}
      />
    </div>
  );
}
