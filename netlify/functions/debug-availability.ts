import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession } from '../../src/middleware/auth';

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

    // Get active season
    const activeSeason = await seasonsStore.get('active-season', { type: 'json' }) as any;

    if (!activeSeason) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No active season' }),
      };
    }

    // Get fixtures
    const fixturesStore = getStore({
      name: 'fixtures',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const fixtures = (await fixturesStore.get(`fixtures-${activeSeason.id}`, { type: 'json' })) as any[] | null;

    // Get index
    const indexKey = `availability-index-${activeSeason.id}`;
    const index = await availabilityStore.get(indexKey, { type: 'json' });

    // Get all availability records for fixtures
    const availabilityRecords: any[] = [];
    if (fixtures) {
      for (const fixture of fixtures) {
        const avail = await availabilityStore.get(`availability-${fixture.id}`, { type: 'json' });
        if (avail) {
          availabilityRecords.push({
            fixtureId: fixture.id,
            gameNumber: fixture.gameNumber,
            team: fixture.team,
            record: avail
          });
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activeSeason: {
          id: activeSeason.id,
          name: activeSeason.name
        },
        fixturesCount: fixtures?.length || 0,
        fixtures: fixtures?.slice(0, 3).map(f => ({ id: f.id, gameNumber: f.gameNumber, team: f.team })),
        indexExists: !!index,
        indexCount: Array.isArray(index) ? index.length : 0,
        index: index,
        availabilityRecordsCount: availabilityRecords.length,
        availabilityRecords: availabilityRecords
      }, null, 2),
    };
  } catch (error) {
    console.error('Debug error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
