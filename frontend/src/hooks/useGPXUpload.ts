/**
 * Custom hook for handling GPX file uploads with client-side validation
 */
import { useState } from 'react';
import { gpxApi } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { validateGPXFile, formatValidationError } from '../utils/gpxValidator';
import type { GPXData } from '../types/gpx';

interface GPXFileData extends GPXData {
  id: string;
  uploadedAt: Date;
}

export const useGPXUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const addFile = useAppStore((state) => state.addFile);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setWarning(null);

    try {
      // Client-side validation BEFORE uploading
      const validationResult = await validateGPXFile(file);

      if (!validationResult.valid) {
        setError(formatValidationError(validationResult));
        setIsUploading(false);
        return;
      }

      // Show warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        setWarning(validationResult.warnings.join('\n'));
      }

      // Proceed with upload
      const response = await gpxApi.uploadGPX(file);

      if (response.success && response.data) {
        const newFile: GPXFileData = {
          ...response.data,
          id: response.file_id || crypto.randomUUID(),
          uploadedAt: new Date(),
        };
        addFile(newFile);
      } else {
        setError(response.message || 'Erreur lors du téléchargement');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      let errorMessage = 'Erreur lors du téléchargement du fichier';

      if (err.response?.status === 413) {
        errorMessage = 'Fichier trop volumineux. La taille maximale est de 25 MB.';
      } else if (err.response?.status === 415) {
        errorMessage = 'Format de fichier non supporté. Veuillez uploader un fichier GPX valide.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.detail || 'Fichier GPX invalide. Vérifiez que votre fichier contient des données GPS valides.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer dans quelques instants.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    handleFileSelect,
    isUploading,
    error,
    warning,
    clearError: () => setError(null),
    clearWarning: () => setWarning(null),
  };
};
