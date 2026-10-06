import { describe, it, expect } from 'vitest';
import {
  labelEdgeRole,
  labelEffectiveCenterKm,
  labelXAdjust,
} from '@/utils/elevationLabelLayout';

const PLOT_WIDTH = 700;
const TOTAL_KM = 100;

describe('elevationLabelLayout — edge detection by km position', () => {
  it('treats a mid-course first station as centered, not left-edge', () => {
    expect(labelEdgeRole(15, 'Col du Bonhomme', PLOT_WIDTH, TOTAL_KM)).toBe('center');
    expect(labelXAdjust(15, 'Col du Bonhomme', PLOT_WIDTH, TOTAL_KM)).toBe(0);
    expect(labelEffectiveCenterKm(15, 'Col du Bonhomme', PLOT_WIDTH, TOTAL_KM)).toBe(15);
  });

  it('treats a mid-course last station as centered, not right-edge', () => {
    expect(labelEdgeRole(85, 'Les Chapieux', PLOT_WIDTH, TOTAL_KM)).toBe('center');
    expect(labelXAdjust(85, 'Les Chapieux', PLOT_WIDTH, TOTAL_KM)).toBe(0);
    expect(labelEffectiveCenterKm(85, 'Les Chapieux', PLOT_WIDTH, TOTAL_KM)).toBe(85);
  });

  it('shifts labels near 0 km to the right', () => {
    expect(labelEdgeRole(0, 'Départ', PLOT_WIDTH, TOTAL_KM)).toBe('left');
    expect(labelXAdjust(0, 'Départ', PLOT_WIDTH, TOTAL_KM)).toBeGreaterThan(0);
    expect(
      labelEffectiveCenterKm(0, 'Départ', PLOT_WIDTH, TOTAL_KM),
    ).toBeGreaterThan(0);
  });

  it('shifts labels near total distance to the left', () => {
    expect(labelEdgeRole(100, 'Arrivée', PLOT_WIDTH, TOTAL_KM)).toBe('right');
    expect(labelXAdjust(100, 'Arrivée', PLOT_WIDTH, TOTAL_KM)).toBeLessThan(0);
    expect(
      labelEffectiveCenterKm(100, 'Arrivée', PLOT_WIDTH, TOTAL_KM),
    ).toBeLessThan(100);
  });

  it('handles partial courses where boundaries do not span 0 → total', () => {
    const partialTotal = 50;
    // First boundary at 10 km on a 50 km excerpt — not a chart edge.
    expect(labelEdgeRole(10, 'Ravito A', PLOT_WIDTH, partialTotal)).toBe('center');
    // Last boundary at 40 km — well inside the plot, not treated as right edge.
    expect(labelEdgeRole(40, 'Ravito B', PLOT_WIDTH, partialTotal)).toBe('center');
    // Only a station actually near the plot max gets right-edge handling.
    expect(labelEdgeRole(50, 'Arrivée', PLOT_WIDTH, partialTotal)).toBe('right');
  });
});
