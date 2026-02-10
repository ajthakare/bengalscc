// Player Management System - Type Definitions

// ============================================================================
// Season Management
// ============================================================================

export interface Season {
  id: string;                    // UUID
  name: string;                  // "2025-2026"
  startDate: string;             // ISO date
  endDate: string;               // ISO date
  isActive: boolean;             // Only one season active at a time
  teams: TeamDefinition[];       // Teams for this season (flexible, can change)
  createdAt: string;
  createdBy: string;
}

export interface TeamDefinition {
  teamName: string;              // Team name (flexible per season)
  division: string;              // "WB-D2", "WB-D3", "PB-D1", "T20", "T30", "T40", etc.
  captain?: string;              // Player ID
  viceCaptain?: string;          // Player ID
}

// ============================================================================
// Fixture Management
// ============================================================================

export interface Fixture {
  id: string;                    // UUID
  seasonId: string;
  gameNumber: string;            // "Game 1", "Game 2", etc.
  date: string;                  // ISO date
  time: string;
  team: string;                  // Team name from season
  opponent: string;
  venue: string;
  groundAddress?: string;        // Ground address (optional)
  umpiringTeam?: string;         // Umpiring team (optional)
  division: string;
  isHomeTeam: boolean;           // True if our team is home team
  result?: 'win' | 'loss' | 'tie' | 'abandoned' | 'forfeit';  // Match result
  playerOfMatch?: string;        // Player ID (if result is 'win')
  paidUmpireFee?: boolean;       // Whether umpire fee was paid
  umpireFeePaidBy?: string;      // Player ID who paid the fee
  umpireFeeAmount?: number;      // Amount paid for umpire fee
  youtubeVideoUrl?: string;      // YouTube video link (live or recorded)
  scoringAppUrl?: string;        // Scoring app link (e.g., CricHeroes)
  createdAt: string;
  createdBy: string;
}

// ============================================================================
// Player Management (Global Pool)
// ============================================================================

export interface Player {
  id: string;                    // UUID
  firstName: string;
  lastName: string;
  email?: string;                // Optional - can be added later
  usacId?: string;               // USAC ID - Optional
  role?: string;                 // Batsman, Bowler, All-rounder, Wicket-keeper - Optional
  isActive: boolean;             // Currently active in club
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// Valid role values
export const PLAYER_ROLES = [
  'Batsman',
  'Bowler',
  'All-rounder',
  'Wicket-keeper'
] as const;

export type PlayerRole = typeof PLAYER_ROLES[number];

// ============================================================================
// Core Roster Management (Team Assignments)
// ============================================================================

export interface CoreRosterAssignment {
  id: string;                    // UUID
  playerId: string;
  playerName: string;            // Cached for display
  teamName: string;              // Team name
  seasonId: string;
  seasonName: string;            // Cached for display
  isCore: boolean;               // Is this player core to this team?
  isCaptain?: boolean;           // Is this player the captain?
  isViceCaptain?: boolean;       // Is this player the vice captain?
  markedCoreDate?: string;       // When marked as core (ISO date)
  unmarkedCoreDate?: string;     // When unmarked (if no longer core) (ISO date)
  createdAt: string;
  updatedAt: string;
  updatedBy: string;             // Admin who last updated
}

// ============================================================================
// Availability Tracking (Admin-Managed)
// ============================================================================

export interface FixtureAvailability {
  id: string;
  fixtureId: string;             // Maps to Game# from fixtures
  seasonId: string;
  gameNumber: string;
  date: string;
  team: string;
  opponent: string;
  venue: string;
  playerAvailability: PlayerAvailabilityRecord[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;             // Admin username who last updated
}

export interface PlayerAvailabilityRecord {
  playerId: string;
  playerName: string;
  wasAvailable: boolean;         // Admin marks: Was player available?
  wasSelected: boolean;          // Admin marks: Was player selected/played?
  duties?: string[];             // Match duties assigned to player
  lastUpdated: string;
}

// ============================================================================
// Statistics (Multi-Season)
// ============================================================================

export interface PlayerStatistics {
  playerId: string;
  playerName: string;
  seasonStats: {
    [seasonId: string]: SeasonStats;
  };
  careerStats: CareerStats;
  lastUpdated: string;
}

export interface SeasonStats {
  seasonName: string;
  teamStats: {
    [teamName: string]: TeamSeasonStats;
  };
  clubStats: ClubSeasonStats;
}

export interface TeamSeasonStats {
  totalFixtures: number;         // Total fixtures for team in season
  timesAvailable: number;        // Times marked available
  gamesPlayed: number;           // Times marked selected
  availabilityRate: number;      // (timesAvailable / totalFixtures) * 100
  selectionRate: number;         // (gamesPlayed / timesAvailable) * 100
}

export interface ClubSeasonStats {
  totalFixtures: number;         // Total fixtures across all teams (deduplicated)
  timesAvailable: number;
  gamesPlayed: number;
  availabilityRate: number;
  selectionRate: number;
}

export interface CareerStats {
  totalSeasons: number;
  totalFixtures: number;
  totalGamesPlayed: number;
  careerAvailabilityRate: number;
  careerSelectionRate: number;
}

// Team-level statistics summary
export interface TeamStatisticsSummary {
  seasonId: string;
  seasonName: string;
  teamName: string;
  totalPlayers: number;
  totalFixtures: number;
  averageAvailabilityRate: number;
  averageSelectionRate: number;
  playerStats: Array<{
    playerId: string;
    playerName: string;
    stats: TeamSeasonStats;
  }>;
}

// Season-level statistics summary (all teams)
export interface SeasonStatisticsSummary {
  seasonId: string;
  seasonName: string;
  totalPlayers: number;
  totalFixtures: number;
  totalGamesPlayed: number;
  averageAvailabilityRate: number;
  averageSelectionRate: number;
  teamSummaries: Array<{
    teamName: string;
    totalPlayers: number;
    totalFixtures: number;
    averageAvailabilityRate: number;
  }>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export interface BulkOperationResult {
  success: boolean;
  count: number;
  errors?: string[];
}
