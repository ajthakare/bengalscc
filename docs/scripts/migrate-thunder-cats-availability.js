#!/usr/bin/env node

/**
 * Migrate Thunder Cats past fixtures availability data from CSV to Netlify Blobs
 *
 * This script:
 * 1. Parses the CSV file with player availability data
 * 2. Matches players from CSV to existing players in database
 * 3. Creates/updates availability records for 8 past fixtures
 * 4. Maps CSV "Availability" → wasAvailable, "Picked?" → wasSelected
 *
 * Run with: node migrate-thunder-cats-availability.js
 */

import { getStore } from '@netlify/blobs';
import Papa from 'papaparse';
import fs from 'fs';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const SITE_ID = process.env.SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const SEASON_ID = '3d36a199-7e95-45f2-8c19-a3804b8c030e'; // Winter 2025-2026

// Mapping of CSV games to fixture IDs (from check-thunder-cats-fixtures.js)
// Note: Games 3 & 5 are different BA Mavericks fixtures, Games 6 & 7 are different SCCC Pandas fixtures
const FIXTURE_MAPPING = {
  1: { id: 'a3c44082-a978-4379-b440-d4169ba465e4', gameNumber: 'Game 23', opponent: 'All Stars United', date: '2025-11-08' },
  2: { id: 'e82dd330-0285-4697-a3f5-ec5a4fbadf8a', gameNumber: 'Game 54', opponent: 'BT Warriors', date: '2025-11-16' },
  3: { id: '7fb21a64-9020-49a6-bfa0-b6ed08123410', gameNumber: 'Game 82', opponent: 'BA Mavericks', date: '2025-11-23' },
  4: { id: 'a73da7ca-5680-4792-8c76-62ff84af7b41', gameNumber: 'Game 93', opponent: 'Indus Dukes', date: '2025-12-06' },
  5: { id: 'fcec5b83-d48d-4407-be47-b1b531ab2433', gameNumber: 'Game 110', opponent: 'BA Mavericks', date: '2025-12-13' },
  6: { id: '5a2b742a-8393-46f5-89c9-00857feee432', gameNumber: 'Game 136', opponent: 'SCCC Pandas', date: '2025-12-20' },
  7: { id: '4f11af04-cb1a-4724-871e-aa0265580f60', gameNumber: 'Game 165', opponent: 'SCCC Pandas', date: '2026-01-11' },
  8: { id: '9a92a5ff-9ae9-4074-ad9a-cd440b4aca0c', gameNumber: 'Game 202', opponent: 'Kashmir CC', date: '2026-02-01' },
};

function parseBooleanValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return false;
}

function normalizePlayerName(firstName, lastName) {
  return {
    first: firstName?.trim() || '',
    last: lastName?.trim() || '',
    full: `${firstName?.trim() || ''} ${lastName?.trim() || ''}`.trim()
  };
}

async function loadPlayers() {
  const store = getStore({
    name: 'players',
    siteID: SITE_ID,
    token: TOKEN,
  });

  const players = await store.get('players-all', { type: 'json' }) || [];
  console.log(`Loaded ${players.length} players from database\n`);
  return players;
}

async function loadThunderCatsRoster() {
  const store = getStore({
    name: 'core-roster',
    siteID: SITE_ID,
    token: TOKEN,
  });

  const roster = await store.get(`roster-Bengal Thunder Cats-${SEASON_ID}`, { type: 'json' }) || [];
  console.log(`Loaded ${roster.length} players from Bengal Thunder Cats roster\n`);
  return roster;
}

