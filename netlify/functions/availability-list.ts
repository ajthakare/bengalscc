import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession } from '../../src/middleware/auth';
import type { FixtureAvailability } from '../../src/types/player';

/**
 * List availability records with filtering
 * GET /api/availability-list?seasonId=xxx&team=Bengal Tigers&dateFrom=2025-11-01&dateTo=2026-03-31
 * Requires: Valid admin session
 * Returns: Array of availability summaries with stats
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    // Validate admin session
    const cookieHeader = event.headers.cookie;
    const session = validateAdminSession(cookieHeader);

    if (!session) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Only GET method allowed
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Get query parameters
    const params = event.queryStringParameters || {};
    const { seasonId, team, dateFrom, dateTo } = params;

    // Get stores
    const availabilityStore = getStore({
      name: 'fixture-availability',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const seasonsStore = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Get season (use provided or active season)
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const seasons = (await seasonsStore.get('seasons-list', { type: 'json' })) as any[] | null;
      const activeSeason = seasons?.find((s) => s.isActive);
      if (!activeSeason) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No active season found and no seasonId provided' }),
        };
      }
      targetSeasonId = activeSeason.id;
    }

    // Get availability index for the season
    const indexKey = `availability-index-${targetSeasonId}`;
    let index = (await availabilityStore.get(indexKey, { type: 'json' })) as any[] | null;

    // If no index exists, build it from fixtures store
    if (!index || index.length === 0) {
      console.log('[Availability List] No index found, checking for availability records...');

      // Get all fixtures for the season
      const fixturesStore = getStore({
        name: 'fixtures',
        siteID: process.env.SITE_ID || '',
        token: process.env.NETLIFY_AUTH_TOKEN || '',
      });
      const fixtures = (await fixturesStore.get(`fixtures-${targetSeasonId}`, { type: 'json' })) as any[] | null;

      if (!fixtures || fixtures.length === 0) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([]),
        };
      }

      // Check which fixtures have availability records
      index = [];
      for (const fixture of fixtures) {
        const availRecord = await availabilityStore.get(`availability-${fixture.id}`, { type: 'json' });
        if (availRecord) {
          index.push({
            fixtureId: fixture.id,
            gameNumber: fixture.gameNumber,
            date: fixture.date,
            team: fixture.team,
            opponent: fixture.opponent,
            venue: fixture.venue,
          });
        }
      }

      // Save the rebuilt index
      if (index.length > 0) {
        await availabilityStore.setJSON(indexKey, index);
      } else {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([]),
        };
      }
    }

    // Filter fixtures
    let filteredIndex = [...index];

    if (team) {
      filteredIndex = filteredIndex.filter((f) => f.team === team);
    }

    if (dateFrom) {
      filteredIndex = filteredIndex.filter((f) => f.date >= dateFrom);
    }

    if (dateTo) {
      filteredIndex = filteredIndex.filter((f) => f.date <= dateTo);
    }

    // Load full availability records and calculate stats
    const availabilityRecords = await Promise.all(
      filteredIndex.map(async (fixture) => {
        const availability = (await availabilityStore.get(
          `availability-${fixture.fixtureId}`,
          { type: 'json' }
        )) as FixtureAvailability | null;

        if (!availability) {
          return null;
        }

        // Calculate stats
        const totalPlayers = availability.playerAvailability.length;

        // Count available using the unified wasAvailable field
        const availableCount = availability.playerAvailability.filter(
          (p) => p.wasAvailable === true
        ).length;

        const selectedCount = availability.playerAvailability.filter(
          (p) => p.wasSelected
        ).length;

        return {
          id: availability.id,
          fixtureId: availability.fixtureId,
          gameNumber: availability.gameNumber,
          date: availability.date,
          team: availability.team,
          opponent: availability.opponent,
          venue: availability.venue,
          totalPlayers,
          availableCount,
          selectedCount,
          availabilityRate:
            totalPlayers > 0 ? Math.round((availableCount / totalPlayers) * 100) : 0,
          selectionRate:
            availableCount > 0 ? Math.round((selectedCount / availableCount) * 100) : 0,
          updatedAt: availability.updatedAt,
          updatedBy: availability.updatedBy,
        };
      })
    );

    // Filter out null records and sort by date (newest first)
    const validRecords = availabilityRecords
      .filter((r) => r !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validRecords),
    };
  } catch (error) {
    console.error('Error listing availability records:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to list availability records',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
