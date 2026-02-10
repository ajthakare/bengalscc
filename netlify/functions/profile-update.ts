import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';
import { validateAdminSession, isMember, verifyPassword, hashPassword } from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';

/**
 * Update member profile (phone and/or password)
 * POST /.netlify/functions/profile-update
 * Body: { phone?, currentPassword?, newPassword? }
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
    // Validate member session
    const session = validateAdminSession(event.headers.cookie);
    if (!session || !isMember(session)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

    // Parse request
    const { phone, currentPassword, newPassword } = JSON.parse(event.body || '{}');

    // Must provide at least one field to update
    if (!phone && !currentPassword && !newPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No fields to update' }),
      };
    }

    // If changing password, both currentPassword and newPassword are required
    if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Both currentPassword and newPassword are required to change password' }),
      };
    }

    // Validate new password if provided
    if (newPassword && newPassword.length < 8) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'New password must be at least 8 characters' }),
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

    // Find player by userId from session
    const playerIndex = players.findIndex(p => p.id === session.userId);
    if (playerIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Player not found' }),
      };
    }

    const player = players[playerIndex];

    // If changing password, verify current password
    if (currentPassword && newPassword) {
      if (!player.passwordHash) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Player does not have a password set' }),
        };
      }

      const isValidPassword = await verifyPassword(currentPassword, player.passwordHash);
      if (!isValidPassword) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Current password is incorrect' }),
        };
      }

      // Hash new password
      player.passwordHash = await hashPassword(newPassword);
    }

    // Update phone if provided
    if (phone !== undefined) {
      // Allow empty string to clear phone
      if (phone.trim()) {
        // Validate phone format (expecting: "+1 1234567890")
        const phoneRegex = /^\+\d{1,4}\s\d{7,15}$/;
        if (!phoneRegex.test(phone.trim())) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid phone format. Expected format: +1 1234567890' }),
          };
        }
        player.phone = phone.trim();
      } else {
        player.phone = undefined;
      }
    }

    const now = new Date().toISOString();
    player.updatedAt = now;
    player.updatedBy = session.email;

    // Save updated players array
    await playersStore.setJSON('players-all', players);

    // Create audit log entry
    const auditLogsStore = getStore({
      name: 'audit-logs',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const auditLogs = (await auditLogsStore.get('logs', { type: 'json' })) || [];

    const updates: string[] = [];
    if (phone !== undefined) updates.push('phone');
    if (newPassword) updates.push('password');

    auditLogs.push({
      id: uuidv4(),
      timestamp: now,
      action: 'PROFILE_UPDATED',
      username: session.email,
      details: `Updated profile: ${updates.join(', ')}`,
      entityType: 'player',
      entityId: player.id,
    });

    await auditLogsStore.setJSON('logs', auditLogs);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Profile updated successfully',
      }),
    };
  } catch (error) {
    console.error('Profile update error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
