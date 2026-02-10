#!/usr/bin/env node
import { getStore } from '@netlify/blobs';
import 'dotenv/config';

const store = getStore({
  name: 'fixtures',
  siteID: process.env.SITE_ID,
  token: process.env.NETLIFY_AUTH_TOKEN,
});

const fixtures = await store.get('fixtures-3d36a199-7e95-45f2-8c19-a3804b8c030e', { type: 'json' });
const bullsStrikersFixtures = fixtures.filter(f =>
  f.team === 'Bengal Bulls' && f.opponent.toLowerCase().includes('strikers blue')
);

console.log(`Found ${bullsStrikersFixtures.length} Bengal Bulls vs Strikers Blue fixtures:\n`);
bullsStrikersFixtures.forEach((f, i) => {
  console.log(`${i + 1}. ${f.gameNumber} - ${f.opponent} (${f.date})`);
  console.log(`   ID: ${f.id}`);
  console.log('');
});
