import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { hashPassword } from '../../src/middleware/auth';

interface AdminUser {
  username: string;
  passwordHash: string;
  createdAt: string;
}

/**
 * One-time setup function to create the first admin user
 * Reads FIRST_ADMIN_USERNAME and FIRST_ADMIN_PASSWORD from environment variables
 * Creates admin user in Netlify Blobs if it doesn't already exist
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    // Get environment variables
    const firstAdminUsername = process.env.FIRST_ADMIN_USERNAME;
    const firstAdminPassword = process.env.FIRST_ADMIN_PASSWORD;

    if (!firstAdminUsername || !firstAdminPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            'FIRST_ADMIN_USERNAME and FIRST_ADMIN_PASSWORD must be set in environment variables',
        }),
      };
    }

    // Get admin users store
    const store = getStore('admin-users');
    const existingUsers =
      (await store.get('users', { type: 'json' })) as AdminUser[] | null;

    // Check if any admin users already exist
    if (existingUsers && existingUsers.length > 0) {
      // Check if this username already exists
      const userExists = existingUsers.some(
        (user) => user.username === firstAdminUsername
      );

      if (userExists) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'First admin user already exists',
            username: firstAdminUsername,
          }),
        };
      }

      // Another admin exists but not this one - add this user too
      const passwordHash = await hashPassword(firstAdminPassword);
      const newUser: AdminUser = {
        username: firstAdminUsername,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      existingUsers.push(newUser);
      await store.set('users', JSON.stringify(existingUsers));

      return {
        statusCode: 201,
        body: JSON.stringify({
          message: 'Additional admin user created successfully',
          username: firstAdminUsername,
        }),
      };
    }

    // No admin users exist, create the first one
    const passwordHash = await hashPassword(firstAdminPassword);
    const firstAdmin: AdminUser = {
      username: firstAdminUsername,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await store.set('users', JSON.stringify([firstAdmin]));

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'First admin user created successfully',
        username: firstAdminUsername,
      }),
    };
  } catch (error) {
    console.error('Error creating first admin:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create first admin user',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