function matchPlayer(csvPlayer, allPlayers) {
  const csvName = normalizePlayerName(csvPlayer.firstName, csvPlayer.lastName);

  // Try exact USAC ID match first
  if (csvPlayer.usacId) {
    const byUsacId = allPlayers.find(p =>
      p.usacId && p.usacId.toLowerCase() === csvPlayer.usacId.toLowerCase()
    );
    if (byUsacId) return byUsacId;
  }

  // Try exact name match
  const byName = allPlayers.find(p => {
    const dbName = normalizePlayerName(p.firstName, p.lastName);
    return dbName.first.toLowerCase() === csvName.first.toLowerCase() &&
           dbName.last.toLowerCase() === csvName.last.toLowerCase();
  });
  if (byName) return byName;

  // Try first name only (for players with no last name)
  if (!csvName.last) {
    const byFirstName = allPlayers.find(p => {
      const dbName = normalizePlayerName(p.firstName, p.lastName);
      return dbName.first.toLowerCase() === csvName.first.toLowerCase();
    });
    if (byFirstName) return byFirstName;
  }

  return null;
}

async function createAvailabilityRecord(fixtureData, playerAvailability) {
  const store = getStore({
    name: 'fixture-availability',
    siteID: SITE_ID,
    token: TOKEN,
  });

  const availabilityRecord = {
    id: randomUUID(),
    fixtureId: fixtureData.id,
    seasonId: SEASON_ID,
    gameNumber: fixtureData.gameNumber,
    date: fixtureData.date,
    team: 'Bengal Thunder Cats',
    opponent: fixtureData.opponent,
    venue: '', // Not in CSV
    playerAvailability: playerAvailability,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'migration-script'
  };

  // Save to blobs
  await store.setJSON(`availability-${fixtureData.id}`, availabilityRecord);

  // Update index
  const indexKey = `availability-index-${SEASON_ID}`;
  const existingIndex = await store.get(indexKey, { type: 'json' }) || [];

  // Remove if already exists
  const filteredIndex = existingIndex.filter(item => item.fixtureId !== fixtureData.id);

  // Add new entry
  filteredIndex.push({
    fixtureId: fixtureData.id,
    gameNumber: fixtureData.gameNumber,
    date: fixtureData.date,
    team: 'Bengal Thunder Cats'
  });

  await store.setJSON(indexKey, filteredIndex);

  return availabilityRecord;
}

