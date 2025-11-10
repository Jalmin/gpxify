import ReactSlider from 'react-slider';
import './RangeSlider.css';

interface RangeSliderProps {
  min: number;
  max: number;
  values: [number, number];
  onChange: (values: [number, number]) => void;
  step?: number;
  formatLabel?: (value: number) => string;
}

export function RangeSlider({
  min,
  max,
  values,
  onChange,
  step = 0.1,
  formatLabel = (v) => v.toFixed(1),
}: RangeSliderProps) {
  return (
    <div className="range-slider-container">
      <div className="flex justify-between mb-2 text-sm font-medium text-foreground">
        <span>Début: {formatLabel(values[0])} km</span>
        <span>Fin: {formatLabel(values[1])} km</span>
      </div>

      <ReactSlider
        className="horizontal-slider"
        thumbClassName="slider-thumb"
        trackClassName="slider-track"
        min={min}
        max={max}
        value={values}
        onChange={onChange}
        step={step}
        minDistance={0.5} // Minimum 500m between thumbs
        pearling
        withTracks
      />

      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{formatLabel(min)} km</span>
        <span>{formatLabel(max)} km</span>
      </div>
    </div>
  );
}
