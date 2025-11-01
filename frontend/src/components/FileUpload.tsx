import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
}

export function FileUpload({ onFileSelect, isUploading = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const gpxFile = files.find((f) => f.name.toLowerCase().endsWith('.gpx'));

    if (gpxFile) {
      onFileSelect(gpxFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background',
        isUploading && 'opacity-50 pointer-events-none'
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
        onChange={handleFileInput}
        className="hidden"
        disabled={isUploading}
      />

      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          <Upload className="w-8 h-8 text-primary" />
        </div>

        <div>
          <p className="text-lg font-medium mb-1">
            {isUploading ? 'Téléchargement en cours...' : 'Déposer un fichier GPX'}
          </p>
          <p className="text-sm text-muted-foreground">
            ou{' '}
            <button
              onClick={handleButtonClick}
              className="text-primary hover:underline"
              disabled={isUploading}
            >
              parcourir
            </button>
          </p>
        </div>

        <Button onClick={handleButtonClick} disabled={isUploading} variant="outline">
          Choisir un fichier
        </Button>
      </div>
    </div>
  );
}
