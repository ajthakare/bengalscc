# Maintenance Scripts

This folder contains utility scripts for database maintenance, data migration, and system checks.

## Scripts

### Database Checks
- **check-blob-usage.js** - Monitor Netlify Blobs storage usage across all stores
- **check-existing-fixtures.js** - Verify fixture data integrity
- **check-bulls-fixtures.js** - Check Bengal Bulls fixture data
- **check-strikers-fixtures.js** - Check Strikers fixture data
- **check-thunder-cats-fixtures.js** - Check Bengal Thunder Cats fixture data

### Data Migration
- **migrate-tigers-availability.js** - Migrate Bengal Tigers availability data
- **migrate-bulls-availability.js** - Migrate Bengal Bulls availability data
- **migrate-thunder-cats-availability.js** - Migrate Bengal Thunder Cats availability data
- **sync-player-names.js** - Synchronize player name data across systems

### Security
- **generate-session-secret.cjs** - Generate secure session secrets for admin authentication

## Usage

Most scripts can be run directly with Node.js:

```bash
node docs/scripts/script-name.js
```

For the session secret generator:
```bash
node docs/scripts/generate-session-secret.cjs
```

## Notes

- These scripts interact with Netlify Blobs storage
- Ensure environment variables are properly configured before running
- Some scripts may require admin credentials
- Always backup data before running migration scripts
