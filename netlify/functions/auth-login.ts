import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
  verifyPassword,
  createSession,
  createSessionCookie,
  AdminUser,
} from '../../src/middleware/auth';

/**
 * Handle admin login
 * POST /api/auth-login
 * Body: { username, password }
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
    const { username, password } = body;

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username and password are required' }),
      };
    }

    // Get admin users from Netlify Blobs
    const store = getStore('admin-users');
    const users =
      (await store.get('users', { type: 'json' })) as AdminUser[] | null;

    if (!users || users.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Find user by username
    const user = users.find((u) => u.username === username);
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Create session token
    const token = createSession(username);

    // Determine if in production
    const isProduction = process.env.NODE_ENV === 'production';

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
        username,
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
