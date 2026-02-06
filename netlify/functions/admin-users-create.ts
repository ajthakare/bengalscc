import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
  validateAdminSession,
  hashPassword,
  AdminUser,
} from '../../src/middleware/auth';
import { addAuditLog } from '../../src/utils/auditLog';

/**
 * Create a new admin user
 * POST /api/admin-users-create
 * Body: { username, password }
 * Requires: Valid admin session
 * Returns: Success message
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
    // Validate admin session
    const cookieHeader = event.headers.cookie;
    const session = validateAdminSession(cookieHeader);

    if (!session) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Get current user's role (with fallback for old sessions without role)
    const currentUserRole = session.role || (session.username === 'admin' ? 'super_admin' : 'admin');

    // Only super admin can create users
    if (currentUserRole !== 'super_admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden: Only super admins can create new admin users'
        }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { username, password, role } = body;

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username and password are required' }),
      };
    }

    // Validate role
    const userRole = role || 'admin';
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid role. Must be "super_admin" or "admin"' }),
      };
    }

    // Validate username (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            'Username must be 3-20 characters and contain only letters, numbers, and underscores',
        }),
      };
    }

    // Validate password (min 8 chars)
    if (password.length < 8) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Password must be at least 8 characters',
        }),
      };
    }

    // Get admin users from Netlify Blobs
    const store = getStore({
      name: 'admin-users',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const users =
      (await store.get('users', { type: 'json' })) as AdminUser[] | null;

    const existingUsers = users || [];

    // Check if username already exists
    const userExists = existingUsers.some((u) => u.username === username);
    if (userExists) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username already exists' }),
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new user
    const newUser: AdminUser = {
      username,
      passwordHash,
      role: userRole,
      createdAt: new Date().toISOString(),
    };

    // Add to users array
    existingUsers.push(newUser);

    // Save to Netlify Blobs
    await store.set('users', JSON.stringify(existingUsers));

    // Add audit log (non-blocking)
    addAuditLog(
      session.username,
      'admin_user_create',
      `Created admin user ${username} with role ${userRole}`,
      username,
      { role: userRole }
    ).catch(err => console.error('Audit log failed:', err));

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Admin user created successfully',
        username,
      }),
    };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create admin user',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
