import { useRef, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { validateGPXFile, formatValidationError } from '@/utils/gpxValidator';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
}

export function FileUpload({ onFileSelect, isUploading = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
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

  const handleFileValidation = async (file: File) => {
    setValidationError(null);
    setIsValidating(true);

    try {
      const result = await validateGPXFile(file);

      if (!result.valid) {
        setValidationError(formatValidationError(result));
        return;
      }

      // Show warnings if any, but proceed
      if (result.warnings && result.warnings.length > 0) {
        console.warn('GPX validation warnings:', result.warnings);
      }

      onFileSelect(file);
    } catch (error) {
      setValidationError('Erreur lors de la validation du fichier');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const gpxFile = files.find((f) => f.name.toLowerCase().endsWith('.gpx'));

    if (gpxFile) {
      handleFileValidation(gpxFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileValidation(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const isLoading = isUploading || isValidating;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background',
          isLoading && 'opacity-50 pointer-events-none',
          validationError && 'border-destructive'
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
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>

          <div>
            <p className="text-lg font-medium mb-1">
              {isValidating ? 'Validation en cours...' : isUploading ? 'Téléchargement en cours...' : 'Déposer un fichier GPX'}
            </p>
            <p className="text-sm text-muted-foreground">
              ou{' '}
              <button
                onClick={handleButtonClick}
                className="text-primary hover:underline"
                disabled={isLoading}
              >
                parcourir
              </button>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Taille maximale : 25 MB
            </p>
          </div>

          <Button onClick={handleButtonClick} disabled={isLoading} variant="outline">
            Choisir un fichier
          </Button>
        </div>
      </div>

      {validationError && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="text-sm text-destructive">
            <p className="font-medium">Fichier invalide</p>
            <p className="mt-1">{validationError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
