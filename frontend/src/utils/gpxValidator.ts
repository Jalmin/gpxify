/**
 * Client-side GPX file validation utilities
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = ['.gpx'];
const GPX_MIME_TYPES = [
  'application/gpx+xml',
  'application/xml',
  'text/xml',
  'application/octet-stream', // Some systems don't recognize .gpx
];

/**
 * Validate file size
 */
export const validateFileSize = (file: File): ValidationResult => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Taille maximale : 25 MB.`,
    };
  }
  return { valid: true };
};

/**
 * Validate file extension
 */
export const validateFileExtension = (file: File): ValidationResult => {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Extension non supportée "${extension}". Veuillez uploader un fichier .gpx`,
    };
  }
  return { valid: true };
};

/**
 * Validate file MIME type
 */
export const validateFileMimeType = (file: File): ValidationResult => {
  const warnings: string[] = [];

  // MIME type check is not strict because browsers handle .gpx differently
  if (file.type && !GPX_MIME_TYPES.includes(file.type)) {
    warnings.push(
      `Type MIME inhabituel: ${file.type}. Le fichier sera quand même traité.`
    );
  }

  return { valid: true, warnings };
};

/**
 * Validate GPX file structure by parsing the beginning
 */
export const validateGPXStructure = async (file: File): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;

      // Check for XML declaration
      if (!content.trim().startsWith('<?xml')) {
        resolve({
          valid: false,
          error: 'Le fichier ne semble pas être un fichier XML valide.',
        });
        return;
      }

      // Check for GPX root element
      if (!content.includes('<gpx')) {
        resolve({
          valid: false,
          error: 'Le fichier ne contient pas de balise <gpx>. Ce n\'est pas un fichier GPX valide.',
        });
        return;
      }

      // Check for track or waypoint data
      const hasTrack = content.includes('<trk');
      const hasRoute = content.includes('<rte');
      const hasWaypoints = content.includes('<wpt');

      if (!hasTrack && !hasRoute && !hasWaypoints) {
        resolve({
          valid: false,
          error: 'Le fichier GPX ne contient aucune trace, route ou point d\'intérêt.',
        });
        return;
      }

      const warnings: string[] = [];

      // Warn if no tracks (only waypoints/routes)
      if (!hasTrack && (hasRoute || hasWaypoints)) {
        warnings.push(
          'Le fichier contient des routes ou waypoints mais pas de traces (tracks).'
        );
      }

      resolve({ valid: true, warnings });
    };

    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Erreur lors de la lecture du fichier.',
      });
    };

    // Read only first 50KB for performance
    const blob = file.slice(0, 50 * 1024);
    reader.readAsText(blob);
  });
};

/**
 * Complete GPX file validation
 */
export const validateGPXFile = async (file: File): Promise<ValidationResult> => {
  // 1. File size
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) return sizeCheck;

  // 2. Extension
  const extCheck = validateFileExtension(file);
  if (!extCheck.valid) return extCheck;

  // 3. MIME type (non-blocking)
  const mimeCheck = validateFileMimeType(file);
  const warnings = [...(mimeCheck.warnings || [])];

  // 4. GPX structure
  const structureCheck = await validateGPXStructure(file);
  if (!structureCheck.valid) return structureCheck;

  if (structureCheck.warnings) {
    warnings.push(...structureCheck.warnings);
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Format validation error for user display
 */
export const formatValidationError = (result: ValidationResult): string => {
  if (result.valid) {
    return result.warnings?.join('\n') || '';
  }
  return result.error || 'Fichier invalide';
};
