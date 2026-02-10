#!/usr/bin/env node

/**
 * Check Netlify Blobs storage usage
 * Run with: node check-blob-usage.js
 */

import { getStore } from '@netlify/blobs';
import 'dotenv/config';

const SITE_ID = process.env.SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;

const stores = [
  'admin-users',
  'seasons',
  'fixtures',
  'players',
  'fixture-availability',
  'player-statistics',
  'audit-logs',
  'submissions'
];

async function checkStoreSize(storeName) {
  try {
    const store = getStore({
      name: storeName,
      siteID: SITE_ID,
      token: TOKEN,
    });

    // List all keys in the store
    const { blobs } = await store.list();

    if (blobs.length === 0) {
      return {
        name: storeName,
        keys: 0,
        size: 0,
        exists: false
      };
    }

    let totalSize = 0;
    const keyDetails = [];

    // Get size of each blob
    for (const blob of blobs) {
      try {
        const data = await store.get(blob.key, { type: 'text' });
        const size = Buffer.byteLength(data || '', 'utf8');
        totalSize += size;
        keyDetails.push({
          key: blob.key,
          size: size,
          sizeKB: (size / 1024).toFixed(2)
        });
      } catch (err) {
        console.error(`  Error reading ${blob.key}:`, err.message);
      }
    }

    return {
      name: storeName,
      keys: blobs.length,
      size: totalSize,
      sizeMB: (totalSize / 1024 / 1024).toFixed(4),
      exists: true,
      keyDetails
    };
  } catch (error) {
    return {
      name: storeName,
      keys: 0,
      size: 0,
      exists: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('\n=== Netlify Blobs Storage Usage Report ===\n');
  console.log(`Site ID: ${SITE_ID}\n`);

  const results = [];
  let totalSize = 0;
  let totalKeys = 0;

  for (const storeName of stores) {
    console.log(`Checking store: ${storeName}...`);
    const result = await checkStoreSize(storeName);
    results.push(result);

    if (result.exists) {
      totalSize += result.size;
      totalKeys += result.keys;
      console.log(`  ✓ ${result.keys} keys, ${result.sizeMB} MB`);
      if (result.keyDetails && result.keyDetails.length > 0) {
        result.keyDetails.forEach(detail => {
          console.log(`    - ${detail.key}: ${detail.sizeKB} KB`);
        });
      }
    } else {
      console.log(`  ✗ Store empty or doesn't exist`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
    console.log('');
  }

  console.log('\n=== Summary ===\n');
  console.log(`Total Stores: ${results.filter(r => r.exists).length} / ${stores.length}`);
  console.log(`Total Keys: ${totalKeys}`);
  console.log(`Total Size: ${(totalSize / 1024).toFixed(2)} KB (${(totalSize / 1024 / 1024).toFixed(4)} MB)`);
  console.log('');

  // Netlify Blobs limits by plan
  console.log('=== Netlify Blobs Limits ===\n');
  console.log('Free/Starter Plan:');
  console.log(`  Storage: 1 GB (1,024 MB)`);
  console.log(`  Usage: ${(totalSize / 1024 / 1024).toFixed(4)} MB / 1,024 MB`);
  console.log(`  Percentage: ${((totalSize / (1024 * 1024 * 1024)) * 100).toFixed(4)}%`);
  console.log('');
  console.log('Pro Plan:');
  console.log(`  Storage: 100 GB (102,400 MB)`);
  console.log(`  Usage: ${(totalSize / 1024 / 1024).toFixed(4)} MB / 102,400 MB`);
  console.log(`  Percentage: ${((totalSize / (100 * 1024 * 1024 * 1024)) * 100).toFixed(6)}%`);
  console.log('');

  // Projections
  if (totalSize > 0) {
    console.log('=== Growth Projections ===\n');

    // Estimate based on audit logs (monthly)
    const auditLogStore = results.find(r => r.name === 'audit-logs');
    if (auditLogStore && auditLogStore.exists) {
      const avgLogSize = auditLogStore.size / auditLogStore.keys;
      console.log(`Average audit log file size: ${(avgLogSize / 1024).toFixed(2)} KB`);
      console.log(`12 months of logs: ~${((avgLogSize * 12) / 1024).toFixed(2)} KB`);
      console.log(`24 months of logs: ~${((avgLogSize * 24) / 1024).toFixed(2)} KB`);
    }

    // Estimate fixture availability growth
    const availStore = results.find(r => r.name === 'fixture-availability');
    if (availStore && availStore.exists) {
      const avgAvailSize = availStore.size / availStore.keys;
      console.log(`\nAverage availability record: ${(avgAvailSize / 1024).toFixed(2)} KB`);
      console.log(`100 fixtures: ~${((avgAvailSize * 100) / 1024).toFixed(2)} KB`);
      console.log(`500 fixtures: ~${((avgAvailSize * 500) / 1024).toFixed(2)} KB`);
    }
  }

  console.log('\n===========================================\n');
}

main().catch(console.error);
