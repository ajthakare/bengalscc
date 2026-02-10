import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';
import { validateAdminSession, isSuperAdmin } from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';

/**
 * Approve member registration (super admin only)
 * POST /.netlify/functions/members-approve
 * Body: { registrationId, targetPlayerId, playerRole }
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
    // Validate super admin session
    const session = validateAdminSession(event.headers.cookie);
    if (!session || !isSuperAdmin(session)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Super admin access required' }),
      };
    }

    // Parse request
    const { registrationId, targetPlayerId, playerRole } = JSON.parse(event.body || '{}');

    if (!registrationId || !targetPlayerId || !playerRole) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: registrationId, targetPlayerId, playerRole' }),
      };
    }

    // Load players
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const playersData = await playersStore.get('players-all', { type: 'json' });
    let players: Player[] = (playersData as Player[]) || [];

    // Find pending registration
    const registrationIndex = players.findIndex(p => p.id === registrationId);
    if (registrationIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Registration not found' }),
      };
    }

    const registration = players[registrationIndex];

    // Check if registration is pending
    if (registration.registrationStatus !== 'pending') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Registration is not pending' }),
      };
    }

    // Find target player
    const targetPlayerIndex = players.findIndex(p => p.id === targetPlayerId);
    if (targetPlayerIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Target player not found' }),
      };
    }

    const targetPlayer = players[targetPlayerIndex];

    // Check if target player already has a password (is already a member)
    if (targetPlayer.passwordHash) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Target player is already a member' }),
      };
    }

    const now = new Date().toISOString();

    // Update target player with ALL registration info
    targetPlayer.firstName = registration.firstName;
    targetPlayer.lastName = registration.lastName;
    targetPlayer.email = registration.email;
    targetPlayer.phone = registration.phone;
    targetPlayer.role = playerRole; // Position
    targetPlayer.passwordHash = registration.passwordHash;
    targetPlayer.registrationStatus = 'approved';
    targetPlayer.role_auth = 'member';
    targetPlayer.approvedAt = now;
    targetPlayer.approvedBy = session.username;
    targetPlayer.registeredAt = registration.registeredAt;
    targetPlayer.isActive = true;
    targetPlayer.updatedAt = now;
    targetPlayer.updatedBy = session.username || 'super_admin';

    // Remove the pending registration record
    players.splice(registrationIndex, 1);

    // Save updated players array
    await playersStore.setJSON('players-all', players);

    // Create audit log entry
    const auditLogsStore = getStore({
      name: 'audit-logs',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const auditLogs = (await auditLogsStore.get('logs', { type: 'json' })) || [];

    auditLogs.push({
      id: uuidv4(),
      timestamp: now,
      action: 'MEMBER_APPROVED',
      username: session.email,
      details: `Approved member registration: ${registration.firstName} ${registration.lastName} (${registration.email}) → Player ID ${targetPlayerId}`,
      entityType: 'player',
      entityId: targetPlayerId,
    });

    await auditLogsStore.setJSON('logs', auditLogs);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        player: {
          id: targetPlayer.id,
          email: targetPlayer.email,
          firstName: targetPlayer.firstName,
          lastName: targetPlayer.lastName,
          registrationStatus: 'approved',
        },
      }),
    };
  } catch (error) {
    console.error('Member approval error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to approve member',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
