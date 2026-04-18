import { Sparkles } from 'lucide-react';
import type { TrailPlannerConfig } from '@/types/gpx';
import { TRAIL_PLANNER_PRESETS, TRAIL_PLANNER_LIMITS } from '@/constants/presets';

interface TrailPlannerFormProps {
  value: TrailPlannerConfig | null;
  onChange: (config: TrailPlannerConfig) => void;
}

const FIELDS: Array<{
  key: keyof TrailPlannerConfig;
  label: string;
  unit: string;
  step: number;
  help?: string;
}> = [
  {
    key: 'flat_pace_kmh',
    label: 'Allure sur plat',
    unit: 'km/h',
    step: 0.5,
    help: 'Votre vitesse soutenable sur terrain plat',
  },
  {
    key: 'climb_penalty_min_per_100m',
    label: 'Pénalité montée',
    unit: 'min / 100m D+',
    step: 0.5,
    help: 'Temps ajouté par 100m de dénivelé positif',
  },
  {
    key: 'descent_bonus_min_per_100m',
    label: 'Bonus descente',
    unit: 'min / 100m D-',
    step: 0.5,
    help: 'Temps retiré par 100m de dénivelé négatif',
  },
  {
    key: 'fatigue_percent_per_interval',
    label: 'Facteur fatigue',
    unit: '% par palier',
    step: 1,
    help: 'Ralentissement progressif (0 = désactivé)',
  },
  {
    key: 'fatigue_interval_km',
    label: 'Intervalle fatigue',
    unit: 'km',
    step: 1,
    help: 'Distance entre chaque palier de fatigue',
  },
];

export function TrailPlannerForm({ value, onChange }: TrailPlannerFormProps) {
  const handleFieldChange = (key: keyof TrailPlannerConfig, raw: string) => {
    const parsed = parseFloat(raw);
    const base =
      value ?? ({ ...TRAIL_PLANNER_PRESETS['trail-moyen'] } as TrailPlannerConfig);
    onChange({
      ...base,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    });
  };

  const applyPreset = (presetId: keyof typeof TRAIL_PLANNER_PRESETS) => {
    onChange({ ...TRAIL_PLANNER_PRESETS[presetId] });
  };

  const isInvalid = (key: keyof TrailPlannerConfig, current: number): boolean => {
    const limits = TRAIL_PLANNER_LIMITS[key];
    return !Number.isFinite(current) || current < limits.min || current > limits.max;
  };

  const empty = value === null;

  return (
    <div
      className="mt-3 p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3"
      data-testid="trail-planner-form"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Paramètres Trail Planner</p>
        <button
          type="button"
          onClick={() => applyPreset('trail-moyen')}
          className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          Appliquer preset Trail moyen
        </button>
      </div>

      {empty && (
        <p className="text-xs text-muted-foreground italic">
          Remplissez les paramètres ou chargez un preset pour activer le calcul.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FIELDS.map(({ key, label, unit, step, help }) => {
          const current = value ? value[key] : NaN;
          const invalid = !empty && isInvalid(key, current);
          const limits = TRAIL_PLANNER_LIMITS[key];
          return (
            <div key={key} className="space-y-1">
              <label
                htmlFor={`tp-${key}`}
                className="block text-xs font-medium"
              >
                {label}
                <span className="text-muted-foreground ml-1 font-normal">
                  ({unit})
                </span>
              </label>
              <input
                id={`tp-${key}`}
                type="number"
                step={step}
                min={limits.min}
                max={limits.max}
                value={empty ? '' : current}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                aria-invalid={invalid}
                aria-describedby={help ? `tp-${key}-help` : undefined}
                className={`w-full px-2 py-1.5 bg-background border rounded-md text-sm ${
                  invalid ? 'border-destructive' : 'border-border'
                }`}
              />
              {help && (
                <p
                  id={`tp-${key}-help`}
                  className="text-[11px] text-muted-foreground"
                >
                  {help}
                </p>
              )}
              {invalid && (
                <p className="text-[11px] text-destructive">
                  Valeur entre {limits.min} et {limits.max}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function isTrailPlannerConfigValid(
  config: TrailPlannerConfig | null,
): config is TrailPlannerConfig {
  if (!config) return false;
  return (Object.keys(TRAIL_PLANNER_LIMITS) as Array<keyof TrailPlannerConfig>).every(
    (key) => {
      const value = config[key];
      const limits = TRAIL_PLANNER_LIMITS[key];
      return (
        Number.isFinite(value) && value >= limits.min && value <= limits.max
      );
    },
  );
}
