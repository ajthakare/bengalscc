#!/usr/bin/env node

/**
 * Check if fixtures matching Bulls CSV opponents exist in database
 */

import { getStore } from '@netlify/blobs';
import 'dotenv/config';

const SITE_ID = process.env.SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;

const csvOpponents = [
  'BA Vikings',
  'Cheetahs Beta',
  'Tracy Youth',
  'Livermore Monks',
  'Strikers Blue',      // Game 5
  'Desi RCB StrikerZ',
  'SF Thunders',
  'Strikers Blue',      // Game 8 (different fixture)
  'Khalsa Warriors',
  'BT Wolverines'
];

async function main() {
  console.log('Checking for existing Bulls fixtures matching CSV opponents...\n');

  // Get active season
  const seasonsStore = getStore({
    name: 'seasons',
    siteID: SITE_ID,
    token: TOKEN,
  });

  const seasonsList = await seasonsStore.get('seasons-list', { type: 'json' });
  const activeSeason = seasonsList?.find(s => s.isActive);

  if (!activeSeason) {
    console.log('❌ No active season found');
    return;
  }

  console.log(`✓ Active Season: ${activeSeason.name} (${activeSeason.id})\n`);

  // Get fixtures for active season
  const fixturesStore = getStore({
    name: 'fixtures',
    siteID: SITE_ID,
    token: TOKEN,
  });

  const fixtures = await fixturesStore.get(`fixtures-${activeSeason.id}`, { type: 'json' }) || [];

  console.log(`Found ${fixtures.length} total fixtures in active season\n`);

  // Filter for Bulls team
  const bullsFixtures = fixtures.filter(f => f.team === 'Bengal Bulls');
  console.log(`Found ${bullsFixtures.length} Bengal Bulls fixtures\n`);

  console.log('=== Checking CSV Opponents ===\n');

  const matches = [];
  const notFound = [];

  csvOpponents.forEach((opponent, index) => {
    const gameNum = index + 1;

    // Try to find matching fixture
    const match = bullsFixtures.find(f =>
      f.opponent.toLowerCase().includes(opponent.toLowerCase())
    );

    if (match) {
      console.log(`✓ Game ${gameNum} - ${opponent}`);
      console.log(`  Fixture ID: ${match.id}`);
      console.log(`  Date: ${match.date}`);
      console.log(`  Opponent: ${match.opponent}`);
      console.log(`  Game Number: ${match.gameNumber}`);
      console.log('');
      matches.push({ csvGame: gameNum, opponent, fixture: match });
    } else {
      console.log(`✗ Game ${gameNum} - ${opponent} (NOT FOUND)`);
      console.log('');
      notFound.push({ csvGame: gameNum, opponent });
    }
  });

  console.log('=== Summary ===\n');
  console.log(`Matches found: ${matches.length} / ${csvOpponents.length}`);
  console.log(`Not found: ${notFound.length}\n`);

  if (notFound.length > 0) {
    console.log('Missing fixtures for:');
    notFound.forEach(nf => {
      console.log(`  - Game ${nf.csvGame}: ${nf.opponent}`);
    });
    console.log('\nThese fixtures need to be created before importing availability data.\n');
  }

  if (matches.length > 0) {
    console.log('\n=== Available for Import ===\n');
    console.log('// Copy this to migrate-bulls-availability.js:\n');
    console.log('const FIXTURE_MAPPING = {');
    matches.forEach(m => {
      console.log(`  ${m.csvGame}: { id: '${m.fixture.id}', gameNumber: '${m.fixture.gameNumber}', opponent: '${m.fixture.opponent}', date: '${m.fixture.date}' },`);
    });
    console.log('};\n');
  }
}

main().catch(console.error);
