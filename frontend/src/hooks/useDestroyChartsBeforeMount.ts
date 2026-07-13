import { useLayoutEffect } from 'react';
import { destroyAllCharts } from '@/lib/chartSetup';

/**
 * Child react-chartjs-2 effects run before parent useEffect.
 * useLayoutEffect here runs before the Line canvas mounts its chart.
 */
export function useDestroyChartsBeforeMount(): void {
  useLayoutEffect(() => {
    destroyAllCharts();
  }, []);
}
