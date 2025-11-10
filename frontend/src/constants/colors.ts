/**
 * Color palette for GPX files
 * Red is first for better visibility on maps
 */
export const GPX_COLORS: Array<{
  bg: string;
  border: string;
  text: string;
  hex: string;
}> = [
  { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-500', hex: '#ef4444' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-500', hex: '#a855f7' },
  { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-500', hex: '#22c55e' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-500', hex: '#f97316' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-500', hex: '#ec4899' },
];

export type GPXColor = typeof GPX_COLORS[number];
