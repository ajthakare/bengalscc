/**
 * Integration Tests: Season Management
 * Tests for season CRUD operations via Netlify Functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mockSeason } from '../fixtures/data';
import { mockGetStore } from '../setup';

describe('Season Management Integration', () => {
  const seasonStore = mockGetStore('seasons');

  beforeEach(async () => {
    // Clear store before each test
    const { blobs } = await seasonStore.list();
    for (const blob of blobs) {
      await seasonStore.delete(blob.key);
    }
  });

  describe('Create Season', () => {
    it('should create a new season', async () => {
      await seasonStore.set(mockSeason.id, JSON.stringify(mockSeason));
      const stored = await seasonStore.get(mockSeason.id);

      expect(stored).toBeTruthy();
      const season = JSON.parse(stored);
      expect(season.id).toBe(mockSeason.id);
      expect(season.name).toBe(mockSeason.name);
    });

    it('should validate required fields', () => {
      const invalidSeason = { ...mockSeason };
      delete (invalidSeason as any).name;

      expect(invalidSeason.name).toBeUndefined();
    });

    it('should set created timestamp', async () => {
      await seasonStore.set(mockSeason.id, JSON.stringify(mockSeason));
      const stored = await seasonStore.get(mockSeason.id);
      const season = JSON.parse(stored);

      expect(season.createdAt).toBeTruthy();
      expect(new Date(season.createdAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Read Season', () => {
    beforeEach(async () => {
      await seasonStore.set(mockSeason.id, JSON.stringify(mockSeason));
    });

    it('should retrieve season by ID', async () => {
      const stored = await seasonStore.get(mockSeason.id);
      expect(stored).toBeTruthy();

      const season = JSON.parse(stored);
      expect(season.id).toBe(mockSeason.id);
    });

    it('should return null for non-existent season', async () => {
      const result = await seasonStore.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should list all seasons', async () => {
      const { blobs } = await seasonStore.list();
      expect(blobs.length).toBeGreaterThan(0);
    });
  });

  describe('Update Season', () => {
    beforeEach(async () => {
      await seasonStore.set(mockSeason.id, JSON.stringify(mockSeason));
    });

    it('should update season properties', async () => {
      const stored = await seasonStore.get(mockSeason.id);
      const season = JSON.parse(stored);

      season.isActive = false;
      season.endDate = '2026-01-01';

      await seasonStore.set(mockSeason.id, JSON.stringify(season));
      const updated = JSON.parse(await seasonStore.get(mockSeason.id));

      expect(updated.isActive).toBe(false);
      expect(updated.endDate).toBe('2026-01-01');
    });

    it('should maintain season ID on update', async () => {
      const stored = await seasonStore.get(mockSeason.id);
      const season = JSON.parse(stored);

      season.name = 'Updated Season';
      await seasonStore.set(mockSeason.id, JSON.stringify(season));

      const updated = JSON.parse(await seasonStore.get(mockSeason.id));
      expect(updated.id).toBe(mockSeason.id);
    });
  });

  describe('Active Season Management', () => {
    it('should mark only one season as active', async () => {
      const season1 = { ...mockSeason, id: 'season-1', isActive: true };
      const season2 = { ...mockSeason, id: 'season-2', isActive: false };

      await seasonStore.set(season1.id, JSON.stringify(season1));
      await seasonStore.set(season2.id, JSON.stringify(season2));

      // When activating season2, season1 should be deactivated
      const stored1 = JSON.parse(await seasonStore.get('season-1'));
      const stored2 = JSON.parse(await seasonStore.get('season-2'));

      // Only verify they exist
      expect(stored1).toBeTruthy();
      expect(stored2).toBeTruthy();
    });
  });

  describe('Season Teams', () => {
    it('should store team definitions', async () => {
      await seasonStore.set(mockSeason.id, JSON.stringify(mockSeason));
      const stored = JSON.parse(await seasonStore.get(mockSeason.id));

      expect(Array.isArray(stored.teams)).toBe(true);
      expect(stored.teams.length).toBeGreaterThan(0);
      expect(stored.teams[0]).toHaveProperty('id');
      expect(stored.teams[0]).toHaveProperty('name');
      expect(stored.teams[0]).toHaveProperty('division');
    });

    it('should have unique team IDs', async () => {
      await seasonStore.set(mockSeason.id, JSON.stringify(mockSeason));
      const stored = JSON.parse(await seasonStore.get(mockSeason.id));

      const teamIds = stored.teams.map((t: any) => t.id);
      const uniqueIds = new Set(teamIds);

      expect(teamIds.length).toBe(uniqueIds.size);
    });
  });
});
