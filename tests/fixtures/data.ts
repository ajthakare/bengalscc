/**
 * Test Fixtures - Mock Data for Tests
 */

import type { Player, Season, Fixture } from '../../src/types/player';

export const mockSeason: Season = {
  id: 'season-2025',
  name: '2025-2026',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  isActive: true,
  teams: [
    {
      id: 'team-tigers',
      name: 'Bengal Tigers',
      division: 'WB-D2',
    },
    {
      id: 'team-bulls',
      name: 'Bengal Bulls',
      division: 'WB-D3',
    },
  ],
  createdAt: '2025-01-01T00:00:00Z',
  createdBy: 'admin',
};

export const mockPlayer: Player = {
  id: 'player-001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0100',
  position: 'Batsman',
  dateJoined: '2025-01-01',
  isActive: true,
  seasonAssignments: [
    {
      seasonId: 'season-2025',
      teamId: 'team-tigers',
      role: 'player',
      jerseyNumber: 10,
      joinedDate: '2025-01-01',
    },
  ],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const mockPlayers: Player[] = [
  mockPlayer,
  {
    id: 'player-002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1-555-0200',
    position: 'Bowler',
    dateJoined: '2025-01-02',
    isActive: true,
    seasonAssignments: [
      {
        seasonId: 'season-2025',
        teamId: 'team-tigers',
        role: 'captain',
        jerseyNumber: 1,
        joinedDate: '2025-01-02',
      },
    ],
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'player-003',
    firstName: 'Bob',
    lastName: 'Wilson',
    email: 'bob.wilson@example.com',
    position: 'All-Rounder',
    dateJoined: '2025-01-03',
    isActive: false,
    seasonAssignments: [],
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
  },
];

export const mockFixture: Fixture = {
  id: 'fixture-001',
  seasonId: 'season-2025',
  gameNumber: 'G001',
  date: '2025-06-15',
  time: '10:00 AM',
  team: 'Bengal Tigers',
  opponent: 'San Jose Sharks',
  venue: 'Fremont Cricket Ground',
  division: 'WB-D2',
  matchType: 'home',
  createdAt: '2025-01-01T00:00:00Z',
};

export const mockFixtures: Fixture[] = [
  mockFixture,
  {
    id: 'fixture-002',
    seasonId: 'season-2025',
    gameNumber: 'G002',
    date: '2025-06-22',
    time: '2:00 PM',
    team: 'Bengal Bulls',
    opponent: 'Milpitas Warriors',
    venue: 'Milpitas Sports Complex',
    division: 'WB-D3',
    matchType: 'away',
    createdAt: '2025-01-02T00:00:00Z',
  },
];

export const mockAdminUser = {
  username: 'testadmin',
  password: 'hashed-password-here',
  role: 'admin',
  email: 'admin@gscc.test',
  createdAt: '2025-01-01T00:00:00Z',
};

export const mockSession = {
  token: 'test-jwt-token',
  username: 'testadmin',
  role: 'admin',
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const mockAvailability = {
  fixtureId: 'fixture-001',
  seasonId: 'season-2025',
  availablePlayers: [
    {
      playerId: 'player-001',
      playerName: 'John Doe',
      status: 'selected',
      duties: ['batting', 'fielding'],
      updatedAt: '2025-06-01T00:00:00Z',
    },
    {
      playerId: 'player-002',
      playerName: 'Jane Smith',
      status: 'available',
      duties: ['bowling', 'fielding'],
      updatedAt: '2025-06-01T00:00:00Z',
    },
  ],
  createdAt: '2025-06-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
};
