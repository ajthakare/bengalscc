import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import type { Fixture } from '../../src/types/player';

/**
 * List fixtures for a season
 * GET /api/fixtures-list?seasonId=xxx
 * Public endpoint - no authentication required
 * Returns: Array of fixtures
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    // Get season ID from query parameters
    const seasonId = event.queryStringParameters?.seasonId;

    if (!seasonId) {
      // If no seasonId, try to get active season
      const seasonsStore = getStore({
        name: 'seasons',
        siteID: process.env.SITE_ID || '',
        token: process.env.NETLIFY_AUTH_TOKEN || '',
      });

      const activeSeason = await seasonsStore.get('active-season', { type: 'json' });

      if (!activeSeason || !activeSeason.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Season ID is required or no active season found',
          }),
        };
      }

      return await getFixturesForSeason(activeSeason.id);
    }

    return await getFixturesForSeason(seasonId);
  } catch (error) {
    console.error('Error listing fixtures:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to list fixtures',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

async function getFixturesForSeason(seasonId: string) {
  const fixturesStore = getStore({
    name: 'fixtures',
    siteID: process.env.SITE_ID || '',
    token: process.env.NETLIFY_AUTH_TOKEN || '',
  });

  const fixtures =
    (await fixturesStore.get(`fixtures-${seasonId}`, { type: 'json' })) as
      | Fixture[]
      | null;

  if (!fixtures || fixtures.length === 0) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([]),
    };
  }

  // Load all players to get player of match names
  const playersStore = getStore({
    name: 'players',
    siteID: process.env.SITE_ID || '',
    token: process.env.NETLIFY_AUTH_TOKEN || '',
  });

  const allPlayers = await playersStore.get('players-all', { type: 'json' }) as any[] | null;

  // Sort fixtures by date and enrich with player names
  const sortedFixtures = fixtures
    .map((fixture) => {
      // Add player of match name if available
      if (fixture.playerOfMatch && allPlayers) {
        const player = allPlayers.find((p: any) => p.id === fixture.playerOfMatch);
        if (player) {
          return {
            ...fixture,
            playerOfMatchName: `${player.firstName} ${player.lastName}`,
          };
        }
      }
      return fixture;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sortedFixtures),
  };
}
