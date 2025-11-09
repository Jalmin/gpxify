import { useState } from 'react';
import { X, GripVertical, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { FileUpload } from '../FileUpload';
import { Track } from '../../types/gpx';

interface GPXFileData {
  id: string;
  filename: string;
  tracks: Track[];
}

interface FileListProps {
  gpxFiles: GPXFileData[];
  gpxColors: Array<{
    bg: string;
    border: string;
    text: string;
    hex: string;
  }>;
  onRemoveFile: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  draggedIndex: number | null;
}

export function FileList({
  gpxFiles,
  gpxColors,
  onRemoveFile,
  onDragStart,
  onDragOver,
  onDragEnd,
  onFileSelect,
  isUploading,
  draggedIndex,
}: FileListProps) {
  const [showUploadSection, setShowUploadSection] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fichiers GPX</CardTitle>
        <CardDescription>Gérez vos traces et ajoutez-en de nouvelles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {gpxFiles.map((file, index) => {
            const colorScheme = gpxColors[index % gpxColors.length];
            return (
              <div
                key={file.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${colorScheme.border} ${colorScheme.bg} transition-all hover:scale-[1.02] cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div
                    className={`w-3 h-3 rounded-full ${colorScheme.text}`}
                    style={{ backgroundColor: colorScheme.hex }}
                  ></div>
                  <div>
                    <div className={`font-semibold ${colorScheme.text}`}>{file.filename}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                      <span>{file.tracks.length} trace(s)</span>
                      <span>·</span>
                      <span>
                        {(
                          file.tracks.reduce((sum, t) => sum + t.statistics.total_distance, 0) / 1000
                        ).toFixed(2)}{' '}
                        km
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="p-2 hover:bg-destructive/20 rounded-lg transition-colors group"
                >
                  <X className="w-5 h-5 text-muted-foreground group-hover:text-destructive" />
                </button>
              </div>
            );
          })}

          {/* Collapsible Upload Section */}
          <div className="pt-2 border-t border-border mt-4">
            <button
              onClick={() => setShowUploadSection(!showUploadSection)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Ajouter un fichier GPX</span>
              </div>
              {showUploadSection ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showUploadSection && (
              <div className="mt-3 p-4 bg-muted/30 rounded-lg">
                <FileUpload onFileSelect={onFileSelect} isUploading={isUploading} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
