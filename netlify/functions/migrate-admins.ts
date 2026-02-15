import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Temporary migration function to move admin-only users to players store
 * GET /.netlify/functions/migrate-admins?preview=true  - Preview only
 * GET /.netlify/functions/migrate-admins?commit=true   - Actually migrate
 */
export const handler: Handler = async (event) => {
  const isPreview = event.queryStringParameters?.preview === 'true';
  const isCommit = event.queryStringParameters?.commit === 'true';

  if (!isPreview && !isCommit) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Please specify ?preview=true or ?commit=true',
      }),
    };
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    log('🔄 Admin to Players Migration');
    log('=====================================\n');

    if (isPreview) {
      log('⚠️  PREVIEW MODE - No changes will be made\n');
    } else {
      log('✅ COMMIT MODE - Changes will be saved\n');
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

    // Load data
    log('📖 Loading data from stores...');
    const adminUsers = (await adminStore.get('users', { type: 'json' })) as any[] || [];
    const players = (await playersStore.get('players-all', { type: 'json' })) as any[] || [];

    log(`   Found ${adminUsers.length} admin users`);
    log(`   Found ${players.length} players\n`);

    // Find admins needing migration
    const adminsToMigrate: any[] = [];
    const playersToUpdate: any[] = [];

    for (const admin of adminUsers) {
      const existingPlayer = players.find(
        (p: any) => p.email?.toLowerCase() === admin.username.toLowerCase()
      );

      if (!existingPlayer) {
        adminsToMigrate.push(admin);
      } else {
        if (!existingPlayer.role_auth) {
          log(`⚠️  Player exists but missing role_auth: ${existingPlayer.email}`);
          log(`   Will update role_auth to: ${admin.role || 'admin'}`);
          playersToUpdate.push({ admin, existingPlayer });
        } else {
          log(`✅ Already migrated: ${admin.username} (role: ${existingPlayer.role_auth})`);
        }
      }
    }

    log(`\n📊 Migration Summary:`);
    log(`   Total admins: ${adminUsers.length}`);
    log(`   Already in players: ${adminUsers.length - adminsToMigrate.length - playersToUpdate.length}`);
    log(`   Need migration: ${adminsToMigrate.length}`);
    log(`   Need role update: ${playersToUpdate.length}\n`);

    if (adminsToMigrate.length === 0 && playersToUpdate.length === 0) {
      log('✅ No migration needed! All admins already exist in players store.\n');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'No migration needed',
          logs: logs.join('\n')
        }),
      };
    }

    // Display migration plan
    log('📋 Migration Plan:\n');

    // Create new players for admin-only users
    for (const admin of adminsToMigrate) {
      log(`➕ CREATE: ${admin.username}`);
      log(`   Role: ${admin.role || 'admin'}`);
      log(`   Password: *** (migrated from admin-users)`);

      if (isCommit) {
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
          updatedBy: 'migration-function',
          migratedFrom: 'admin-users',
        };
        players.push(newPlayer);
      }
      log('');
    }

    // Update existing players with role_auth
    for (const { admin, existingPlayer } of playersToUpdate) {
      log(`📝 UPDATE: ${existingPlayer.email || existingPlayer.firstName + ' ' + existingPlayer.lastName}`);
      log(`   Set role_auth: ${admin.role || 'admin'}`);

      if (isCommit) {
        existingPlayer.role_auth = admin.role || 'admin';
        existingPlayer.updatedAt = new Date().toISOString();
        existingPlayer.updatedBy = 'migration-function';
      }
      log('');
    }

    log(`📊 Summary:`);
    log(`   Players to create: ${adminsToMigrate.length}`);
    log(`   Players to update: ${playersToUpdate.length}`);
    log(`   Total changes: ${adminsToMigrate.length + playersToUpdate.length}\n`);

    if (isPreview) {
      log('⚠️  This was a PREVIEW - no changes were made');
      log('   Call with ?commit=true to perform the actual migration\n');
    } else {
      // Save changes
      log('💾 Saving changes to players store...');
      await playersStore.setJSON('players-all', players);
      log('✅ Migration completed successfully!\n');

      log('📝 Next Steps:');
      log('   1. Test login for migrated admins');
      log('   2. Update auth-login.ts to remove admin-users check');
      log('   3. Deploy the updated auth-login function\n');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        migrated: adminsToMigrate.length,
        updated: playersToUpdate.length,
        mode: isPreview ? 'preview' : 'commit',
        logs: logs.join('\n'),
      }),
    };

  } catch (error) {
    log(`❌ Migration failed: ${error}`);
    console.error('Migration error:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        logs: logs.join('\n'),
      }),
    };
  }
};
