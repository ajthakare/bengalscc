import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession } from '../../src/middleware/auth';
import type { PracticeSession } from '../../src/types/player';

/**
 * Get a single practice session with all player responses
 * GET /.netlify/functions/practice-get?practiceId=...
 * Requires: Valid admin session
 * Returns: Practice session with full details
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

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const { practiceId } = params;

    if (!practiceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Practice ID is required' }),
      };
    }

    // Get practice from Blobs
    const practicesStore = getStore({
      name: 'practice-sessions',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const practice = await practicesStore.get(`practice-${practiceId}`, { type: 'json' }) as PracticeSession | null;

    if (!practice) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Practice session not found' }),
      };
    }

    // Calculate stats
    const totalPlayers = practice.playerAvailability.length;
    const yesCount = practice.playerAvailability.filter(p => p.response === 'yes').length;
    const bowlingOnlyCount = practice.playerAvailability.filter(p => p.response === 'bowling-only').length;
    const notAvailableCount = practice.playerAvailability.filter(p => p.response === 'not-available').length;
    const noResponseCount = practice.playerAvailability.filter(p => p.response === null).length;
    const respondedCount = totalPlayers - noResponseCount;
    const responseRate = totalPlayers > 0 ? Math.round((respondedCount / totalPlayers) * 100) : 0;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: {
          ...practice,
          stats: {
            totalPlayers,
            respondedCount,
            yesCount,
            bowlingOnlyCount,
            notAvailableCount,
            noResponseCount,
            responseRate,
          },
        },
      }),
    };
  } catch (error) {
    console.error('Error fetching practice:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch practice session',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
