import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession, AdminUser } from '../../src/middleware/auth';
import { addAuditLog } from '../../src/utils/auditLog';

/**
 * Delete an admin user
 * DELETE /api/admin-users-delete
 * Body: { username }
 * Requires: Valid admin session
 * Returns: Success message
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only allow DELETE or POST requests
  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
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

    // Get user role (with fallback for old sessions without role)
    const userRole = session.role || (session.username === 'admin' ? 'super_admin' : 'admin');

    // Only super admin can delete users
    if (userRole !== 'super_admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden: Only super admins can delete admin users'
        }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { username } = body;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    // Prevent deleting self
    if (username === session.username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cannot delete your own account' }),
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

    if (!users || users.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    // Prevent deleting the last admin
    if (users.length === 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Cannot delete the last admin user',
        }),
      };
    }

    // Find user to delete
    const userIndex = users.findIndex((u) => u.username === username);
    if (userIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const deletedUser = users[userIndex];

    // Remove user from array
    users.splice(userIndex, 1);

    // Save updated users list
    await store.set('users', JSON.stringify(users));

    // Wait for audit log to complete
    try {
      await addAuditLog(
        session.username,
        'admin_user_delete',
        `Deleted admin user ${username} (role: ${deletedUser.role})`,
        username,
        { role: deletedUser.role }
      );
    } catch (err) {
      console.error('Audit log failed:', err);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Admin user deleted successfully',
        username,
      }),
    };
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to delete admin user',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
