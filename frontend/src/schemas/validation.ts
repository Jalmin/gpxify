/**
 * Zod validation schemas for frontend forms
 */
import { z } from 'zod';

/**
 * GPX File Upload Validation
 */
export const GPXFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, {
      message: 'Le fichier est vide',
    })
    .refine((file) => file.size <= 26214400, {
      message: 'Le fichier est trop volumineux (max 25MB)',
    })
    .refine(
      (file) => {
        const extension = file.name.toLowerCase().split('.').pop();
        return extension === 'gpx';
      },
      {
        message: 'Le fichier doit être au format .gpx',
      }
    ),
});

export type GPXFileInput = z.infer<typeof GPXFileSchema>;

/**
 * Aid Station Validation
 */
export const AidStationSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom est trop long (max 100 caractères)')
    .trim(),
  distance_km: z.coerce
    .number()
    .min(0, 'La distance ne peut pas être négative')
    .max(1000, 'La distance est trop grande (max 1000km)'),
});

export type AidStationInput = z.infer<typeof AidStationSchema>;

/**
 * Trail Planner Configuration Validation
 * Mirrors the backend Pydantic TrailPlannerConfig constraints.
 */
export const TrailPlannerConfigSchema = z.object({
  flat_pace_kmh: z
    .number()
    .gt(0, "L'allure sur plat doit être > 0 km/h")
    .lte(30, "L'allure sur plat ne peut pas dépasser 30 km/h"),
  climb_penalty_min_per_100m: z
    .number()
    .gte(0, 'La pénalité de montée doit être ≥ 0')
    .lte(30, 'La pénalité de montée ne peut pas dépasser 30 min/100m'),
  descent_bonus_min_per_100m: z
    .number()
    .gte(0, 'Le bonus descente doit être ≥ 0')
    .lte(20, 'Le bonus descente ne peut pas dépasser 20 min/100m'),
  fatigue_percent_per_interval: z
    .number()
    .gte(0, 'Le facteur fatigue doit être ≥ 0')
    .lte(50, 'Le facteur fatigue ne peut pas dépasser 50%'),
  fatigue_interval_km: z
    .number()
    .gt(0, "L'intervalle fatigue doit être > 0 km"),
});

export type TrailPlannerConfigInput = z.infer<typeof TrailPlannerConfigSchema>;

/**
 * Calc config discriminated by `calc_mode` — matches backend API contract.
 */
export const CalcConfigSchema = z.discriminatedUnion('calc_mode', [
  z.object({ calc_mode: z.literal('naismith') }),
  z.object({
    calc_mode: z.literal('constant_pace'),
    constant_pace_kmh: z
      .number()
      .gt(0, "L'allure doit être > 0 km/h")
      .lte(30, "L'allure ne peut pas dépasser 30 km/h"),
  }),
  z.object({
    calc_mode: z.literal('trail_planner'),
    trail_planner_config: TrailPlannerConfigSchema,
  }),
]);

export type CalcConfigInput = z.infer<typeof CalcConfigSchema>;

/**
 * Aid Station Table Configuration Validation
 */
export const AidStationTableConfigSchema = z.object({
  calcConfig: CalcConfigSchema,
  aidStations: z
    .array(AidStationSchema)
    .min(1, 'Au moins un ravitaillement est requis')
    .max(50, 'Maximum 50 ravitaillements'),
});

export type AidStationTableConfigInput = z.infer<typeof AidStationTableConfigSchema>;

/**
 * Contact Form Validation
 */
export const ContactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long (max 100 caractères)')
    .trim(),
  email: z
    .string()
    .email('Adresse email invalide')
    .max(255, 'Email trop long'),
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(2000, 'Le message est trop long (max 2000 caractères)')
    .trim(),
});

export type ContactFormInput = z.infer<typeof ContactFormSchema>;

/**
 * Race Recovery Form Validation
 */
export const RaceRecoverySchema = z.object({
  officialGpx: z
    .instanceof(File)
    .refine((file) => file.size > 0, {
      message: 'Le fichier GPX officiel est requis',
    })
    .refine((file) => file.size <= 26214400, {
      message: 'Le fichier est trop volumineux (max 25MB)',
    })
    .refine(
      (file) => {
        const extension = file.name.toLowerCase().split('.').pop();
        return extension === 'gpx';
      },
      {
        message: 'Le fichier doit être au format .gpx',
      }
    ),
  incompleteGpx: z
    .instanceof(File)
    .refine((file) => file.size > 0, {
      message: 'Le fichier GPX incomplet est requis',
    })
    .refine((file) => file.size <= 26214400, {
      message: 'Le fichier est trop volumineux (max 25MB)',
    })
    .refine(
      (file) => {
        const extension = file.name.toLowerCase().split('.').pop();
        return extension === 'gpx';
      },
      {
        message: 'Le fichier doit être au format .gpx',
      }
    ),
  officialTime: z
    .string()
    .regex(
      /^(\d{1,2}):([0-5]\d):([0-5]\d)$|^([0-5]?\d):([0-5]\d)$/,
      'Format invalide. Utilisez HH:MM:SS ou MM:SS'
    ),
});

export type RaceRecoveryInput = z.infer<typeof RaceRecoverySchema>;

/**
 * GPX Merge Configuration Validation
 */
export const GPXMergeSchema = z.object({
  files: z
    .array(
      z.object({
        id: z.string(),
        filename: z.string(),
      })
    )
    .min(2, 'Sélectionnez au moins 2 fichiers à fusionner')
    .max(10, 'Maximum 10 fichiers peuvent être fusionnés'),
  mergedFilename: z
    .string()
    .min(1, 'Le nom du fichier est requis')
    .max(255, 'Le nom est trop long (max 255 caractères)')
    .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Le nom ne doit contenir que des lettres, chiffres, espaces, tirets et underscores')
    .trim(),
});

export type GPXMergeInput = z.infer<typeof GPXMergeSchema>;

/**
 * Segment Extraction Validation
 */
export const SegmentExtractionSchema = z.object({
  startKm: z.coerce
    .number()
    .min(0, 'Le kilomètre de départ ne peut pas être négatif'),
  endKm: z.coerce
    .number()
    .min(0, 'Le kilomètre de fin ne peut pas être négatif'),
}).refine((data) => data.endKm > data.startKm, {
  message: 'Le kilomètre de fin doit être supérieur au kilomètre de départ',
  path: ['endKm'],
});

export type SegmentExtractionInput = z.infer<typeof SegmentExtractionSchema>;

/**
 * Climb Detection Parameters Validation
 */
export const ClimbDetectionSchema = z.object({
  minElevationGain: z.coerce
    .number()
    .min(10, 'Le dénivelé minimum doit être au moins 10m')
    .max(5000, 'Le dénivelé maximum ne peut pas dépasser 5000m')
    .int('Le dénivelé doit être un nombre entier'),
  minDistance: z.coerce
    .number()
    .min(0.1, 'La distance minimum doit être au moins 0.1km')
    .max(100, 'La distance maximum ne peut pas dépasser 100km'),
  minGradient: z.coerce
    .number()
    .min(1, 'La pente minimum doit être au moins 1%')
    .max(50, 'La pente maximum ne peut pas dépasser 50%'),
});

export type ClimbDetectionInput = z.infer<typeof ClimbDetectionSchema>;

/**
 * Helper function to format Zod validation errors for user display
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((err) => err.message).join(', ');
}

/**
 * Helper function to get first error message from Zod validation
 */
export function getFirstZodError(error: z.ZodError): string {
  return error.issues[0]?.message || 'Erreur de validation';
}
