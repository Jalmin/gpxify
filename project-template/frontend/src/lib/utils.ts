import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Standard utility for conditional Tailwind classes
 *
 * @param inputs - Class values to merge
 * @returns Merged class string
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to locale string
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a number to locale string
 *
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

// TODO: Add your own utility functions here
