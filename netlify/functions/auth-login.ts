import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';
import {
  verifyPassword,
  createSession,
  createSessionCookie,
  AdminUser,
  AuthRole,
} from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';

/**
 * Handle unified login (admin and member)
 * POST /api/auth-login
 * Body: { email, password } OR { username, password }
 * Returns: Success with cookie set, or error
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { username, email, password } = body;

    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email/username and password are required' }),
      };
    }

    // Determine if in production
    const isProduction = process.env.NODE_ENV === 'production';

    // STEP 1: Check admin-users store first
    const adminStore = getStore({
      name: 'admin-users',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const adminUsers =
      (await adminStore.get('users', { type: 'json' })) as AdminUser[] | null;

    if (adminUsers && adminUsers.length > 0) {
      const adminUser = adminUsers.find((u) => u.username === loginIdentifier);

      if (adminUser) {
        // Admin user found - verify password
        const isValid = await verifyPassword(password, adminUser.passwordHash);
        if (!isValid) {
          return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid credentials' }),
          };
        }

        // Get user role (with fallback for unmigrated users)
        const userRole = adminUser.role || (loginIdentifier === 'admin' ? 'super_admin' : 'admin');

        // Check if this admin has a linked player record (promoted member)
        const playersStore = getStore({
          name: 'players',
          siteID: process.env.SITE_ID || '',
          token: process.env.NETLIFY_AUTH_TOKEN || '',
        });
        const playersData = await playersStore.get('players-all', { type: 'json' });
        const players: Player[] = (playersData as Player[]) || [];

        // Find player by email matching admin username
        const linkedPlayer = players.find(
          (p) => p.email?.toLowerCase() === adminUser.username.toLowerCase()
        );

        // Use player ID if linked, otherwise use admin fallback
        const userId = linkedPlayer ? linkedPlayer.id : 'admin-' + adminUser.username;

        // Create session token
        const token = createSession(userId, loginIdentifier, userRole, adminUser.username);

        // Create session cookie
        const cookie = createSessionCookie(token, isProduction);

        return {
          statusCode: 200,
          headers: {
            'Set-Cookie': cookie,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            message: 'Login successful',
            user: {
              email: loginIdentifier,
              username: adminUser.username,
              role: userRole,
            },
            redirectTo: '/',
          }),
        };
      }
    }

    // STEP 2: Check players store for member login
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const playersData = await playersStore.get('players-all', { type: 'json' });
    const players: Player[] = (playersData as Player[]) || [];

    // Find player by email (case-insensitive)
    const normalizedEmail = loginIdentifier.toLowerCase().trim();
    const player = players.find(
      (p) => p.email?.toLowerCase() === normalizedEmail && p.passwordHash
    );

    if (!player) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Check if player has passwordHash (is a member)
    if (!player.passwordHash) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Check registration status
    if (player.registrationStatus === 'pending') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Registration pending approval by admin' }),
      };
    }

    if (player.registrationStatus === 'rejected') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Registration not approved' }),
      };
    }

    if (player.registrationStatus === 'suspended') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Account suspended. Contact admin.' }),
      };
    }

    // Verify password
    const isValid = await verifyPassword(password, player.passwordHash);
    if (!isValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Update lastLogin timestamp
    player.lastLogin = new Date().toISOString();
    await playersStore.setJSON('players-all', players);

    // Get role (default to 'member' if not set)
    const role: AuthRole = player.role_auth || 'member';

    // Create session token
    const token = createSession(player.id, player.email!, role);

    // Create session cookie
    const cookie = createSessionCookie(token, isProduction);

    // Create audit log entry
    const auditLogsStore = getStore({
      name: 'audit-logs',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const auditLogs = (await auditLogsStore.get('logs', { type: 'json' })) || [];

    auditLogs.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action: 'MEMBER_LOGIN',
      username: player.email,
      details: `Member login: ${player.firstName} ${player.lastName}`,
      entityType: 'player',
      entityId: player.id,
    });

    await auditLogsStore.setJSON('logs', auditLogs);

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        user: {
          id: player.id,
          email: player.email,
          firstName: player.firstName,
          lastName: player.lastName,
          role,
        },
        redirectTo: '/',
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
