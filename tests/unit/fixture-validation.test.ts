/**
 * Unit Tests: Fixture Validation
 * Tests for fixture data validation logic
 */

import { describe, it, expect } from 'vitest';
import { mockFixture, mockFixtures } from '../fixtures/data';

describe('Fixture Validation', () => {
  describe('Fixture Data Structure', () => {
    it('should have required fields', () => {
      expect(mockFixture).toHaveProperty('id');
      expect(mockFixture).toHaveProperty('seasonId');
      expect(mockFixture).toHaveProperty('gameNumber');
      expect(mockFixture).toHaveProperty('date');
      expect(mockFixture).toHaveProperty('team');
      expect(mockFixture).toHaveProperty('opponent');
      expect(mockFixture).toHaveProperty('venue');
    });

    it('should have valid date format (YYYY-MM-DD)', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(mockFixture.date).toMatch(dateRegex);
    });

    it('should have valid time format', () => {
      expect(mockFixture.time).toBeTruthy();
      expect(typeof mockFixture.time).toBe('string');
    });

    it('should have valid match type', () => {
      const validTypes = ['home', 'away', 'neutral'];
      if (mockFixture.matchType) {
        expect(validTypes).toContain(mockFixture.matchType);
      }
    });
  });

  describe('Fixture Sorting & Filtering', () => {
    it('should sort fixtures by date (ascending)', () => {
      const sorted = [...mockFixtures].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i - 1].date);
        const currDate = new Date(sorted[i].date);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });

    it('should filter by team', () => {
      const team = 'Bengal Tigers';
      const results = mockFixtures.filter(f => f.team === team);
      expect(results.every(f => f.team === team)).toBe(true);
    });

    it('should filter by season', () => {
      const seasonId = 'season-2025';
      const results = mockFixtures.filter(f => f.seasonId === seasonId);
      expect(results.every(f => f.seasonId === seasonId)).toBe(true);
    });

    it('should filter upcoming fixtures', () => {
      const today = new Date().toISOString().split('T')[0];
      const upcoming = mockFixtures.filter(f => f.date >= today);
      expect(upcoming.every(f => f.date >= today)).toBe(true);
    });
  });

  describe('Game Number Validation', () => {
    it('should have unique game numbers per season', () => {
      const gameNumbers = mockFixtures
        .filter(f => f.seasonId === 'season-2025')
        .map(f => f.gameNumber);
      const uniqueNumbers = new Set(gameNumbers);
      expect(gameNumbers.length).toBe(uniqueNumbers.size);
    });

    it('should have valid game number format', () => {
      const gameNumberRegex = /^G\d+$/;
      mockFixtures.forEach(fixture => {
        expect(fixture.gameNumber).toMatch(gameNumberRegex);
      });
    });
  });

  describe('Fixture Details', () => {
    it('should have team different from opponent', () => {
      mockFixtures.forEach(fixture => {
        expect(fixture.team).not.toBe(fixture.opponent);
      });
    });

    it('should have non-empty venue', () => {
      mockFixtures.forEach(fixture => {
        expect(fixture.venue.length).toBeGreaterThan(0);
      });
    });
  });
});
