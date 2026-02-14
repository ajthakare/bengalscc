// Quick script to check and fix active season
import { getStore } from '@netlify/blobs';

async function checkSeasons() {
  try {
    const seasonsStore = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Get all seasons
    const seasons = await seasonsStore.get('seasons-list', { type: 'json' });

    console.log('\n=== SEASONS CHECK ===\n');

    if (!seasons || seasons.length === 0) {
      console.log('❌ NO SEASONS FOUND');
      console.log('\nYou need to create a season first!');
      console.log('Go to: http://localhost:4321/admin/seasons');
      console.log('Click "Create Season" and add your first season.\n');
      return;
    }

    console.log(`Found ${seasons.length} season(s):\n`);

    seasons.forEach((season, index) => {
      console.log(`${index + 1}. ${season.name}`);
      console.log(`   ID: ${season.id}`);
      console.log(`   Active: ${season.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`   Teams: ${season.teams.length}`);
      console.log(`   Date Range: ${season.startDate} to ${season.endDate}`);
      console.log('');
    });

    // Check active season
    const activeSeason = seasons.find(s => s.isActive);

    if (activeSeason) {
      console.log(`✅ Active Season: ${activeSeason.name} (ID: ${activeSeason.id})`);

      // Also check active-season key
      const activeSeasonKey = await seasonsStore.get('active-season', { type: 'json' });
      console.log(`\nactive-season key: ${activeSeasonKey ? `✅ Set to ${activeSeasonKey.name}` : '❌ Not set'}`);
    } else {
      console.log('❌ NO ACTIVE SEASON SET');
      console.log('\nTo fix this:');
      console.log('1. Go to: http://localhost:4321/admin/seasons');
      console.log('2. Click "Set Active" on the season you want to use');
    }

    console.log('\n===================\n');

  } catch (error) {
    console.error('Error checking seasons:', error);
  }
}

checkSeasons();
