import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession } from '../../src/middleware/auth';
import bcrypt from 'bcryptjs';
import { addAuditLog } from '../../src/utils/auditLog';

/**
 * Change admin user password
 * POST /api/admin-change-password
 * Body: { username, currentPassword, newPassword }
 * Authentication required
 * Returns: Success or error
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Validate session
    const cookieHeader = event.headers.cookie;
    const session = validateAdminSession(cookieHeader);

    if (!session) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { username, currentPassword, newPassword } = body;

    if (!username || !currentPassword || !newPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: username, currentPassword, newPassword',
        }),
      };
    }

    // Validate user can only change their own password
    if (session.username !== username) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: 'You can only change your own password',
        }),
      };
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'New password must be at least 8 characters long',
        }),
      };
    }

    // Get admin users store
    const adminUsersStore = getStore({
      name: 'admin-users',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Get all admin users
    const allUsers =
      (await adminUsersStore.get('users', { type: 'json' })) as
        | Array<{ username: string; passwordHash: string; createdAt: string; role?: string }>
        | null;

    if (!allUsers || allUsers.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No admin users found' }),
      };
    }

    // Find the user
    const user = allUsers.find((u) => u.username === username);

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Current password is incorrect' }),
      };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update user's password
    const updatedUsers = allUsers.map((u) =>
      u.username === username
        ? { ...u, passwordHash: newPasswordHash }
        : u
    );

    // Save updated users
    await adminUsersStore.setJSON('users', updatedUsers);

    // Wait for audit log to complete
    try {
      await addAuditLog(
        session.username,
        'admin_password_change',
        `Changed password for ${username}`,
        username
      );
    } catch (err) {
      console.error('Audit log failed:', err);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Password updated successfully',
      }),
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to change password',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
