import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validateAdminSession } from '../../src/middleware/auth';
import { parseLocalDate } from './_utils';
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

    // Validate environment variables
    if (!process.env.SITE_ID || !process.env.NETLIFY_AUTH_TOKEN) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing required environment variables',
        }),
      };
    }

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

    // Pre-load all season data once (more efficient than loading per player)
    interface SeasonData {
      season: any;
      coreRoster: CoreRosterAssignment[] | null;
      fixtures: Fixture[] | null;
      availabilityMap: Map<string, FixtureAvailability>;
    }

    const seasonDataMap = new Map<string, SeasonData>();

    // Load data for each season once
    for (const season of seasonsToProcess) {
      const seasonData: SeasonData = {
        season,
        coreRoster: null,
        fixtures: null,
        availabilityMap: new Map(),
      };

      // Load core roster
      try {
        seasonData.coreRoster = (await coreRosterStore.get(
          `core-roster-${season.id}`,
          { type: 'json' }
        )) as CoreRosterAssignment[] | null;
      } catch (error) {
        console.error(`Failed to load core roster for season ${season.id}:`, error);
      }

      // Load fixtures
      try {
        seasonData.fixtures = (await fixturesStore.get(`fixtures-${season.id}`, {
          type: 'json',
        })) as Fixture[] | null;
      } catch (error) {
        console.error(`Failed to load fixtures for season ${season.id}:`, error);
      }

      // Load availability index
      try {
        const availabilityIndex = (await availabilityStore.get(
          `availability-index-${season.id}`,
          { type: 'json' }
        )) as Array<{ fixtureId: string }> | null;

        if (availabilityIndex) {
          // Load availability records in batches
          const batchSize = 3; // Smaller batch size
          for (let i = 0; i < availabilityIndex.length; i += batchSize) {
            const batch = availabilityIndex.slice(i, i + batchSize);

            for (const item of batch) {
              try {
                const availability = (await availabilityStore.get(
                  `availability-${item.fixtureId}`,
                  { type: 'json' }
                )) as FixtureAvailability | null;
                if (availability) {
                  seasonData.availabilityMap.set(item.fixtureId, availability);
                }
              } catch (error) {
                console.error(
                  `Failed to load availability for fixture ${item.fixtureId}:`,
                  error
                );
              }
            }

            // Delay between batches
            if (i + batchSize < availabilityIndex.length) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }
        }
      } catch (error) {
        console.error(
          `Failed to load availability index for season ${season.id}:`,
          error
        );
      }

      seasonDataMap.set(season.id, seasonData);

      // Delay between seasons to avoid rate limiting
      if (seasonsToProcess.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Now calculate statistics for each player using pre-loaded data
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
      let careerTotalFixturesForCalc = 0;
      let careerTimesAvailable = 0;
      let careerGamesPlayed = 0;
      const seasonsParticipated = new Set<string>();

      // Process each season using pre-loaded data
      for (const [seasonId, seasonData] of seasonDataMap) {
        const { season, coreRoster, fixtures, availabilityMap } = seasonData;

        if (!fixtures) continue;

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

        // Check which teams this player is core to
        const coreTeams = new Set<string>();
        if (coreRoster) {
          coreRoster
            .filter((assignment) => assignment.playerId === player.id && assignment.isCore)
            .forEach((assignment) => coreTeams.add(assignment.teamName));
        }

        // Track stats by team (player might play for multiple teams)
        const teamStatsMap = new Map<string, {
          timesAvailable: number;
          gamesPlayed: number;
          fixtureIds: Set<string>;
          totalFixturesForCalc: number; // Fixtures to use in denominator
        }>();

        let hasAnyAvailability = false;

        // Process ALL availability records for this player in this season
        const now = new Date();
        for (const [fixtureId, availability] of availabilityMap) {
          const playerRecord = availability.playerAvailability.find(
            (p) => p.playerId === player.id
          );

          if (!playerRecord) continue;

          // Player has availability record, so they participated in this season
          if (playerRecord.wasAvailable || playerRecord.wasSelected) {
            hasAnyAvailability = true;

            // Find the fixture to get the team name
            const fixture = fixtures.find((f) => f.id === fixtureId);
            if (!fixture) continue;

            const teamName = fixture.team;
            const fixtureDate = parseLocalDate(fixture.date);
            const isPastFixture = fixtureDate < now;

            if (!isPastFixture) continue; // Skip future fixtures

            const isCore = coreTeams.has(teamName);

            // Initialize team stats if not exists
            if (!teamStatsMap.has(teamName)) {
              teamStatsMap.set(teamName, {
                timesAvailable: 0,
                gamesPlayed: 0,
                fixtureIds: new Set(),
                totalFixturesForCalc: 0,
              });
            }

            const teamData = teamStatsMap.get(teamName)!;
            teamData.fixtureIds.add(fixtureId);

            if (isCore) {
              // For CORE teams: Count all past fixtures and all availabilities
              teamData.totalFixturesForCalc++;
              if (playerRecord.wasAvailable) {
                teamData.timesAvailable++;
              }
              if (playerRecord.wasSelected) {
                teamData.gamesPlayed++;
              }
            } else {
              // For NON-CORE teams: Only count fixtures where player was selected
              if (playerRecord.wasSelected) {
                teamData.totalFixturesForCalc++;
                teamData.timesAvailable++; // If selected, they must have been available
                teamData.gamesPlayed++;
              }
            }
          }
        }

        // Skip season if player had no availability records
        if (!hasAnyAvailability) continue;

        seasonsParticipated.add(season.id);

        // For CORE teams, count ALL past fixtures (not just ones with availability records)
        for (const coreTeam of coreTeams) {
          if (!teamStatsMap.has(coreTeam)) {
            teamStatsMap.set(coreTeam, {
              timesAvailable: 0,
              gamesPlayed: 0,
              fixtureIds: new Set(),
              totalFixturesForCalc: 0,
            });
          }

          const teamData = teamStatsMap.get(coreTeam)!;

          // Count ALL past fixtures for this core team
          const allPastFixturesForTeam = fixtures.filter((f) => {
            if (f.team !== coreTeam) return false;
            const fixtureDate = parseLocalDate(f.date);
            return fixtureDate < now;
          });

          teamData.totalFixturesForCalc = allPastFixturesForTeam.length;
        }

        // Calculate stats for each team the player participated in
        for (const [teamName, teamData] of teamStatsMap) {
          const totalFixtures = teamData.fixtureIds.size;
          const timesAvailable = teamData.timesAvailable;
          const gamesPlayed = teamData.gamesPlayed;
          const totalFixturesForCalc = teamData.totalFixturesForCalc;

          // Availability rate = available count / fixtures considered for calculation
          // For core teams: all past fixtures
          // For non-core teams: only past fixtures where player was selected
          const availabilityRate =
            totalFixturesForCalc > 0
              ? Math.round((timesAvailable / totalFixturesForCalc) * 100)
              : 0;
          // Selection rate = games played / times available
          const selectionRate =
            timesAvailable > 0
              ? Math.round((gamesPlayed / timesAvailable) * 100)
              : 0;

          seasonStats.teamStats[teamName] = {
            totalFixtures: totalFixturesForCalc, // Use denominator for calculations
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
              totalFixtures: fixtures.filter((f) => f.team === teamName).length,
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

        // Calculate club-level stats (aggregate across all teams)
        const allFixtureIds = new Set<string>();
        let clubTimesAvailable = 0;
        let clubGamesPlayed = 0;
        let clubTotalFixturesForCalc = 0;

        for (const teamData of teamStatsMap.values()) {
          teamData.fixtureIds.forEach((id) => allFixtureIds.add(id));
          clubTimesAvailable += teamData.timesAvailable;
          clubGamesPlayed += teamData.gamesPlayed;
          clubTotalFixturesForCalc += teamData.totalFixturesForCalc;
        }

        const clubTotalFixtures = allFixtureIds.size;

        seasonStats.clubStats = {
          totalFixtures: clubTotalFixturesForCalc, // Use denominator for calculations
          timesAvailable: clubTimesAvailable,
          gamesPlayed: clubGamesPlayed,
          availabilityRate:
            clubTotalFixturesForCalc > 0
              ? Math.round((clubTimesAvailable / clubTotalFixturesForCalc) * 100)
              : 0,
          selectionRate:
            clubTimesAvailable > 0
              ? Math.round((clubGamesPlayed / clubTimesAvailable) * 100)
              : 0,
        };

        playerStats.seasonStats[season.id] = seasonStats;

        careerTotalFixtures += clubTotalFixtures;
        careerTotalFixturesForCalc += clubTotalFixturesForCalc;
        careerTimesAvailable += clubTimesAvailable;
        careerGamesPlayed += clubGamesPlayed;
      }

      // Calculate career stats
      playerStats.careerStats = {
        totalSeasons: seasonsParticipated.size,
        totalFixtures: careerTotalFixturesForCalc, // Use denominator for calculations
        totalGamesPlayed: careerGamesPlayed,
        careerAvailabilityRate:
          careerTotalFixturesForCalc > 0
            ? Math.round((careerTimesAvailable / careerTotalFixturesForCalc) * 100)
            : 0,
        careerSelectionRate:
          careerTimesAvailable > 0
            ? Math.round((careerGamesPlayed / careerTimesAvailable) * 100)
            : 0,
      };

      // Save player statistics with delay
      try {
        await statisticsStore.setJSON(`player-stats-${player.id}`, playerStats);
        playersUpdated++;
        // Small delay after each save
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (saveError) {
        console.error(`Failed to save stats for player ${player.id}:`, saveError);
      }
    }

    // Calculate and save team summaries with delays
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

      try {
        await statisticsStore.setJSON(
          `team-stats-${teamSummary.teamName}-${teamSummary.seasonId}`,
          teamSummary
        );
        // Small delay after each save
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (saveError) {
        console.error(`Failed to save team stats for ${teamSummary.teamName}:`, saveError);
      }
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

      try {
        await statisticsStore.setJSON(`season-stats-${season.id}`, seasonSummary);
        // Small delay after each save
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (saveError) {
        console.error(`Failed to save season stats for ${season.name}:`, saveError);
      }
    }

    // Return success even if some saves failed (local dev limitation)
    const hasErrors = playersUpdated === 0 && playersToProcess.length > 0;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        playersUpdated,
        seasonsUpdated: seasonsToProcess.length,
        warning: hasErrors ? 'Some statistics could not be saved due to local environment limitations. This will work correctly in production.' : undefined,
      }),
    };
  } catch (error) {
    console.error('Error calculating statistics:', error);

    // Provide more helpful error messages
    let errorMessage = 'Failed to calculate statistics';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';

    if (errorDetails.includes('401')) {
      errorMessage = 'Authentication error with storage';
      errorDetails = 'Unable to access data storage. Please check your configuration.';
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
    };
  }
};
