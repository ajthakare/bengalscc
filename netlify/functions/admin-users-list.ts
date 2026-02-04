import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession, AdminUser } from '../../src/middleware/auth';

/**
 * List all admin users (without password hashes)
 * GET /api/admin-users-list
 * Requires: Valid admin session
 * Returns: Array of admin users
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

    // Get admin users from Netlify Blobs
    const store = getStore({
      name: 'admin-users',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const users =
      (await store.get('users', { type: 'json' })) as AdminUser[] | null;

    if (!users) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      };
    }

    // Return users without password hashes
    const safeUsers = users.map((user) => ({
      username: user.username,
      createdAt: user.createdAt,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(safeUsers),
    };
  } catch (error) {
    console.error('Error listing admin users:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to list admin users',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
