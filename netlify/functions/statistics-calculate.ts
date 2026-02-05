import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession } from '../../src/middleware/auth';
import type {
  Player,
  CoreRosterAssignment,
  Fixture,
  FixtureAvailability,
  PlayerStatistics,
  SeasonStats,
  TeamSeasonStats,
  ClubSeasonStats,
  CareerStats,
  TeamStatisticsSummary,
  SeasonStatisticsSummary,
} from '../../src/types/player';

/**
 * Calculate player statistics across seasons
 * POST /api/statistics-calculate
 * Requires: Valid admin session
 * Body: { seasonId?, playerId? } - Optional: recalculate specific season or player
 * Returns: { success: true, playersUpdated: N, seasonsUpdated: M }
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

    // Only POST method allowed
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { seasonId, playerId } = body;

    // Get all stores
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const seasonsStore = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const fixturesStore = getStore({
      name: 'fixtures',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const coreRosterStore = getStore({
      name: 'core-roster',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const availabilityStore = getStore({
      name: 'fixture-availability',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const statisticsStore = getStore({
      name: 'player-statistics',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Load all players
    const allPlayers =
      (await playersStore.get('players-all', { type: 'json' })) as Player[] | null;

    if (!allPlayers) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to load players' }),
      };
    }

    // Filter players if specific playerId provided
    const playersToProcess = playerId
      ? allPlayers.filter((p) => p.id === playerId)
      : allPlayers.filter((p) => p.isActive);

    if (playersToProcess.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No players found to process' }),
      };
    }

    // Load all seasons
    const allSeasons =
      (await seasonsStore.get('seasons-list', { type: 'json' })) as any[] | null;

    if (!allSeasons) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to load seasons' }),
      };
    }

    // Filter seasons if specific seasonId provided
    const seasonsToProcess = seasonId
      ? allSeasons.filter((s) => s.id === seasonId)
      : allSeasons;

    // Calculate statistics for each player
    let playersUpdated = 0;
    const teamStatsSummaries: Map<string, TeamStatisticsSummary> = new Map();
    const seasonStatsSummaries: Map<string, SeasonStatisticsSummary> = new Map();

    for (const player of playersToProcess) {
      const playerStats: PlayerStatistics = {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        seasonStats: {},
        careerStats: {
          totalSeasons: 0,
          totalFixtures: 0,
          totalGamesPlayed: 0,
          careerAvailabilityRate: 0,
          careerSelectionRate: 0,
        },
        lastUpdated: new Date().toISOString(),
      };

      let careerTotalFixtures = 0;
      let careerTimesAvailable = 0;
      let careerGamesPlayed = 0;
      const seasonsParticipated = new Set<string>();

      // Process each season
      for (const season of seasonsToProcess) {
        // Load core roster for this season
        const coreRoster =
          (await coreRosterStore.get(`core-roster-${season.id}`, {
            type: 'json',
          })) as CoreRosterAssignment[] | null;

        // Find which teams this player is core to in this season
        const playerCoreAssignments =
          coreRoster?.filter(
            (assignment) =>
              assignment.playerId === player.id && assignment.isCore
          ) || [];

        if (playerCoreAssignments.length === 0) {
          // Player not core to any team this season
          continue;
        }

        seasonsParticipated.add(season.id);

        // Load fixtures for this season
        const fixtures =
          (await fixturesStore.get(`fixtures-${season.id}`, {
            type: 'json',
          })) as Fixture[] | null;

        if (!fixtures) continue;

        // Load ALL availability data for this season upfront (performance optimization)
        const availabilityMap = new Map<string, FixtureAvailability>();
        const availabilityIndex = (await availabilityStore.get(
          `availability-index-${season.id}`,
          { type: 'json' }
        )) as Array<{ fixtureId: string }> | null;

        if (availabilityIndex) {
          // Load all availability records in parallel
          const availabilityPromises = availabilityIndex.map(async (item) => {
            const availability = (await availabilityStore.get(
              `availability-${item.fixtureId}`,
              { type: 'json' }
            )) as FixtureAvailability | null;
            if (availability) {
              availabilityMap.set(item.fixtureId, availability);
            }
          });
          await Promise.all(availabilityPromises);
        }

        // Initialize season stats
        const seasonStats: SeasonStats = {
          seasonName: season.name,
          teamStats: {},
          clubStats: {
            totalFixtures: 0,
            timesAvailable: 0,
            gamesPlayed: 0,
            availabilityRate: 0,
            selectionRate: 0,
          },
        };

        const fixtureIdsProcessed = new Set<string>();

        // Process each team assignment
        for (const assignment of playerCoreAssignments) {
          const teamName = assignment.teamName;

          // Get fixtures for this team
          const teamFixtures = fixtures.filter((f) => f.team === teamName);

          let timesAvailable = 0;
          let gamesPlayed = 0;

          // Check availability records for each fixture (using cached data)
          for (const fixture of teamFixtures) {
            const availability = availabilityMap.get(fixture.id);

            if (!availability) continue;

            // Find player's availability record
            const playerRecord = availability.playerAvailability.find(
              (p) => p.playerId === player.id
            );

            if (playerRecord) {
              if (playerRecord.wasAvailable) timesAvailable++;
              if (playerRecord.wasSelected) gamesPlayed++;
            }

            fixtureIdsProcessed.add(fixture.id);
          }

          // Calculate team stats
          const totalFixtures = teamFixtures.length;
          const availabilityRate =
            totalFixtures > 0
              ? Math.round((timesAvailable / totalFixtures) * 100)
              : 0;
          const selectionRate =
            timesAvailable > 0
              ? Math.round((gamesPlayed / timesAvailable) * 100)
              : 0;

          seasonStats.teamStats[teamName] = {
            totalFixtures,
            timesAvailable,
            gamesPlayed,
            availabilityRate,
            selectionRate,
          };

          // Add to team summary
          const teamKey = `${teamName}-${season.id}`;
          if (!teamStatsSummaries.has(teamKey)) {
            teamStatsSummaries.set(teamKey, {
              seasonId: season.id,
              seasonName: season.name,
              teamName: teamName,
              totalPlayers: 0,
              totalFixtures: teamFixtures.length,
              averageAvailabilityRate: 0,
              averageSelectionRate: 0,
              playerStats: [],
            });
          }

          const teamSummary = teamStatsSummaries.get(teamKey)!;
          teamSummary.playerStats.push({
            playerId: player.id,
            playerName: playerStats.playerName,
            stats: seasonStats.teamStats[teamName],
          });
        }

        // Calculate club-level stats (aggregate across all teams, deduplicate fixtures)
        const clubTotalFixtures = fixtureIdsProcessed.size;
        let clubTimesAvailable = 0;
        let clubGamesPlayed = 0;

        for (const fixtureId of fixtureIdsProcessed) {
          const availability = availabilityMap.get(fixtureId);

          if (!availability) continue;

          const playerRecord = availability.playerAvailability.find(
            (p) => p.playerId === player.id
          );

          if (playerRecord) {
            if (playerRecord.wasAvailable) clubTimesAvailable++;
            if (playerRecord.wasSelected) clubGamesPlayed++;
          }
        }

        seasonStats.clubStats = {
          totalFixtures: clubTotalFixtures,
          timesAvailable: clubTimesAvailable,
          gamesPlayed: clubGamesPlayed,
          availabilityRate:
            clubTotalFixtures > 0
              ? Math.round((clubTimesAvailable / clubTotalFixtures) * 100)
              : 0,
          selectionRate:
            clubTimesAvailable > 0
              ? Math.round((clubGamesPlayed / clubTimesAvailable) * 100)
              : 0,
        };

        playerStats.seasonStats[season.id] = seasonStats;

        // Aggregate for career stats
        careerTotalFixtures += clubTotalFixtures;
        careerTimesAvailable += clubTimesAvailable;
        careerGamesPlayed += clubGamesPlayed;
      }

      // Calculate career stats
      playerStats.careerStats = {
        totalSeasons: seasonsParticipated.size,
        totalFixtures: careerTotalFixtures,
        totalGamesPlayed: careerGamesPlayed,
        careerAvailabilityRate:
          careerTotalFixtures > 0
            ? Math.round((careerTimesAvailable / careerTotalFixtures) * 100)
            : 0,
        careerSelectionRate:
          careerTimesAvailable > 0
            ? Math.round((careerGamesPlayed / careerTimesAvailable) * 100)
            : 0,
      };

      // Save player statistics
      await statisticsStore.setJSON(
        `player-stats-${player.id}`,
        playerStats
      );
      playersUpdated++;
    }

    // Calculate and save team summaries
    for (const [key, teamSummary] of teamStatsSummaries) {
      // Calculate averages
      const totalPlayers = teamSummary.playerStats.length;
      const sumAvailability = teamSummary.playerStats.reduce(
        (sum, p) => sum + p.stats.availabilityRate,
        0
      );
      const sumSelection = teamSummary.playerStats.reduce(
        (sum, p) => sum + p.stats.selectionRate,
        0
      );

      teamSummary.totalPlayers = totalPlayers;
      teamSummary.averageAvailabilityRate =
        totalPlayers > 0 ? Math.round(sumAvailability / totalPlayers) : 0;
      teamSummary.averageSelectionRate =
        totalPlayers > 0 ? Math.round(sumSelection / totalPlayers) : 0;

      await statisticsStore.setJSON(
        `team-stats-${teamSummary.teamName}-${teamSummary.seasonId}`,
        teamSummary
      );
    }

    // Calculate and save season summaries
    for (const season of seasonsToProcess) {
      const seasonKey = season.id;

      const seasonSummary: SeasonStatisticsSummary = {
        seasonId: season.id,
        seasonName: season.name,
        totalPlayers: 0,
        totalFixtures: 0,
        totalGamesPlayed: 0,
        averageAvailabilityRate: 0,
        averageSelectionRate: 0,
        teamSummaries: [],
      };

      // Get all team summaries for this season
      const seasonTeamSummaries = Array.from(teamStatsSummaries.values()).filter(
        (ts) => ts.seasonId === season.id
      );

      for (const teamSummary of seasonTeamSummaries) {
        seasonSummary.teamSummaries.push({
          teamName: teamSummary.teamName,
          totalPlayers: teamSummary.totalPlayers,
          totalFixtures: teamSummary.totalFixtures,
          averageAvailabilityRate: teamSummary.averageAvailabilityRate,
        });

        seasonSummary.totalPlayers += teamSummary.totalPlayers;
        seasonSummary.totalFixtures = Math.max(
          seasonSummary.totalFixtures,
          teamSummary.totalFixtures
        );
      }

      // Calculate season averages
      const allPlayerStats = seasonTeamSummaries.flatMap((ts) => ts.playerStats);
      const totalPlayers = new Set(allPlayerStats.map((p) => p.playerId)).size;
      const sumAvailability = allPlayerStats.reduce(
        (sum, p) => sum + p.stats.availabilityRate,
        0
      );
      const sumSelection = allPlayerStats.reduce(
        (sum, p) => sum + p.stats.selectionRate,
        0
      );
      const totalGamesPlayed = allPlayerStats.reduce(
        (sum, p) => sum + p.stats.gamesPlayed,
        0
      );

      seasonSummary.totalPlayers = totalPlayers;
      seasonSummary.totalGamesPlayed = totalGamesPlayed;
      seasonSummary.averageAvailabilityRate =
        allPlayerStats.length > 0
          ? Math.round(sumAvailability / allPlayerStats.length)
          : 0;
      seasonSummary.averageSelectionRate =
        allPlayerStats.length > 0
          ? Math.round(sumSelection / allPlayerStats.length)
          : 0;

      await statisticsStore.setJSON(`season-stats-${season.id}`, seasonSummary);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        playersUpdated,
        seasonsUpdated: seasonsToProcess.length,
      }),
    };
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to calculate statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
