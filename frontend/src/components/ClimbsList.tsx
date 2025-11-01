import { ClimbSegment } from '@/types/gpx';
import { TrendingUp, ArrowRight } from 'lucide-react';

interface ClimbsListProps {
  climbs: ClimbSegment[];
  onSelectClimb: (climb: ClimbSegment) => void;
}

export function ClimbsList({ climbs, onSelectClimb }: ClimbsListProps) {
  if (climbs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune montée détectée selon les critères.
      </div>
    );
  }

  const getClimbTypeLabel = (type: string) => {
    return type === 'type_a' ? 'Type A' : 'Type B';
  };

  const getClimbTypeColor = (type: string) => {
    return type === 'type_a' ? 'text-orange-500 bg-orange-500/10 border-orange-500' : 'text-purple-500 bg-purple-500/10 border-purple-500';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-500" />
        <h3 className="font-semibold text-lg text-foreground">
          {climbs.length} montée(s) détectée(s)
        </h3>
      </div>

      <div className="grid gap-3">
        {climbs.map((climb, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getClimbTypeColor(climb.climb_type)}`}>
                  {getClimbTypeLabel(climb.climb_type)}
                </span>
              </div>
              <button
                onClick={() => onSelectClimb(climb)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Analyser
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Début</div>
                <div className="font-semibold text-foreground">{climb.start_km.toFixed(1)} km</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fin</div>
                <div className="font-semibold text-foreground">{climb.end_km.toFixed(1)} km</div>
              </div>
              <div>
                <div className="text-muted-foreground">Distance</div>
                <div className="font-semibold text-foreground">{climb.distance_km.toFixed(2)} km</div>
              </div>
              <div>
                <div className="text-muted-foreground">D+</div>
                <div className="font-semibold text-green-500">{Math.round(climb.elevation_gain)} m</div>
              </div>
              <div>
                <div className="text-muted-foreground">Gradient moy.</div>
                <div className="font-semibold text-foreground">{climb.avg_gradient.toFixed(1)}%</div>
              </div>
            </div>

            {climb.elevation_loss > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                D- : {Math.round(climb.elevation_loss)} m
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
