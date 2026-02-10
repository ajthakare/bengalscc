import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession } from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';
import { PLAYER_ROLES } from '../../src/types/player';
import { randomUUID } from 'crypto';
import { addAuditLog } from '../../src/utils/auditLog';

/**
 * Create a new player in the global pool
 * POST /api/players-create
 * Requires: Valid admin session
 * Body: { firstName, lastName, email, usacId, role, isActive }
 * Returns: Created player
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

    // Only POST method allowed
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { firstName, lastName, email, phone, usacId, role, isActive } = body;

    // Validate required fields (only firstName and lastName are mandatory)
    if (!firstName || !lastName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields',
          required: ['firstName', 'lastName'],
        }),
      };
    }

    // Validate field lengths
    if (firstName.trim().length < 1 || firstName.trim().length > 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'First name must be between 1 and 100 characters' }),
      };
    }

    if (lastName.trim().length < 1 || lastName.trim().length > 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Last name must be between 1 and 100 characters' }),
      };
    }

    // Validate email if provided
    if (email) {
      if (email.trim().length > 255) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Email must be less than 255 characters' }),
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid email format' }),
        };
      }
    }

    // Validate phone if provided (expecting format: "+1 1234567890")
    if (phone && phone.trim()) {
      const phoneRegex = /^\+\d{1,4}\s\d{7,15}$/;
      if (!phoneRegex.test(phone.trim())) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid phone format. Expected format: +1 1234567890' }),
        };
      }
    }

    // Validate USAC ID if provided
    if (usacId && (usacId.trim().length < 1 || usacId.trim().length > 50)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'USAC ID must be between 1 and 50 characters' }),
      };
    }

    // Validate role if provided
    if (role && !PLAYER_ROLES.includes(role)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid role',
          validRoles: PLAYER_ROLES,
        }),
      };
    }

    // Get players from Netlify Blobs
    const store = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const existingPlayers =
      (await store.get('players-all', { type: 'json' })) as Player[] | null;

    const players = existingPlayers || [];

    // Check for duplicate email (only if email is provided)
    if (email) {
      const duplicateEmail = players.find(
        (p) => p.email && p.email.toLowerCase() === email.toLowerCase()
      );
      if (duplicateEmail) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'A player with this email already exists' }),
        };
      }
    }

    // Check for duplicate USAC ID (only if USAC ID is provided)
    if (usacId) {
      const duplicateUsacId = players.find(
        (p) => p.usacId && p.usacId.toLowerCase() === usacId.toLowerCase()
      );
      if (duplicateUsacId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'A player with this USAC ID already exists' }),
        };
      }
    }

    // Create new player
    const newPlayer: Player = {
      id: randomUUID(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      phone: phone ? phone.trim() : undefined,
      usacId: usacId ? usacId.trim() : undefined,
      role: role || undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.username,
      updatedBy: session.username,
    };

    // Add to players list
    players.push(newPlayer);

    // Save to Blobs
    await store.setJSON('players-all', players);

    // Wait for audit log to complete
    try {
      await addAuditLog(
        session.username,
        'player_create',
        `Added player ${firstName} ${lastName} to player pool`,
        `${firstName} ${lastName}`,
        { email, usacId, role, isActive }
      );
    } catch (err) {
      console.error('Audit log failed:', err);
    }

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: newPlayer,
        message: 'Player created successfully',
      }),
    };
  } catch (error) {
    console.error('Error creating player:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create player',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
