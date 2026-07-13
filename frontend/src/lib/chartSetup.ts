import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

let baseRegistered = false;
let annotationRegistered = false;

export function registerChartJs(): void {
  if (baseRegistered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );
  baseRegistered = true;
}

export function registerChartJsWithAnnotations(): void {
  registerChartJs();
  if (annotationRegistered) return;
  ChartJS.register(annotationPlugin);
  annotationRegistered = true;
}

/** Tear down live Chart.js instances (avoids canvas reuse errors across tabs). */
export function destroyAllCharts(): void {
  Object.values(ChartJS.instances).forEach((chart) => {
    chart.destroy();
  });
  if (typeof document !== 'undefined') {
    document.querySelectorAll('canvas').forEach((canvas) => {
      ChartJS.getChart(canvas)?.destroy();
    });
  }
}
