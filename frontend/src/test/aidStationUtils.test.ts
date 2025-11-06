import { describe, it, expect } from 'vitest';

/**
 * Tests for utility functions used in Aid Station Table
 */

// Helper function to format time (extracted from AidStationTable for testing)
function formatTime(minutes?: number): string {
  if (minutes === undefined || minutes === null) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

// Helper function to escape CSV values
function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

describe('AidStationTable Utilities', () => {
  describe('formatTime', () => {
    it('should format minutes to hours and minutes', () => {
      expect(formatTime(125)).toBe('2h05');
      expect(formatTime(60)).toBe('1h00');
      expect(formatTime(30)).toBe('0h30');
    });

    it('should return "-" for undefined', () => {
      expect(formatTime(undefined)).toBe('-');
      expect(formatTime(0)).toBe('0h00');
    });

    it('should pad minutes with zero', () => {
      expect(formatTime(65)).toBe('1h05');
      expect(formatTime(5)).toBe('0h05');
    });

    it('should handle large durations', () => {
      expect(formatTime(600)).toBe('10h00');
      expect(formatTime(1234)).toBe('20h34');
    });
  });

  describe('escapeCSV', () => {
    it('should not escape simple strings', () => {
      expect(escapeCSV('Chamonix')).toBe('Chamonix');
      expect(escapeCSV('123')).toBe('123');
    });

    it('should escape strings with commas', () => {
      expect(escapeCSV('Chamonix, France')).toBe('"Chamonix, France"');
    });

    it('should escape strings with quotes', () => {
      expect(escapeCSV('The "Big" Race')).toBe('"The ""Big"" Race"');
    });

    it('should escape strings with newlines', () => {
      expect(escapeCSV('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('should handle numbers', () => {
      expect(escapeCSV(42)).toBe('42');
      expect(escapeCSV(3.14)).toBe('3.14');
    });
  });
});
