#!/usr/bin/env node

/**
 * Migrate Bulls past fixtures availability data from CSV to Netlify Blobs
 *
 * This script:
 * 1. Parses the CSV file with player availability data
 * 2. Matches players from CSV to existing players in database
 * 3. Creates/updates availability records for 10 past fixtures
 * 4. Maps CSV "Availability" → wasAvailable, "Picked?" → wasSelected
 *
 * Run with: node migrate-bulls-availability.js
 */

import { getStore } from '@netlify/blobs';
import Papa from 'papaparse';
import fs from 'fs';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const SITE_ID = process.env.SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const SEASON_ID = '3d36a199-7e95-45f2-8c19-a3804b8c030e'; // Winter 2025-2026

// Mapping of CSV games to fixture IDs (from check-bulls-fixtures.js)
const FIXTURE_MAPPING = {
  1: { id: 'b6a9cbc2-0881-494f-8db0-8463bb95913f', gameNumber: 'Game 10', opponent: 'BA Vikings', date: '2025-11-01' },
  2: { id: 'b4ac326c-6bc2-4763-839b-14d8d636d5e4', gameNumber: 'Game 43', opponent: 'Cheetahs Beta', date: '2025-11-09' },
  3: { id: 'c4b8f3c2-2242-4557-ad46-2081b66e71a3', gameNumber: 'Game 64', opponent: 'Tracy Youth', date: '2025-11-16' },
  4: { id: '43f6e09b-bd05-498c-8777-5a796fba57bb', gameNumber: 'Game 87', opponent: 'Livermore Monks', date: '2025-11-23' },
  5: { id: 'e6b6acea-d698-430f-af14-05ac6d89f27b', gameNumber: 'Game 96', opponent: 'Strikers Blue', date: '2025-12-06' },
  6: { id: '67ab1e23-1d2b-4b7c-b22f-56b0a936b06c', gameNumber: 'Game 112', opponent: 'Desi RCB StrikerZ', date: '2025-12-13' },
  7: { id: '786f1854-fecc-42a9-b630-b8f0dc0fba0f', gameNumber: 'Game 148', opponent: 'SF Thunders', date: '2025-12-21' },
  8: { id: '49b0ce11-5b3f-4b4d-b7e1-1f8bbcf8922d', gameNumber: 'Game 164', opponent: 'Strikers Blue', date: '2026-01-11' },
  9: { id: 'f40eb091-2ab3-44a7-a118-e4fa0760ff45', gameNumber: 'Game 174', opponent: 'Khalsa Warriors', date: '2026-01-24' },
  10: { id: 'f6d67ce2-f4a6-475d-9e72-ce2c82ead65c', gameNumber: 'Game 196', opponent: 'BT Wolverines', date: '2026-01-31' },
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

async function loadBullsRoster() {
  const store = getStore({
    name: 'core-roster',
    siteID: SITE_ID,
    token: TOKEN,
  });

  const roster = await store.get(`roster-Bengal Bulls-${SEASON_ID}`, { type: 'json' }) || [];
  console.log(`Loaded ${roster.length} players from Bengal Bulls roster\n`);
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
    team: 'Bengal Bulls',
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
    team: 'Bengal Bulls'
  });

  await store.setJSON(indexKey, filteredIndex);

  return availabilityRecord;
}

async function main() {
  console.log('=== Bulls Past Fixtures Availability Migration ===\n');

  // Load CSV file
  const csvPath = './docs/assets/bulls past fixtures.csv';
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
  const bullsRoster = await loadBullsRoster();

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
      isBullCore: parseBooleanValue(row[1]),
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
      // Game 8 (columns 19-20) - Skip: duplicate of Game 5
      game8Available: parseBooleanValue(row[19]),
      game8Picked: parseBooleanValue(row[20]),
      // Game 9 (columns 21-22)
      game9Available: parseBooleanValue(row[21]),
      game9Picked: parseBooleanValue(row[22]),
      // Game 10 (columns 23-24)
      game10Available: parseBooleanValue(row[23]),
      game10Picked: parseBooleanValue(row[24]),
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
  console.log(`- 10 fixtures`);
  console.log(`- ${csvPlayers.length} matched players`);
  console.log(`- Total records: ${10 * csvPlayers.length}\n`);

  // Create availability records for each fixture
  console.log('=== Creating Availability Records ===\n');

  for (let gameNum = 1; gameNum <= 10; gameNum++) {
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
        notes: csvPlayer.isBullCore ? 'Core roster member' : '',
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
  console.log(`- Fixtures processed: 10`);
  console.log(`- Players matched: ${csvPlayers.length}`);
  console.log(`- Players unmatched: ${unmatchedPlayers.length}`);
  console.log(`- Availability records created: 10`);
  console.log(`\nYou can now view this data at: /admin/availability`);
}

main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
