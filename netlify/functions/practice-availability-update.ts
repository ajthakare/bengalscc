import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession, isMember } from '../../src/middleware/auth';
import type { PracticeSession, CoreRosterAssignment, Player } from '../../src/types/player';
import { addAuditLog } from '../../src/utils/auditLog';

/**
 * Update member availability for a practice session
 * POST /.netlify/functions/practice-availability-update
 * Body: { practiceId, response }
 * Response: 'yes' | 'bowling-only' | 'not-available' | null
 * Requires: Member session
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
    // Validate member session
    const session = validateAdminSession(event.headers.cookie);
    if (!session || !isMember(session)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Member authentication required' }),
      };
    }

    // Get player ID from session
    const playerId = session.userId;

    // Parse request body
    const { practiceId, response } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!practiceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: practiceId' }),
      };
    }

    // Validate response value (null is allowed to clear response)
    if (response !== null && response !== 'yes' && response !== 'bowling-only' && response !== 'not-available') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid response value. Must be "yes", "bowling-only", "not-available", or null.',
        }),
      };
    }

    // Get practice from Blobs
    const practicesStore = getStore({
      name: 'practice-sessions',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const practice = await practicesStore.get(`practice-${practiceId}`, { type: 'json' }) as PracticeSession | null;

    if (!practice) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Practice session not found' }),
      };
    }

    // Verify practice is active
    if (practice.status !== 'active') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Cannot update availability for cancelled or completed practices' }),
      };
    }

    // Check if practice is locked
    if (practice.locked) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'This practice session is locked by admin. Please reach out to admin to check if availability change is allowed.' }),
      };
    }

    // Validate response based on practice type
    if (response === 'bowling-only' && practice.type !== 'net') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: '"bowling-only" response is only valid for net practice sessions',
        }),
      };
    }

    // Verify practice date is in the future
    const practiceDate = new Date(practice.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (practiceDate < today) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Cannot update availability for past practice sessions' }),
      };
    }

    // All practices are open to all players - no roster check needed

    // Get player name
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const allPlayers = (await playersStore.get('players-all', { type: 'json' })) as Player[] | null;
    const player = allPlayers?.find(p => p.id === playerId);

    if (!player) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Player not found' }),
      };
    }

    const playerName = `${player.firstName} ${player.lastName}`;
    const now = new Date().toISOString();

    // Find or create player availability record
    let playerAvailRecord = practice.playerAvailability.find(
      pa => pa.playerId === playerId
    );

    if (playerAvailRecord) {
      // Update existing record
      playerAvailRecord.response = response;
      playerAvailRecord.submittedAt = response !== null ? now : playerAvailRecord.submittedAt;
      playerAvailRecord.lastUpdated = now;
    } else {
      // Create new player availability record
      playerAvailRecord = {
        playerId,
        playerName,
        response,
        submittedAt: response !== null ? now : undefined,
        lastUpdated: now,
      };
      practice.playerAvailability.push(playerAvailRecord);
    }

    // Update practice metadata
    practice.updatedAt = now;
    practice.updatedBy = session.email || session.username;

    // Save to Blobs
    await practicesStore.setJSON(`practice-${practiceId}`, practice);

    // Create audit log
    try {
      const responseText = response === null ? 'No Response' :
        response === 'yes' ? 'Yes' :
        response === 'bowling-only' ? 'Bowling Only' :
        'Not Available';

      await addAuditLog(
        session.email || session.username,
        'practice_availability_updated',
        `Updated availability for practice "${practice.title}": ${responseText}`,
        practiceId,
        { response, practiceTitle: practice.title, practiceDate: practice.date }
      );
    } catch (err) {
      console.error('Audit log failed:', err);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        response,
        submittedAt: playerAvailRecord.submittedAt || null,
        lastUpdated: now,
      }),
    };
  } catch (error) {
    console.error('Practice availability update error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update practice availability',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
