import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession, AdminUser } from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';
import { v4 as uuidv4 } from 'uuid';

/**
 * Promote a registered member to admin or super_admin role
 * POST /.netlify/functions/admin-users-promote
 * Body: { playerId, role }
 * Requires: Super admin session
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Validate admin session
    const cookieHeader = event.headers.cookie;
    const session = validateAdminSession(cookieHeader);

    if (!session || session.role !== 'super_admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Super admin access required' }),
      };
    }

    // Parse request body
    const { playerId, role } = JSON.parse(event.body || '{}');

    // Validate inputs
    if (!playerId || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: playerId, role' }),
      };
    }

    if (role !== 'admin' && role !== 'super_admin') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid role. Must be "admin" or "super_admin"' }),
      };
    }

    // Load players
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const playersData = await playersStore.get('players-all', { type: 'json' });
    const players: Player[] = (playersData as Player[]) || [];

    // Find the player
    const player = players.find((p) => p.id === playerId);
    if (!player) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Player not found' }),
      };
    }

    // Check if player is an approved member
    if (player.registrationStatus !== 'approved') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Player must be an approved member' }),
      };
    }

    // Check if player already has admin role
    if (player.role_auth === 'admin' || player.role_auth === 'super_admin') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Player is already an admin' }),
      };
    }

    // Check if player has email (required for admin)
    if (!player.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Player must have an email address' }),
      };
    }

    // Update player record with admin role
    player.role_auth = role;
    const now = new Date().toISOString();

    // Save updated players
    await playersStore.setJSON('players-all', players);

    // Create admin user entry
    const adminStore = getStore({
      name: 'admin-users',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const adminUsers =
      (await adminStore.get('users', { type: 'json' })) as AdminUser[] | null;
    const users = adminUsers || [];

    // Check if admin user already exists for this email
    const existingAdmin = users.find((u) => u.username === player.email);
    if (!existingAdmin) {
      // Create new admin user record
      const newAdminUser: AdminUser = {
        username: player.email,
        passwordHash: player.passwordHash || '', // Use existing password from registration
        role: role as 'admin' | 'super_admin',
        createdAt: now,
      };
      users.push(newAdminUser);
      await adminStore.setJSON('users', users);
    }

    // Create audit log
    const auditLogsStore = getStore({
      name: 'audit-logs',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const auditLogs = (await auditLogsStore.get('logs', { type: 'json' })) || [];

    auditLogs.push({
      id: uuidv4(),
      timestamp: now,
      action: 'PROMOTE_TO_ADMIN',
      username: session.email,
      details: `Promoted member ${player.firstName} ${player.lastName} (${player.email}) to ${role}`,
      entityType: 'admin-user',
      entityId: playerId,
    });

    await auditLogsStore.setJSON('logs', auditLogs);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Member promoted to admin successfully',
        player: {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email,
          role: role,
        },
      }),
    };
  } catch (error) {
    console.error('Error promoting member:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to promote member',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
