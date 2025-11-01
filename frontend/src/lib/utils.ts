import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format distance from meters to km
 */
export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format elevation in meters
 */
export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`;
}

/**
 * Format duration from seconds to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}
