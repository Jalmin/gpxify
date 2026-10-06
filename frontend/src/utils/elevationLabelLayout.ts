/** Rough half-width of a 2-line annotation label (px). */
export function labelHalfWidthPx(name: string, km: number): number {
  const fontSize = 10;
  const horizontalPadding = 8;
  const longestLine = Math.max(name.length, `${km.toFixed(1)} km`.length);
  return Math.max(24, (longestLine * fontSize * 0.55) / 2 + horizontalPadding / 2);
}

/** Min km gap between two label centers before they overlap. */
export function requiredSeparationKm(
  halfWidthPxA: number,
  halfWidthPxB: number,
  plotWidthPx: number,
  totalDistanceKm: number,
): number {
  return ((halfWidthPxA + halfWidthPxB) / plotWidthPx) * totalDistanceKm;
}

/** Whether a centered label at `km` would clip past the plot edge. */
export function labelEdgeRole(
  km: number,
  name: string,
  plotWidthPx: number,
  totalDistanceKm: number,
): 'left' | 'right' | 'center' {
  const halfWidthKm = (labelHalfWidthPx(name, km) / plotWidthPx) * totalDistanceKm;
  const nearLeft = km <= halfWidthKm;
  const nearRight = km >= totalDistanceKm - halfWidthKm;

  if (nearLeft && nearRight) {
    return km <= totalDistanceKm - km ? 'left' : 'right';
  }
  if (nearLeft) return 'left';
  if (nearRight) return 'right';
  return 'center';
}

/** Visual center on the x-axis (accounts for edge label xAdjust). */
export function labelEffectiveCenterKm(
  km: number,
  name: string,
  plotWidthPx: number,
  totalDistanceKm: number,
): number {
  const halfWidthKm = (labelHalfWidthPx(name, km) / plotWidthPx) * totalDistanceKm;
  const edge = labelEdgeRole(km, name, plotWidthPx, totalDistanceKm);
  if (edge === 'left') return km + halfWidthKm;
  if (edge === 'right') return km - halfWidthKm;
  return km;
}

export function labelXAdjust(
  km: number,
  name: string,
  plotWidthPx: number,
  totalDistanceKm: number,
): number {
  const halfWidth = labelHalfWidthPx(name, km);
  const edge = labelEdgeRole(km, name, plotWidthPx, totalDistanceKm);
  if (edge === 'left') return halfWidth;
  if (edge === 'right') return -halfWidth;
  return 0;
}
