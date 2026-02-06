#!/usr/bin/env node

/**
 * Sync player names in availability records with current player database
 *
 * This script updates all availability records to reflect the current player names
 * from the players database.
 *
 * Run with: node sync-player-names.js [optional-player-id]
 */

import { getStore } from '@netlify/blobs';
import 'dotenv/config';

const SITE_ID = process.env.SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const SEASON_ID = '3d36a199-7e95-45f2-8c19-a3804b8c030e'; // Winter 2025-2026

async function main() {
  const specificPlayerId = process.argv[2]; // Optional: sync only specific player

  console.log('=== Sync Player Names in Availability Records ===\n');

  // Load all players
  const playersStore = getStore({
    name: 'players',
    siteID: SITE_ID,
    token: TOKEN,
  });

  const allPlayers = await playersStore.get('players-all', { type: 'json' }) || [];
  console.log(`Loaded ${allPlayers.length} players from database\n`);

  // Create a map of player ID to current name
  const playerNameMap = new Map();
  allPlayers.forEach(player => {
    const fullName = `${player.firstName} ${player.lastName}`.trim();
    playerNameMap.set(player.id, fullName);
  });

  // Load availability index
  const availabilityStore = getStore({
    name: 'fixture-availability',
    siteID: SITE_ID,
    token: TOKEN,
  });

  const availabilityIndex = await availabilityStore.get(`availability-index-${SEASON_ID}`, { type: 'json' }) || [];
  console.log(`Found ${availabilityIndex.length} availability records in season\n`);

  let totalUpdates = 0;
  let recordsProcessed = 0;

  console.log('=== Processing Availability Records ===\n');

  for (const indexEntry of availabilityIndex) {
    recordsProcessed++;
    const { fixtureId, gameNumber, team } = indexEntry;

    // Load availability record
    const availabilityRecord = await availabilityStore.get(`availability-${fixtureId}`, { type: 'json' });

    if (!availabilityRecord) {
      console.log(`⚠️  Record not found for fixture ${fixtureId}`);
      continue;
    }

    let updatedCount = 0;
    let recordChanged = false;

    // Update player names in playerAvailability array
    availabilityRecord.playerAvailability.forEach(playerRecord => {
      const currentName = playerNameMap.get(playerRecord.playerId);

      if (!currentName) {
        // Player not found in database
        return;
      }

      if (playerRecord.playerName !== currentName) {
        // Filter to specific player if provided
        if (specificPlayerId && playerRecord.playerId !== specificPlayerId) {
          return;
        }

        console.log(`  ${gameNumber} (${team}): "${playerRecord.playerName}" → "${currentName}"`);
        playerRecord.playerName = currentName;
        playerRecord.lastUpdated = new Date().toISOString();
        updatedCount++;
        recordChanged = true;
      }
    });

    // Save updated record if changes were made
    if (recordChanged) {
      availabilityRecord.updatedAt = new Date().toISOString();
      availabilityRecord.updatedBy = 'sync-player-names-script';
      await availabilityStore.setJSON(`availability-${fixtureId}`, availabilityRecord);
      totalUpdates += updatedCount;
      console.log(`  ✓ Saved ${updatedCount} updates for ${gameNumber}\n`);
    }
  }

  console.log('=== Sync Complete! ===\n');
  console.log(`Records processed: ${recordsProcessed}`);
  console.log(`Player names updated: ${totalUpdates}`);

  if (specificPlayerId) {
    const playerName = playerNameMap.get(specificPlayerId);
    console.log(`\nFiltered to player: ${playerName} (${specificPlayerId})`);
  }

  console.log('\nRefresh /admin/availability to see updated names.');
}

main().catch(error => {
  console.error('\n❌ Sync failed:', error);
  process.exit(1);
});
