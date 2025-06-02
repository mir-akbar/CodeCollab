#!/usr/bin/env node

/**
 * Session Migration Script
 * 
 * This script migrates from the old SessionManagement model to the new
 * normalized Session and SessionParticipant models.
 * 
 * Usage:
 *   node scripts/migrate-sessions.js [options]
 * 
 * Options:
 *   --dry-run       Run without making changes
 *   --verify        Verify migration results
 *   --rollback      Rollback migration (delete new records)
 *   --batch-size    Number of sessions to process per batch (default: 50)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SessionMigrationService = require('../services/sessionMigrationService');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verify: args.includes('--verify'),
  rollback: args.includes('--rollback'),
  batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 50
};

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab');
    console.log('✅ Connected to MongoDB');

    const migrationService = new SessionMigrationService();

    if (options.rollback) {
      console.log('🔄 Starting rollback...');
      const result = await migrationService.rollbackMigration();
      
      if (result.success) {
        console.log('✅ Rollback completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Rollback failed:', result.error);
        process.exit(1);
      }
    }

    if (options.verify) {
      console.log('🔍 Verifying migration...');
      const result = await migrationService.verifyMigration();
      
      if (result.success) {
        console.log('✅ Verification passed');
        process.exit(0);
      } else {
        console.error('❌ Verification failed:', result.error);
        process.exit(1);
      }
    }

    // Run migration
    console.log('🚀 Starting migration...');
    const result = await migrationService.migrateAllSessions({
      dryRun: options.dryRun,
      batchSize: options.batchSize
    });

    if (result.success) {
      console.log(`✅ Migration completed: ${result.migrated}/${result.total} sessions migrated`);
      
      // Auto-verify after successful migration
      if (!options.dryRun) {
        console.log('\n🔍 Running verification...');
        const verifyResult = await migrationService.verifyMigration();
        
        if (verifyResult.success) {
          console.log('✅ Migration verification passed');
        } else {
          console.error('❌ Migration verification failed');
          process.exit(1);
        }
      }
      
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📪 Disconnected from MongoDB');
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, cleaning up...');
  await mongoose.disconnect();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, cleaning up...');
  await mongoose.disconnect();
  process.exit(1);
});

// Print usage if help requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Session Migration Script

Usage: node scripts/migrate-sessions.js [options]

Options:
  --dry-run       Run without making changes (test mode)
  --verify        Verify migration results only
  --rollback      Rollback migration (delete new records)
  --batch-size=N  Number of sessions to process per batch (default: 50)
  --help, -h      Show this help message

Examples:
  node scripts/migrate-sessions.js --dry-run
  node scripts/migrate-sessions.js --batch-size=25
  node scripts/migrate-sessions.js --verify
  node scripts/migrate-sessions.js --rollback
`);
  process.exit(0);
}

// Run the script
main();
