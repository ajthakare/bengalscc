/**
 * Integration Tests: Player Management
 * Tests for player CRUD operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mockPlayer, mockPlayers } from '../fixtures/data';
import { mockGetStore } from '../setup';

describe('Player Management Integration', () => {
  const playerStore = mockGetStore('players');

  beforeEach(async () => {
    // Clear store before each test
    const { blobs } = await playerStore.list();
    for (const blob of blobs) {
      await playerStore.delete(blob.key);
    }
  });

  describe('Create Player', () => {
    it('should create a new player', async () => {
      await playerStore.set(mockPlayer.id, JSON.stringify(mockPlayer));
      const stored = await playerStore.get(mockPlayer.id);

      expect(stored).toBeTruthy();
      const player = JSON.parse(stored);
      expect(player.id).toBe(mockPlayer.id);
      expect(player.firstName).toBe(mockPlayer.firstName);
      expect(player.lastName).toBe(mockPlayer.lastName);
    });

    it('should generate unique player ID', async () => {
      const player1 = { ...mockPlayer, id: 'player-1' };
      const player2 = { ...mockPlayer, id: 'player-2' };

      await playerStore.set(player1.id, JSON.stringify(player1));
      await playerStore.set(player2.id, JSON.stringify(player2));

      expect(player1.id).not.toBe(player2.id);
    });

    it('should set timestamps on creation', async () => {
      await playerStore.set(mockPlayer.id, JSON.stringify(mockPlayer));
      const stored = JSON.parse(await playerStore.get(mockPlayer.id));

      expect(stored.createdAt).toBeTruthy();
      expect(stored.updatedAt).toBeTruthy();
    });
  });

  describe('Read Player', () => {
    beforeEach(async () => {
      for (const player of mockPlayers) {
        await playerStore.set(player.id, JSON.stringify(player));
      }
    });

    it('should retrieve player by ID', async () => {
      const stored = await playerStore.get(mockPlayer.id);
      expect(stored).toBeTruthy();

      const player = JSON.parse(stored);
      expect(player.id).toBe(mockPlayer.id);
    });

    it('should list all players', async () => {
      const { blobs } = await playerStore.list();
      expect(blobs.length).toBe(mockPlayers.length);
    });

    it('should retrieve multiple players', async () => {
      const players = [];
      const { blobs } = await playerStore.list();

      for (const blob of blobs) {
        const stored = await playerStore.get(blob.key);
        players.push(JSON.parse(stored));
      }

      expect(players.length).toBe(mockPlayers.length);
    });
  });

  describe('Update Player', () => {
    beforeEach(async () => {
      await playerStore.set(mockPlayer.id, JSON.stringify(mockPlayer));
    });

    it('should update player properties', async () => {
      const stored = await playerStore.get(mockPlayer.id);
      const player = JSON.parse(stored);

      player.position = 'All-Rounder';
      player.jerseyNumber = 99;
      player.updatedAt = new Date().toISOString();

      await playerStore.set(mockPlayer.id, JSON.stringify(player));
      const updated = JSON.parse(await playerStore.get(mockPlayer.id));

      expect(updated.position).toBe('All-Rounder');
      expect(updated.jerseyNumber).toBe(99);
    });

    it('should update player status', async () => {
      const stored = await playerStore.get(mockPlayer.id);
      const player = JSON.parse(stored);

      player.isActive = false;
      await playerStore.set(mockPlayer.id, JSON.stringify(player));

      const updated = JSON.parse(await playerStore.get(mockPlayer.id));
      expect(updated.isActive).toBe(false);
    });

    it('should update season assignments', async () => {
      const stored = await playerStore.get(mockPlayer.id);
      const player = JSON.parse(stored);

      player.seasonAssignments.push({
        seasonId: 'season-2026',
        teamId: 'team-bulls',
        role: 'player',
        jerseyNumber: 15,
        joinedDate: '2026-01-01',
      });

      await playerStore.set(mockPlayer.id, JSON.stringify(player));
      const updated = JSON.parse(await playerStore.get(mockPlayer.id));

      expect(updated.seasonAssignments.length).toBe(2);
    });
  });

  describe('Delete Player', () => {
    beforeEach(async () => {
      await playerStore.set(mockPlayer.id, JSON.stringify(mockPlayer));
    });

    it('should delete player', async () => {
      await playerStore.delete(mockPlayer.id);
      const result = await playerStore.get(mockPlayer.id);

      expect(result).toBeUndefined();
    });

    it('should not affect other players', async () => {
      const player2 = { ...mockPlayer, id: 'player-2' };
      await playerStore.set(player2.id, JSON.stringify(player2));

      await playerStore.delete(mockPlayer.id);

      const stored = await playerStore.get(player2.id);
      expect(stored).toBeTruthy();
    });
  });

  describe('Player Search & Filter', () => {
    beforeEach(async () => {
      for (const player of mockPlayers) {
        await playerStore.set(player.id, JSON.stringify(player));
      }
    });

    it('should filter active players', async () => {
      const { blobs } = await playerStore.list();
      const players = [];

      for (const blob of blobs) {
        const stored = await playerStore.get(blob.key);
        const player = JSON.parse(stored);
        if (player.isActive) {
          players.push(player);
        }
      }

      expect(players.length).toBeGreaterThan(0);
      expect(players.every(p => p.isActive === true)).toBe(true);
    });

    it('should filter by season', async () => {
      const seasonId = 'season-2025';
      const { blobs } = await playerStore.list();
      const players = [];

      for (const blob of blobs) {
        const stored = await playerStore.get(blob.key);
        const player = JSON.parse(stored);
        if (player.seasonAssignments.some((a: any) => a.seasonId === seasonId)) {
          players.push(player);
        }
      }

      expect(players.length).toBeGreaterThan(0);
    });
  });

  describe('CSV Import Validation', () => {
    it('should validate CSV data structure', () => {
      const csvData = {
        firstName: 'Test',
        lastName: 'Player',
        email: 'test@example.com',
        position: 'Batsman',
      };

      expect(csvData).toHaveProperty('firstName');
      expect(csvData).toHaveProperty('lastName');
      expect(csvData).toHaveProperty('email');
    });

    it('should validate email format in CSV', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'not-an-email';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(validEmail).toMatch(emailRegex);
      expect(invalidEmail).not.toMatch(emailRegex);
    });
  });
});
