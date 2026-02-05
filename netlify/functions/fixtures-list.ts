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
  const store = getStore({
    name: 'fixtures',
    siteID: process.env.SITE_ID || '',
    token: process.env.NETLIFY_AUTH_TOKEN || '',
  });

  const fixtures =
    (await store.get(`fixtures-${seasonId}`, { type: 'json' })) as
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

  // Sort fixtures by date
  const sortedFixtures = fixtures.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sortedFixtures),
  };
}
