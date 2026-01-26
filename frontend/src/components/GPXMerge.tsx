import { useState, useRef } from 'react';
import { Upload, X, ArrowDownUp, Settings, Download, GripVertical } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Tooltip } from './ui/Tooltip';
import { cn } from '@/lib/utils';
import { GPXFileInput, MergeGPXRequest, MergeGPXResponse } from '@/types/gpx';
import { GPXMap } from './Map/GPXMap';
import { TrackStats } from './TrackStats';
import { gpxApi } from '@/services/api';

interface UploadedFile {
  file: File;
  content: string;
  id: string;
}

export function GPXMerge() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedResult, setMergedResult] = useState<MergeGPXResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mergeOptions, setMergeOptions] = useState({
    gap_threshold_seconds: 300,
    interpolate_gaps: true, // Par défaut : ligne droite entre les gaps
    sort_by_time: false, // Par défaut : ordre manuel (pas de tri automatique)
  });
  const [mergedTrackName, setMergedTrackName] = useState('Merged Track');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const gpxFiles = droppedFiles.filter((f) => f.name.toLowerCase().endsWith('.gpx'));

    await addFiles(gpxFiles);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await addFiles(Array.from(selectedFiles));
    }
  };

  const addFiles = async (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = [];

    for (const file of newFiles) {
      const content = await file.text();
      uploadedFiles.push({
        file,
        content,
        id: crypto.randomUUID()
      });
    }

    setFiles((prev) => [...prev, ...uploadedFiles]);
    setMergedResult(null); // Reset preview when adding files
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedResult(null);
  };

  // Drag & Drop for reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);

    setFiles(newFiles);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Au moins 2 fichiers GPX sont nécessaires pour fusionner');
      return;
    }

    setIsMerging(true);

    try {
      const gpxFileInputs: GPXFileInput[] = files.map((f) => ({
        filename: f.file.name,
        content: f.content,
      }));

      const request: MergeGPXRequest = {
        files: gpxFileInputs,
        options: mergeOptions,
        merged_track_name: mergedTrackName,
      };

      const result = await gpxApi.mergeFiles(request);
      setMergedResult(result);
    } catch (error) {
      console.error('Merge error:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la fusion');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (!mergedResult?.merged_gpx) return;

    const blob = new Blob([mergedResult.merged_gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mergedTrackName.replace(/\s+/g, '_')}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fusion de GPX</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assemblez plusieurs fichiers GPX dans l'ordre souhaité
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Options
        </Button>
      </div>

      {showSettings && (
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold">Options de fusion</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nom de la trace fusionnée
            </label>
            <input
              type="text"
              value={mergedTrackName}
              onChange={(e) => setMergedTrackName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="interpolate-gaps"
              checked={mergeOptions.interpolate_gaps}
              onChange={(e) =>
                setMergeOptions((prev) => ({ ...prev, interpolate_gaps: e.target.checked }))
              }
              className="w-4 h-4"
            />
            <label htmlFor="interpolate-gaps" className="text-sm flex-1">
              Ligne droite entre les trous (recommandé)
            </label>
            <Tooltip content="Crée une ligne droite pour relier les segments séparés par un trou. Utile si votre GPS s'est arrêté puis redémarré." />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sort-by-time"
              checked={mergeOptions.sort_by_time}
              onChange={(e) =>
                setMergeOptions((prev) => ({ ...prev, sort_by_time: e.target.checked }))
              }
              className="w-4 h-4"
            />
            <label htmlFor="sort-by-time" className="text-sm flex-1">
              Trier automatiquement par horodatage (ignorer l'ordre manuel)
            </label>
            <Tooltip content="Trie les points GPS par date/heure au lieu de suivre l'ordre des fichiers. Activez si vos fichiers ne sont pas dans le bon ordre chronologique." />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium">
                Seuil de détection des trous (secondes)
              </label>
              <Tooltip content="Durée minimale entre deux points GPS pour qu'un trou soit détecté. 300 secondes (5 minutes) est une bonne valeur par défaut." />
            </div>
            <input
              type="number"
              value={mergeOptions.gap_threshold_seconds}
              onChange={(e) =>
                setMergeOptions((prev) => ({
                  ...prev,
                  gap_threshold_seconds: parseInt(e.target.value),
                }))
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
              min="0"
              step="60"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si l'écart entre deux segments dépasse ce seuil, un trou sera détecté
            </p>
          </div>
        </Card>
      )}

      {/* Upload Area */}
      {files.length === 0 || files.length < 10 ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>

            <div>
              <p className="text-lg font-medium mb-1">
                Déposer plusieurs fichiers GPX ici
              </p>
              <p className="text-sm text-muted-foreground">
                ou{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline"
                >
                  parcourir
                </button>
              </p>
            </div>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              Choisir des fichiers
            </Button>
          </div>
        </div>
      ) : null}

      {/* Uploaded Files List with Drag & Drop Reordering */}
      {files.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">
                Fichiers sélectionnés ({files.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Glissez-déposez pour réorganiser l'ordre de fusion
              </p>
            </div>
            {files.length < 10 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Ajouter +
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((f, index) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOverItem(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-2 p-3 bg-muted/50 rounded cursor-move transition-all",
                  draggedIndex === index && "opacity-50"
                )}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-sm truncate flex-1">{f.file.name}</span>
                <button
                  onClick={() => removeFile(f.id)}
                  className="ml-2 text-destructive hover:text-destructive/80 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
            <p><strong>Règles de fusion :</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Les fichiers sont fusionnés dans l'ordre de la liste (1er → 2ème → ...)</li>
              <li>En cas de trou : ligne droite entre les segments</li>
              <li>En cas de chevauchement : priorité au fichier le plus haut</li>
            </ul>
          </div>

          <Button
            onClick={handleMerge}
            disabled={files.length < 2 || isMerging}
            className="w-full mt-4 gap-2"
          >
            <ArrowDownUp className="w-4 h-4" />
            {isMerging ? 'Fusion en cours...' : 'Fusionner les fichiers'}
          </Button>
        </Card>
      )}

      {/* Merge Result */}
      {mergedResult && (
        <div className="space-y-6">
          {/* Warnings */}
          {mergedResult.warnings.length > 0 && (
            <Card className="p-4 space-y-2">
              <h3 className="font-semibold text-sm">Informations</h3>
              {mergedResult.warnings.map((warning, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  {warning}
                </p>
              ))}
            </Card>
          )}

          {/* Stats */}
          {mergedResult.data && mergedResult.data.tracks.length > 0 && (
            <TrackStats track={mergedResult.data.tracks[0]} />
          )}

          {/* Map */}
          {mergedResult.data && mergedResult.data.tracks.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Aperçu de la trace fusionnée</h3>
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="w-4 h-4" />
                  Télécharger GPX
                </Button>
              </div>
              <div className="h-96 rounded-lg overflow-hidden">
                <GPXMap tracks={mergedResult.data.tracks} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
