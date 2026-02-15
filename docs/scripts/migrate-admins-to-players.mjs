#!/usr/bin/env node
/**
 * Migration Script: Move admin-only users to players store
 *
 * This script migrates admins who only exist in the 'admin-users' store
 * to the 'players' store, so we can deprecate admin-users for authentication.
 *
 * Usage:
 *   node migrate-admins-to-players.mjs          # Dry run (preview only)
 *   node migrate-admins-to-players.mjs --commit # Actually perform migration
 */

import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';

const DRY_RUN = !process.argv.includes('--commit');

console.log('🔄 Admin to Players Migration Script');
console.log('=====================================\n');

if (DRY_RUN) {
  console.log('⚠️  DRY RUN MODE - No changes will be made');
  console.log('   Run with --commit to actually perform migration\n');
} else {
  console.log('✅ COMMIT MODE - Changes will be saved\n');
}

// Get stores
const adminStore = getStore({
  name: 'admin-users',
  siteID: process.env.SITE_ID || '',
  token: process.env.NETLIFY_AUTH_TOKEN || '',
});

const playersStore = getStore({
  name: 'players',
  siteID: process.env.SITE_ID || '',
  token: process.env.NETLIFY_AUTH_TOKEN || '',
});

try {
  // Load data from both stores
  console.log('📖 Loading data from stores...');
  const adminUsers = (await adminStore.get('users', { type: 'json' })) || [];
  const players = (await playersStore.get('players-all', { type: 'json' })) || [];

  console.log(`   Found ${adminUsers.length} admin users`);
  console.log(`   Found ${players.length} players\n`);

  // Find admins who don't have player records
  const adminsToMigrate = [];

  for (const admin of adminUsers) {
    // Try to find matching player by email/username
    const existingPlayer = players.find(
      p => p.email?.toLowerCase() === admin.username.toLowerCase()
    );

    if (!existingPlayer) {
      adminsToMigrate.push(admin);
    } else {
      // Check if player has role_auth set
      if (!existingPlayer.role_auth) {
        console.log(`⚠️  Player exists but missing role_auth: ${existingPlayer.email}`);
        console.log(`   Will update role_auth to: ${admin.role || 'admin'}`);
        existingPlayer.needsRoleUpdate = true;
        adminsToMigrate.push({ admin, existingPlayer });
      } else {
        console.log(`✅ Already migrated: ${admin.username} (role: ${existingPlayer.role_auth})`);
      }
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total admins: ${adminUsers.length}`);
  console.log(`   Already in players: ${adminUsers.length - adminsToMigrate.filter(a => !a.existingPlayer).length}`);
  console.log(`   Need migration: ${adminsToMigrate.filter(a => !a.existingPlayer).length}`);
  console.log(`   Need role update: ${adminsToMigrate.filter(a => a.existingPlayer).length}\n`);

  if (adminsToMigrate.length === 0) {
    console.log('✅ No migration needed! All admins already exist in players store.\n');
    process.exit(0);
  }

  // Display migration plan
  console.log('📋 Migration Plan:\n');

  let newPlayersCreated = 0;
  let playersUpdated = 0;

  for (const item of adminsToMigrate) {
    if (item.existingPlayer) {
      // Update existing player's role
      const { admin, existingPlayer } = item;
      console.log(`📝 UPDATE: ${existingPlayer.email || existingPlayer.firstName + ' ' + existingPlayer.lastName}`);
      console.log(`   Set role_auth: ${admin.role || 'admin'}`);
      playersUpdated++;

      if (!DRY_RUN) {
        existingPlayer.role_auth = admin.role || 'admin';
        existingPlayer.updatedAt = new Date().toISOString();
        existingPlayer.updatedBy = 'migration-script';
      }
    } else {
      // Create new player record
      const admin = item;
      console.log(`➕ CREATE: ${admin.username}`);
      console.log(`   Role: ${admin.role || 'admin'}`);
      console.log(`   Password: *** (migrated from admin-users)`);
      newPlayersCreated++;

      if (!DRY_RUN) {
        const newPlayer = {
          id: uuidv4(),
          firstName: admin.username.split('@')[0] || 'Admin',
          lastName: 'User',
          email: admin.username,
          passwordHash: admin.passwordHash,
          role_auth: admin.role || 'admin',
          registrationStatus: 'approved',
          isActive: true,
          dateJoined: admin.createdAt || new Date().toISOString(),
          seasonAssignments: [],
          createdAt: admin.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: 'migration-script',
          migratedFrom: 'admin-users',
        };
        players.push(newPlayer);
      }
    }
    console.log('');
  }

  console.log(`📊 Summary:`);
  console.log(`   Players to create: ${newPlayersCreated}`);
  console.log(`   Players to update: ${playersUpdated}`);
  console.log(`   Total changes: ${newPlayersCreated + playersUpdated}\n`);

  if (DRY_RUN) {
    console.log('⚠️  This was a DRY RUN - no changes were made');
    console.log('   Run with --commit to perform the actual migration\n');
    console.log('Example:');
    console.log('   node migrate-admins-to-players.mjs --commit\n');
    process.exit(0);
  }

  // Save changes
  console.log('💾 Saving changes to players store...');
  await playersStore.setJSON('players-all', players);
  console.log('✅ Migration completed successfully!\n');

  console.log('📝 Next Steps:');
  console.log('   1. Test login for migrated admins');
  console.log('   2. Update auth-login.ts to remove admin-users check');
  console.log('   3. Deploy the updated auth-login function\n');

  console.log('⚠️  Important:');
  console.log('   The admin-users store is still intact (not deleted)');
  console.log('   It can be kept for historical purposes or removed later\n');

} catch (error) {
  console.error('❌ Migration failed:', error);
  console.error(error);
  process.exit(1);
}
