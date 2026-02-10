import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { AdminUser, AdminRole } from '../../src/middleware/auth';

/**
 * One-time migration to add role field to existing admin users
 * POST /api/admin-migrate-roles
 * No authentication required (will be called once manually)
 * Returns: Success message
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
    // Get admin users store
    const store = getStore({
      name: 'admin-users',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Get existing users
    const users = (await store.get('users', { type: 'json' })) as any[] | null;

    if (!users || users.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No users to migrate',
        }),
      };
    }

    // Check if migration already done
    if (users[0].role !== undefined) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Users already have roles assigned',
        }),
      };
    }

    // Add role to each user
    const migratedUsers: AdminUser[] = users.map((user) => ({
      ...user,
      role: (user.username === 'admin' ? 'super_admin' : 'admin') as AdminRole,
    }));

    // Save migrated users
    await store.set('users', JSON.stringify(migratedUsers));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Migrated ${migratedUsers.length} users`,
        users: migratedUsers.map((u) => ({
          username: u.username,
          role: u.role,
        })),
      }),
    };
  } catch (error) {
    console.error('Error migrating roles:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to migrate roles',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
