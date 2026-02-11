import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';
import { validateAdminSession, isMember } from '../../src/middleware/auth';
import type { Fixture, FixtureAvailability, CoreRosterAssignment, Player, PlayerAvailabilityRecord } from '../../src/types/player';

/**
 * Update member availability for a fixture (binary: true/false only, next 7 days only)
 * POST /.netlify/functions/member-availability-update
 * Body: { fixtureId, available, notes? }
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
    const { fixtureId, available } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!fixtureId || typeof available !== 'boolean') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: fixtureId (string), available (boolean)' }),
      };
    }

    // Calculate date range: today to +7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get fixture
    const seasonsStore = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const activeSeason = await seasonsStore.get('active-season', { type: 'json' }) as any;

    if (!activeSeason || !activeSeason.id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No active season found' }),
      };
    }

    const seasonId = activeSeason.id;

    const fixturesStore = getStore({
      name: 'fixtures',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const allFixtures = (await fixturesStore.get(`fixtures-${seasonId}`, { type: 'json' })) as Fixture[] | null;

    const fixture = allFixtures?.find(f => f.id === fixtureId);

    if (!fixture) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Fixture not found' }),
      };
    }

    // Check if fixture is within next 7 days
    const fixtureDate = new Date(fixture.date);
    fixtureDate.setHours(0, 0, 0, 0);

    if (fixtureDate < today) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Cannot update availability for past fixtures' }),
      };
    }

    if (fixtureDate > sevenDaysFromNow) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Can only update availability for fixtures in the next 7 days' }),
      };
    }

    // Verify player is on team roster for this fixture (any roster member - core or reserve)
    const coreRosterStore = getStore({
      name: 'core-roster',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const coreRosterKey = `core-roster-${fixture.seasonId}`;
    const coreRoster = (await coreRosterStore.get(coreRosterKey, { type: 'json' })) as CoreRosterAssignment[] | null;

    const playerOnTeam = coreRoster?.some(r => r.playerId === playerId && r.teamName === fixture.team);

    if (!playerOnTeam) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'You are not on the roster for this fixture\'s team' }),
      };
    }

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

    // Load or create availability record for fixture
    const availabilityStore = getStore({
      name: 'fixture-availability',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    let availabilityRecord = (await availabilityStore.get(
      `availability-${fixtureId}`,
      { type: 'json' }
    )) as FixtureAvailability | null;

    const now = new Date().toISOString();

    if (!availabilityRecord) {
      // Create new availability record
      availabilityRecord = {
        id: uuidv4(),
        fixtureId: fixture.id,
        seasonId: fixture.seasonId,
        gameNumber: fixture.gameNumber,
        date: fixture.date,
        team: fixture.team,
        opponent: fixture.opponent,
        venue: fixture.venue,
        playerAvailability: [],
        createdAt: now,
        updatedAt: now,
        updatedBy: session.email,
      };
    }

    // Find or create player availability record
    let playerAvailRecord = availabilityRecord.playerAvailability.find(
      pa => pa.playerId === playerId
    );

    if (playerAvailRecord) {
      // Update existing record - use the SAME wasAvailable field
      playerAvailRecord.wasAvailable = available;
      playerAvailRecord.submittedAt = now;
      playerAvailRecord.submittedBy = 'member';
      playerAvailRecord.lastUpdated = now;
    } else {
      // Create new player availability record
      playerAvailRecord = {
        playerId,
        playerName,
        wasAvailable: available, // Same field for both member and admin
        wasSelected: false, // Admin-managed field
        submittedAt: now,
        submittedBy: 'member',
        lastUpdated: now,
      };
      availabilityRecord.playerAvailability.push(playerAvailRecord);
    }

    // Update record metadata
    availabilityRecord.updatedAt = now;
    availabilityRecord.updatedBy = session.email;

    // Save to Blobs
    await availabilityStore.setJSON(`availability-${fixtureId}`, availabilityRecord);

    // Update availability index for the season
    const indexKey = `availability-index-${fixture.seasonId}`;
    let index = (await availabilityStore.get(indexKey, { type: 'json' })) as any[] | null;

    if (!index) {
      index = [];
    }

    // Check if fixture is already in index
    const existingIndex = index.findIndex(i => i.fixtureId === fixtureId);
    const indexEntry = {
      fixtureId: fixture.id,
      gameNumber: fixture.gameNumber,
      date: fixture.date,
      team: fixture.team,
      opponent: fixture.opponent,
      venue: fixture.venue,
    };

    if (existingIndex >= 0) {
      // Update existing entry
      index[existingIndex] = indexEntry;
    } else {
      // Add new entry
      index.push(indexEntry);
    }

    // Save updated index
    await availabilityStore.setJSON(indexKey, index);

    // Create audit log entry
    const auditLogsStore = getStore({
      name: 'audit-logs',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const auditLogs = (await auditLogsStore.get('logs', { type: 'json' })) || [];

    auditLogs.push({
      id: uuidv4(),
      timestamp: now,
      action: 'MEMBER_AVAILABILITY_UPDATE',
      username: session.email,
      details: `Updated availability for ${fixture.gameNumber} (${fixture.team} vs ${fixture.opponent}): ${available ? 'Available' : 'Not Available'}`,
      entityType: 'fixture-availability',
      entityId: fixtureId,
    });

    await auditLogsStore.setJSON('logs', auditLogs);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        available,
        submittedAt: now,
      }),
    };
  } catch (error) {
    console.error('Member availability update error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update availability',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
