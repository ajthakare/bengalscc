import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession, isMember } from '../../src/middleware/auth';
import type { Fixture, FixtureAvailability, CoreRosterAssignment, Player } from '../../src/types/player';
import { parseLocalDate } from './_utils';

/**
 * List upcoming fixtures for authenticated member (next 7 days only)
 * GET /.netlify/functions/member-fixtures-list
 * Requires: Member session
 * Returns: Array of fixtures for player's teams with availability info
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
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
    console.log('[Fixtures List] Player ID:', playerId);

    // Calculate date range: today to +7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    console.log('[Fixtures List] Date range:', today.toISOString(), 'to', sevenDaysFromNow.toISOString());

    // Get active season
    const seasonsStore = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const activeSeason = await seasonsStore.get('active-season', { type: 'json' }) as any;
    console.log('[Fixtures List] Active season:', activeSeason);

    if (!activeSeason || !activeSeason.id) {
      console.log('[Fixtures List] No active season - returning empty array');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      };
    }

    const seasonId = activeSeason.id;

    // Get player's core roster assignments for this season
    const coreRosterStore = getStore({
      name: 'core-roster',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const coreRosterKey = `core-roster-${seasonId}`;
    const coreRoster = (await coreRosterStore.get(coreRosterKey, { type: 'json' })) as CoreRosterAssignment[] | null;
    console.log('[Fixtures List] Core roster entries:', coreRoster?.length || 0);

    // Find player's team assignments (any roster member - core or reserve)
    const playerTeams = coreRoster
      ? coreRoster.filter(r => r.playerId === playerId).map(r => r.teamName)
      : [];
    console.log('[Fixtures List] Player teams:', playerTeams);

    if (playerTeams.length === 0) {
      // Player not assigned to any team
      console.log('[Fixtures List] Player not assigned to any team - returning empty array');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      };
    }

    // Get all fixtures for the season
    const fixturesStore = getStore({
      name: 'fixtures',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const allFixtures = (await fixturesStore.get(`fixtures-${seasonId}`, { type: 'json' })) as Fixture[] | null;
    console.log('[Fixtures List] Total fixtures in season:', allFixtures?.length || 0);

    if (!allFixtures || allFixtures.length === 0) {
      console.log('[Fixtures List] No fixtures in season - returning empty array');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      };
    }

    // Filter fixtures:
    // 1. For player's teams
    // 2. Within next 7 days (inclusive)
    const upcomingFixtures = allFixtures.filter(fixture => {
      const fixtureDate = parseLocalDate(fixture.date);
      fixtureDate.setHours(0, 0, 0, 0);

      return (
        playerTeams.includes(fixture.team) &&
        fixtureDate >= today &&
        fixtureDate <= sevenDaysFromNow
      );
    });
    console.log('[Fixtures List] Upcoming fixtures (next 7 days):', upcomingFixtures.length);

    // Sort by date
    upcomingFixtures.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get availability records for these fixtures
    const availabilityStore = getStore({
      name: 'fixture-availability',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Enrich fixtures with availability info
    const enrichedFixtures = await Promise.all(
      upcomingFixtures.map(async (fixture) => {
        // Get availability record for this fixture
        const availabilityRecord = (await availabilityStore.get(
          `availability-${fixture.id}`,
          { type: 'json' }
        )) as FixtureAvailability | null;

        // Find player's availability in the record
        let myAvailability: boolean | null = null;
        let submittedAt: string | null = null;
        let notes: string | null = null;
        let availabilityCounts = { available: 0, unavailable: 0, noResponse: 0 };

        if (availabilityRecord) {
          const playerAvail = availabilityRecord.playerAvailability.find(
            pa => pa.playerId === playerId
          );

          if (playerAvail) {
            myAvailability = playerAvail.wasAvailable ?? null;
            submittedAt = playerAvail.submittedAt ?? null;
          }

          // Calculate availability counts for the team
          availabilityCounts = availabilityRecord.playerAvailability.reduce(
            (counts, pa) => {
              if (pa.wasAvailable === true) counts.available++;
              else if (pa.wasAvailable === false) counts.unavailable++;
              else counts.noResponse++;
              return counts;
            },
            { available: 0, unavailable: 0, noResponse: 0 }
          );
        }

        // Can update if fixture is within next 7 days (which it is by our filter)
        const canUpdate = true;

        return {
          id: fixture.id,
          gameNumber: fixture.gameNumber,
          date: fixture.date,
          time: fixture.time,
          team: fixture.team,
          opponent: fixture.opponent,
          venue: fixture.venue,
          division: fixture.division,
          groundAddress: fixture.groundAddress,
          isHomeTeam: fixture.isHomeTeam,
          myAvailability,
          submittedAt,
          canUpdate,
          availabilityCounts,
        };
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedFixtures),
    };
  } catch (error) {
    console.error('Member fixtures list error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to load fixtures',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
