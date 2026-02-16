import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/**
 * Fix admin role mismatch
 * POST /.netlify/functions/fix-admin-role
 * Body: { email: "user@example.com", role: "super_admin" }
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, role } = body;

    if (!email || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and role required' }),
      };
    }

    if (role !== 'super_admin' && role !== 'admin') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Role must be "super_admin" or "admin"' }),
      };
    }

    // Get players store
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const players = (await playersStore.get('players-all', { type: 'json' })) as any[] || [];
    const playerIndex = players.findIndex((p: any) => p.email?.toLowerCase() === email.toLowerCase());

    if (playerIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Player not found' }),
      };
    }

    const oldRole = players[playerIndex].role_auth;

    // Update role
    players[playerIndex].role_auth = role;
    players[playerIndex].updatedAt = new Date().toISOString();
    players[playerIndex].updatedBy = 'fix-admin-role-function';

    // Save
    await playersStore.setJSON('players-all', players);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Role updated from "${oldRole}" to "${role}"`,
        email,
        oldRole,
        newRole: role,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fix role',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