async function main() {
  console.log('=== Thunder Cats Past Fixtures Availability Migration ===\n');

  // Load CSV file
  const csvPath = './docs/assets/thunder cats past fixtures.csv';
  console.log(`Reading CSV file: ${csvPath}\n`);

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse(csvContent, {
    skipEmptyLines: true,
    header: false
  });

  const records = parsed.data;
  console.log(`CSV loaded: ${records.length} rows\n`);

  // Parse player rows (rows 3-52, skipping header rows 1-2)
  const playerRows = records.slice(2, 52); // Rows 3-52 (0-indexed: 2-51)
  console.log(`Player rows: ${playerRows.length}\n`);

  // Load existing players from database
  const allPlayers = await loadPlayers();
  const thunderCatsRoster = await loadThunderCatsRoster();

  // Parse CSV data
  const csvPlayers = [];
  const unmatchedPlayers = [];

  console.log('=== Matching Players ===\n');

  playerRows.forEach((row, index) => {
    const rowNum = index + 3; // Actual CSV row number

    // Skip empty rows
    if (!row[2] && !row[3]) {
      return;
    }

    const csvPlayer = {
      rowNum,
      isThunderCatCore: parseBooleanValue(row[1]),
      firstName: row[2]?.trim() || '',
      lastName: row[3]?.trim() || '',
      usacId: row[4]?.trim() || '',
      // Game 1 (columns 5-6)
      game1Available: parseBooleanValue(row[5]),
      game1Picked: parseBooleanValue(row[6]),
      // Game 2 (columns 7-8)
      game2Available: parseBooleanValue(row[7]),
      game2Picked: parseBooleanValue(row[8]),
      // Game 3 (columns 9-10)
      game3Available: parseBooleanValue(row[9]),
      game3Picked: parseBooleanValue(row[10]),
      // Game 4 (columns 11-12)
      game4Available: parseBooleanValue(row[11]),
      game4Picked: parseBooleanValue(row[12]),
      // Game 5 (columns 13-14)
      game5Available: parseBooleanValue(row[13]),
      game5Picked: parseBooleanValue(row[14]),
      // Game 6 (columns 15-16)
      game6Available: parseBooleanValue(row[15]),
      game6Picked: parseBooleanValue(row[16]),
      // Game 7 (columns 17-18)
      game7Available: parseBooleanValue(row[17]),
      game7Picked: parseBooleanValue(row[18]),
      // Game 8 (columns 19-20)
      game8Available: parseBooleanValue(row[19]),
      game8Picked: parseBooleanValue(row[20]),
    };

    // Match to database player
    const dbPlayer = matchPlayer(csvPlayer, allPlayers);

    if (dbPlayer) {
      console.log(`✓ Row ${rowNum}: ${csvPlayer.firstName} ${csvPlayer.lastName} → ${dbPlayer.id}`);
      csvPlayer.playerId = dbPlayer.id;
      csvPlayer.playerName = `${dbPlayer.firstName} ${dbPlayer.lastName}`;
      csvPlayers.push(csvPlayer);
    } else {
      console.log(`✗ Row ${rowNum}: ${csvPlayer.firstName} ${csvPlayer.lastName} (NOT MATCHED)`);
      unmatchedPlayers.push(csvPlayer);
    }
  });

  console.log(`\nMatched: ${csvPlayers.length} players`);
  console.log(`Unmatched: ${unmatchedPlayers.length} players\n`);

  if (unmatchedPlayers.length > 0) {
    console.log('⚠️  Unmatched players:');
    unmatchedPlayers.forEach(p => {
      console.log(`   - ${p.firstName} ${p.lastName} (USAC: ${p.usacId || 'N/A'})`);
    });
    console.log('\nThese players will be skipped in the migration.\n');
  }

  // Confirm before proceeding
  console.log('=== Ready to Migrate ===\n');
  console.log(`Will create availability records for:`);
  console.log(`- 8 fixtures`);
  console.log(`- ${csvPlayers.length} matched players`);
  console.log(`- Total records: ${8 * csvPlayers.length}\n`);

  // Create availability records for each fixture
  console.log('=== Creating Availability Records ===\n');

  for (let gameNum = 1; gameNum <= 8; gameNum++) {
    const fixtureData = FIXTURE_MAPPING[gameNum];

    console.log(`Game ${gameNum}: ${fixtureData.gameNumber} - ${fixtureData.opponent}`);
    console.log(`  Date: ${fixtureData.date}`);

    // Build player availability array for this game
    const playerAvailability = csvPlayers.map(csvPlayer => {
      const availableKey = `game${gameNum}Available`;
      const pickedKey = `game${gameNum}Picked`;

      return {
        playerId: csvPlayer.playerId,
        playerName: csvPlayer.playerName,
        wasAvailable: csvPlayer[availableKey],
        wasSelected: csvPlayer[pickedKey],
        duties: [], // Not tracked in CSV
        notes: csvPlayer.isThunderCatCore ? 'Core roster member' : '',
        lastUpdated: new Date().toISOString()
      };
    });

    const availableCount = playerAvailability.filter(p => p.wasAvailable).length;
    const selectedCount = playerAvailability.filter(p => p.wasSelected).length;

    console.log(`  Available: ${availableCount}, Selected: ${selectedCount}`);

    // Create availability record
    await createAvailabilityRecord(fixtureData, playerAvailability);

    console.log(`  ✓ Created availability record\n`);
  }

  console.log('=== Migration Complete! ===\n');
  console.log('Summary:');
  console.log(`- Fixtures processed: 8`);
  console.log(`- Players matched: ${csvPlayers.length}`);
  console.log(`- Players unmatched: ${unmatchedPlayers.length}`);
  console.log(`- Availability records created: 8`);
  console.log(`\nYou can now view this data at: /admin/availability`);
}

main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
