import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';
import { validateAdminSession, isSuperAdmin } from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';

/**
 * Reject member registration (super admin only)
 * POST /.netlify/functions/members-reject
 * Body: { registrationId, reason }
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
    const { registrationId, reason } = JSON.parse(event.body || '{}');

    if (!registrationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: registrationId' }),
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

    // Find registration
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
        body: JSON.stringify({ error: 'Only pending registrations can be rejected' }),
      };
    }

    const now = new Date().toISOString();

    // Update registration status to rejected
    registration.registrationStatus = 'rejected';
    registration.updatedAt = now;
    registration.updatedBy = session.username || 'super_admin';

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
      action: 'MEMBER_REJECTED',
      username: session.email,
      details: `Rejected member registration: ${registration.firstName} ${registration.lastName} (${registration.email})${reason ? ` - Reason: ${reason}` : ''}`,
      entityType: 'player',
      entityId: registrationId,
    });

    await auditLogsStore.setJSON('logs', auditLogs);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Member registration rejected',
      }),
    };
  } catch (error) {
    console.error('Member rejection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to reject member',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
