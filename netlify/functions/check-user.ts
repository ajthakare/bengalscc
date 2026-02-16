import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/**
 * Debug function to check user status
 * GET /.netlify/functions/check-user?email=user@example.com
 */
export const handler: Handler = async (event) => {
  const email = event.queryStringParameters?.email;

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Please provide ?email=user@example.com' }),
    };
  }

  try {
    // Check players store
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const players = (await playersStore.get('players-all', { type: 'json' })) as any[] || [];
    const player = players.find((p: any) => p.email?.toLowerCase() === email.toLowerCase());

    // Check admin-users store
    const adminStore = getStore({
      name: 'admin-users',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const adminUsers = (await adminStore.get('users', { type: 'json' })) as any[] || [];
    const adminUser = adminUsers?.find((u: any) => u.username === email);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        inPlayers: !!player,
        inAdminUsers: !!adminUser,
        playerData: player ? {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email,
          role_auth: player.role_auth,
          registrationStatus: player.registrationStatus,
          hasPassword: !!player.passwordHash,
          isActive: player.isActive,
          migratedFrom: player.migratedFrom,
        } : null,
        adminUserData: adminUser ? {
          username: adminUser.username,
          role: adminUser.role,
          hasPassword: !!adminUser.passwordHash,
          createdAt: adminUser.createdAt,
        } : null,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to check user',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
