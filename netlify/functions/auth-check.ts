import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { validateAdminSession } from '../../src/middleware/auth';

/**
 * Check if user has a valid admin session
 * GET /api/auth-check
 * Returns: Session status and user info
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    // Get cookie header
    const cookieHeader = event.headers.cookie;

    // Validate session
    const session = validateAdminSession(cookieHeader);

    if (!session) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          authenticated: false,
          error: 'No valid session',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authenticated: true,
        username: session.username,
        expiresAt: session.exp ? new Date(session.exp * 1000).toISOString() : null,
      }),
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        authenticated: false,
        error: 'Internal server error',
      }),
    };
  }
};
