import { Track } from '@/types/gpx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { formatDistance, formatElevation, formatDuration } from '@/lib/utils';
import { Mountain, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface TrackStatsProps {
  track: Track;
}

export function TrackStats({ track }: TrackStatsProps) {
  const { statistics } = track;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{track.name || 'Sans nom'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Distance</p>
              <p className="text-lg font-semibold">{formatDistance(statistics.total_distance)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">D+</p>
              <p className="text-lg font-semibold text-green-600">
                {formatElevation(statistics.total_elevation_gain)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">D-</p>
              <p className="text-lg font-semibold text-red-600">
                {formatElevation(statistics.total_elevation_loss)}
              </p>
            </div>
          </div>

          {statistics.duration && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="text-lg font-semibold">{formatDuration(statistics.duration)}</p>
              </div>
            </div>
          )}
        </div>

        {(statistics.max_elevation || statistics.min_elevation) && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              {statistics.max_elevation && (
                <div>
                  <span className="text-muted-foreground">Max: </span>
                  <span className="font-medium">{formatElevation(statistics.max_elevation)}</span>
                </div>
              )}
              {statistics.min_elevation && (
                <div>
                  <span className="text-muted-foreground">Min: </span>
                  <span className="font-medium">{formatElevation(statistics.min_elevation)}</span>
                </div>
              )}
              {statistics.avg_elevation && (
                <div>
                  <span className="text-muted-foreground">Moy: </span>
                  <span className="font-medium">{formatElevation(statistics.avg_elevation)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
