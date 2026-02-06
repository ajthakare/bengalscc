import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession } from '../../src/middleware/auth';
import type { Fixture } from '../../src/types/player';
import { addAuditLog } from '../../src/utils/auditLog';

/**
 * Update a fixture
 * PUT /api/fixtures-update
 * Requires: Valid admin session
 * Body: Partial<Fixture> & { id: string }
 * Returns: Updated fixture
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

    // Only PUT method allowed
    if (event.httpMethod !== 'PUT') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { id, seasonId, ...updates } = body;

    // Validate required ID
    if (!id || !seasonId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Fixture ID and Season ID are required' }),
      };
    }

    // Validate date if provided (expecting YYYY-MM-DD)
    if (updates.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updates.date)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD format.' }),
        };
      }
      const fixtureDate = new Date(updates.date + 'T00:00:00');
      if (isNaN(fixtureDate.getTime())) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid date. Please check the date is correct.' }),
        };
      }
      // Keep date as YYYY-MM-DD string (no timezone conversion)
    }

    // Get fixtures from Netlify Blobs
    const fixturesStore = getStore({
      name: 'fixtures',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const fixtures =
      (await fixturesStore.get(`fixtures-${seasonId}`, { type: 'json' })) as
        | Fixture[]
        | null;

    if (!fixtures || fixtures.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Fixture not found' }),
      };
    }

    // Find fixture to update
    const fixtureIndex = fixtures.findIndex(f => f.id === id);
    if (fixtureIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Fixture not found' }),
      };
    }

    const existingFixture = fixtures[fixtureIndex];

    // Update fixture
    const updatedFixture: Fixture = {
      ...existingFixture,
      ...updates,
      id: existingFixture.id, // Ensure ID doesn't change
      seasonId: existingFixture.seasonId, // Ensure seasonId doesn't change
      createdAt: existingFixture.createdAt, // Preserve creation date
      createdBy: existingFixture.createdBy, // Preserve creator
    };

    fixtures[fixtureIndex] = updatedFixture;

    // Save to Blobs
    await fixturesStore.setJSON(`fixtures-${seasonId}`, fixtures);

    // Add audit log (non-blocking)
    const changedFields = Object.keys(updates).filter(key =>
      JSON.stringify(existingFixture[key as keyof Fixture]) !== JSON.stringify(updates[key])
    );
    const description = changedFields.length > 0
      ? `Updated fixture ${existingFixture.gameNumber}: ${changedFields.join(', ')}`
      : `Updated fixture ${existingFixture.gameNumber}`;

    addAuditLog(
      session.username,
      'fixture_update',
      description,
      existingFixture.gameNumber,
      { seasonId, changedFields, updates }
    ).catch(err => console.error('Audit log failed:', err));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: updatedFixture,
        message: 'Fixture updated successfully',
      }),
    };
  } catch (error) {
    console.error('Error updating fixture:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update fixture',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
