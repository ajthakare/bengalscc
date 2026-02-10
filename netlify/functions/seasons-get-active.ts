import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import type { Season } from '../../src/types/player';

/**
 * Get currently active season
 * GET /api/seasons-get-active
 * Public endpoint - no authentication required
 * Returns: Active season or null
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    // Get seasons from Netlify Blobs
    const store = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Try to get from active-season cache first
    let activeSeason =
      (await store.get('active-season', { type: 'json' })) as Season | null;

    // If cache is empty, search through all seasons
    if (!activeSeason) {
      const seasons =
        (await store.get('seasons-list', { type: 'json' })) as Season[] | null;

      if (seasons && seasons.length > 0) {
        activeSeason = seasons.find((s) => s.isActive) || null;

        // Update cache if found
        if (activeSeason) {
          await store.setJSON('active-season', activeSeason);
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activeSeason),
    };
  } catch (error) {
    console.error('Error getting active season:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to get active season',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
