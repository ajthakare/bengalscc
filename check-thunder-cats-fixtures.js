#!/usr/bin/env node

/**
 * Check if fixtures matching Thunder Cats CSV opponents exist in database
 */

import { getStore } from '@netlify/blobs';
import 'dotenv/config';

const SITE_ID = process.env.SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;

const csvOpponents = [
  'All stars united',
  'BT Warriors',
  'BA Mavericks',      // Game 3
  'Indus dukes',
  'BA Mavericks',      // Game 5 (different fixture)
  'SCCC Pandas',       // Game 6
  'SCCC Pandas',       // Game 7 (different fixture)
  'Kashmir CC'
];

async function main() {
  console.log('Checking for existing Thunder Cats fixtures matching CSV opponents...\n');

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

  // Filter for Thunder Cats team
  const thunderCatsFixtures = fixtures.filter(f => f.team === 'Bengal Thunder Cats');
  console.log(`Found ${thunderCatsFixtures.length} Bengal Thunder Cats fixtures\n`);

  console.log('=== Checking CSV Opponents ===\n');

  const matches = [];
  const notFound = [];

  csvOpponents.forEach((opponent, index) => {
    const gameNum = index + 1;

    // Try to find matching fixture (case-insensitive, partial match)
    const match = thunderCatsFixtures.find(f =>
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

  // Check for duplicate opponents
  console.log('\n=== Checking for Multiple Fixtures per Opponent ===\n');
  const duplicateOpponents = ['BA Mavericks', 'SCCC Pandas'];

  duplicateOpponents.forEach(opponent => {
    const matchingFixtures = thunderCatsFixtures.filter(f =>
      f.opponent.toLowerCase().includes(opponent.toLowerCase())
    );

    console.log(`${opponent}:`);
    if (matchingFixtures.length > 1) {
      matchingFixtures.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.gameNumber} - ${f.opponent} (${f.date}) [ID: ${f.id}]`);
      });
    } else if (matchingFixtures.length === 1) {
      console.log(`  Only 1 fixture found - CSV has 2 games!`);
      console.log(`  ${matchingFixtures[0].gameNumber} - ${matchingFixtures[0].opponent} (${matchingFixtures[0].date})`);
    } else {
      console.log(`  No fixtures found`);
    }
    console.log('');
  });

  if (matches.length > 0) {
    console.log('\n=== Available for Import ===\n');
    console.log('// Copy this to migrate-thunder-cats-availability.js:\n');
    console.log('const FIXTURE_MAPPING = {');
    matches.forEach(m => {
      console.log(`  ${m.csvGame}: { id: '${m.fixture.id}', gameNumber: '${m.fixture.gameNumber}', opponent: '${m.fixture.opponent}', date: '${m.fixture.date}' },`);
    });
    console.log('};\n');
  }
}

main().catch(console.error);
