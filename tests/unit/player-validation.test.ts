/**
 * Unit Tests: Player Validation
 * Tests for player data validation logic
 */

import { describe, it, expect } from 'vitest';
import { mockPlayer, mockPlayers } from '../fixtures/data';

describe('Player Validation', () => {
  describe('Player Data Structure', () => {
    it('should have required fields', () => {
      expect(mockPlayer).toHaveProperty('id');
      expect(mockPlayer).toHaveProperty('firstName');
      expect(mockPlayer).toHaveProperty('lastName');
      expect(mockPlayer).toHaveProperty('email');
      expect(mockPlayer).toHaveProperty('isActive');
    });

    it('should have valid email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(mockPlayer.email).toMatch(emailRegex);
    });

    it('should have valid phone format if provided', () => {
      if (mockPlayer.phone) {
        expect(mockPlayer.phone).toMatch(/^\+?[\d\s-()]+$/);
      }
    });

    it('should have seasonAssignments array', () => {
      expect(Array.isArray(mockPlayer.seasonAssignments)).toBe(true);
    });
  });

  describe('Player Active Status', () => {
    it('should filter active players', () => {
      const activePlayers = mockPlayers.filter(p => p.isActive);
      expect(activePlayers.length).toBeGreaterThan(0);
      expect(activePlayers.every(p => p.isActive === true)).toBe(true);
    });

    it('should filter inactive players', () => {
      const inactivePlayers = mockPlayers.filter(p => !p.isActive);
      expect(inactivePlayers.length).toBeGreaterThan(0);
      expect(inactivePlayers.every(p => p.isActive === false)).toBe(true);
    });
  });

  describe('Season Assignments', () => {
    it('should have valid season assignment structure', () => {
      const assignment = mockPlayer.seasonAssignments[0];
      expect(assignment).toHaveProperty('seasonId');
      expect(assignment).toHaveProperty('teamId');
      expect(assignment).toHaveProperty('role');
    });

    it('should have valid role values', () => {
      const validRoles = ['player', 'captain', 'vice-captain'];
      mockPlayer.seasonAssignments.forEach(assignment => {
        expect(validRoles).toContain(assignment.role);
      });
    });

    it('should have unique jersey numbers per team', () => {
      const jerseyNumbers = mockPlayer.seasonAssignments
        .filter(a => a.jerseyNumber)
        .map(a => `${a.teamId}-${a.jerseyNumber}`);
      const uniqueNumbers = new Set(jerseyNumbers);
      expect(jerseyNumbers.length).toBe(uniqueNumbers.size);
    });
  });

  describe('Player Search & Filter', () => {
    it('should search by name (case-insensitive)', () => {
      const searchTerm = 'john';
      const results = mockPlayers.filter(p =>
        p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].firstName.toLowerCase()).toContain(searchTerm);
    });

    it('should filter by position', () => {
      const position = 'Batsman';
      const results = mockPlayers.filter(p => p.position === position);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(p => p.position === position)).toBe(true);
    });

    it('should filter by season assignment', () => {
      const seasonId = 'season-2025';
      const results = mockPlayers.filter(p =>
        p.seasonAssignments.some(a => a.seasonId === seasonId)
      );
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
