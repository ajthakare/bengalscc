import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession, AdminUser } from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';

/**
 * Check if user has a valid session (admin or member)
 * GET /api/auth-check
 * Returns: Session status and user info
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    // Get cookie header
    const cookieHeader = event.headers.cookie;

    // Validate session
    const session = validateAdminSession(cookieHeader);

    if (!session) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          authenticated: false,
          error: 'No valid session',
        }),
      };
    }

    // Determine user type by session role and load user data
    let userData: any = {};

    if (session.role === 'super_admin' || session.role === 'admin') {
      // Load from admin-users store
      const adminStore = getStore({
        name: 'admin-users',
        siteID: process.env.SITE_ID || '',
        token: process.env.NETLIFY_AUTH_TOKEN || '',
      });
      const adminUsers =
        (await adminStore.get('users', { type: 'json' })) as AdminUser[] | null;

      if (adminUsers) {
        const adminUser = adminUsers.find((u) => u.username === session.username);
        if (adminUser) {
          // Try to get firstName from player record if they have one
          const playersStore = getStore({
            name: 'players',
            siteID: process.env.SITE_ID || '',
            token: process.env.NETLIFY_AUTH_TOKEN || '',
          });
          const playersData = await playersStore.get('players-all', { type: 'json' });
          const players: Player[] = (playersData as Player[]) || [];
          const player = players.find((p) => p.id === session.userId);

          userData = {
            username: adminUser.username,
            role: session.role,
            firstName: player?.firstName || adminUser.username, // Use username as fallback
          };
        }
      }
    } else if (session.role === 'member') {
      // Load from players store
      const playersStore = getStore({
        name: 'players',
        siteID: process.env.SITE_ID || '',
        token: process.env.NETLIFY_AUTH_TOKEN || '',
      });
      const playersData = await playersStore.get('players-all', { type: 'json' });
      const players: Player[] = (playersData as Player[]) || [];

      const player = players.find((p) => p.id === session.userId);

      if (!player) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            authenticated: false,
            error: 'User not found',
          }),
        };
      }

      // Check if member is still approved
      if (player.registrationStatus !== 'approved') {
        return {
          statusCode: 401,
          body: JSON.stringify({
            authenticated: false,
            error: 'Account no longer active',
          }),
        };
      }

      userData = {
        id: player.id,
        email: player.email,
        firstName: player.firstName,
        lastName: player.lastName,
        phone: player.phone,
        role: session.role,
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authenticated: true,
        user: userData,
        expiresAt: session.exp ? new Date(session.exp * 1000).toISOString() : null,
      }),
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        authenticated: false,
        error: 'Internal server error',
      }),
    };
  }
};
