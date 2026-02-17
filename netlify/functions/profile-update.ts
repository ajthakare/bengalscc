import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';
import { validateAdminSession, isMember, verifyPassword, hashPassword } from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';

/**
 * Update member profile (phone, password, usacId, playerRole, emergency contact, and/or job info)
 * POST /.netlify/functions/profile-update
 * Body: { phone?, currentPassword?, newPassword?, usacId?, playerRole?, emergencyContactName?, emergencyContactNumber?, jobCompany?, jobTitle? }
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
    const {
      phone,
      currentPassword,
      newPassword,
      usacId,
      playerRole,
      emergencyContactName,
      emergencyContactNumber,
      jobCompany,
      jobTitle
    } = JSON.parse(event.body || '{}');

    // Must provide at least one field to update
    if (!phone && !currentPassword && !newPassword && usacId === undefined && !playerRole &&
        !emergencyContactName && !emergencyContactNumber && jobCompany === undefined && jobTitle === undefined) {
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

    // Update USAC ID if provided
    if (usacId !== undefined) {
      // Allow empty string to clear USAC ID
      if (usacId.trim()) {
        player.usacId = usacId.trim();
      } else {
        player.usacId = undefined;
      }
    }

    // Update player role if provided
    if (playerRole) {
      const validRoles = ['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper', 'Wicket Keeper Batsman'];
      if (!validRoles.includes(playerRole)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid player role' }),
        };
      }
      player.role = playerRole;
    }

    // Update emergency contact name if provided
    if (emergencyContactName !== undefined) {
      if (!emergencyContactName.trim()) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Emergency contact name cannot be empty' }),
        };
      }
      if (emergencyContactName.length > 100) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Emergency contact name must be max 100 characters' }),
        };
      }
      player.emergencyContactName = emergencyContactName.trim();
    }

    // Update emergency contact number if provided
    if (emergencyContactNumber !== undefined) {
      if (!emergencyContactNumber.trim()) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Emergency contact number cannot be empty' }),
        };
      }
      // Validate emergency phone format (expecting: "+1 1234567890")
      const emergencyPhoneRegex = /^\+\d{1,4}\s\d{7,15}$/;
      if (!emergencyPhoneRegex.test(emergencyContactNumber.trim())) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid emergency contact number format. Expected format: +1 1234567890' }),
        };
      }
      player.emergencyContactNumber = emergencyContactNumber.trim();
    }

    // Update job company if provided
    if (jobCompany !== undefined) {
      // Allow empty string to clear job company
      if (jobCompany.trim()) {
        if (jobCompany.length > 200) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Company name must be max 200 characters' }),
          };
        }
        player.jobCompany = jobCompany.trim();
      } else {
        player.jobCompany = undefined;
      }
    }

    // Update job title if provided
    if (jobTitle !== undefined) {
      // Allow empty string to clear job title
      if (jobTitle.trim()) {
        if (jobTitle.length > 200) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Job title must be max 200 characters' }),
          };
        }
        player.jobTitle = jobTitle.trim();
      } else {
        player.jobTitle = undefined;
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
    if (usacId !== undefined) updates.push('USAC ID');
    if (playerRole) updates.push('playing role');
    if (emergencyContactName !== undefined) updates.push('emergency contact name');
    if (emergencyContactNumber !== undefined) updates.push('emergency contact number');
    if (jobCompany !== undefined) updates.push('job company');
    if (jobTitle !== undefined) updates.push('job title');

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
