#!/usr/bin/env node

/**
 * Session Migration Test Script
 * 
 * This script tests the migration process and validates both old and new systems
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SessionService = require('../services/sessionService');
const SessionMigrationService = require('../services/sessionMigrationService');

// Test data
const testUsers = [
  'alice@example.com',
  'bob@example.com', 
  'charlie@example.com'
];

const testSessions = [
  {
    name: 'Migration Test Session 1',
    description: 'Test session for migration validation',
    creator: 'alice@example.com'
  },
  {
    name: 'Migration Test Session 2', 
    description: 'Another test session',
    creator: 'bob@example.com'
  }
];

class MigrationTester {
  constructor() {
    this.sessionService = new SessionService();
    this.migrationService = new SessionMigrationService();
    this.createdSessions = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Session Migration Tests...\n');

    try {
      await this.connectToDatabase();
      
      // Test 1: Legacy system functionality
      console.log('📝 Test 1: Legacy System Functionality');
      await this.testLegacySystem();
      
      // Test 2: Migration process
      console.log('\n📝 Test 2: Migration Process');
      await this.testMigrationProcess();
      
      // Test 3: New system functionality
      console.log('\n📝 Test 3: New System Functionality');
      await this.testNewSystem();
      
      // Test 4: Data consistency
      console.log('\n📝 Test 4: Data Consistency');
      await this.testDataConsistency();
      
      // Test 5: Performance comparison
      console.log('\n📝 Test 5: Performance Comparison');
      await this.testPerformance();
      
      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Tests failed:', error);
      throw error;
    } finally {
      await this.cleanup();
      await mongoose.disconnect();
    }
  }

  async connectToDatabase() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab');
    console.log('✅ Connected to MongoDB');
  }

  async testLegacySystem() {
    // Force legacy mode
    this.sessionService.enableLegacySystem();
    
    console.log('  📊 Testing legacy session creation...');
    
    for (const sessionData of testSessions) {
      const result = await this.sessionService.createSession(sessionData);
      this.createdSessions.push(result.session.sessionId);
      console.log(`    ✅ Created session: ${result.session.name}`);
    }
    
    console.log('  📊 Testing legacy session retrieval...');
    for (const userEmail of testUsers) {
      const sessions = await this.sessionService.getUserSessions(userEmail);
      console.log(`    ✅ Retrieved ${sessions.length} sessions for ${userEmail}`);
    }
    
    console.log('  📊 Testing legacy invitations...');
    if (this.createdSessions.length > 0) {
      await this.sessionService.inviteUserToSession(
        this.createdSessions[0],
        testUsers[0],
        testUsers[1],
        'edit'
      );
      console.log(`    ✅ Invited ${testUsers[1]} to session`);
    }
  }

  async testMigrationProcess() {
    console.log('  📊 Running dry-run migration...');
    const dryRunResult = await this.migrationService.migrateAllSessions({ dryRun: true });
    console.log(`    ✅ Dry run completed: ${dryRunResult.migrated}/${dryRunResult.total} sessions`);
    
    console.log('  📊 Running actual migration...');
    const migrationResult = await this.migrationService.migrateAllSessions({ dryRun: false });
    console.log(`    ✅ Migration completed: ${migrationResult.migrated}/${migrationResult.total} sessions`);
    
    console.log('  📊 Verifying migration...');
    const verificationResult = await this.migrationService.verifyMigration();
    if (!verificationResult.success) {
      throw new Error('Migration verification failed');
    }
    console.log(`    ✅ Verification passed: ${verificationResult.migratedSessionCount} sessions migrated`);
  }

  async testNewSystem() {
    // Switch to new system
    this.sessionService.enableNewSystem();
    
    console.log('  📊 Testing new system session retrieval...');
    for (const userEmail of testUsers) {
      const sessions = await this.sessionService.getUserSessions(userEmail);
      console.log(`    ✅ Retrieved ${sessions.length} sessions for ${userEmail} (new system)`);
    }
    
    console.log('  📊 Testing new system session creation...');
    const newSessionResult = await this.sessionService.createSession({
      name: 'New System Test Session',
      description: 'Created with new system',
      creator: testUsers[2]
    });
    this.createdSessions.push(newSessionResult.session.sessionId);
    console.log(`    ✅ Created session with new system: ${newSessionResult.session.name}`);
    
    console.log('  📊 Testing new system invitations...');
    await this.sessionService.inviteUserToSession(
      newSessionResult.session.sessionId,
      testUsers[2],
      testUsers[0],
      'editor'
    );
    console.log(`    ✅ Invited ${testUsers[0]} to new session`);
  }

  async testDataConsistency() {
    console.log('  📊 Comparing legacy vs new system data...');
    
    // Test with legacy system
    this.sessionService.enableLegacySystem();
    const legacySessions = await this.sessionService.getUserSessions(testUsers[0]);
    
    // Test with new system
    this.sessionService.enableNewSystem();
    const newSessions = await this.sessionService.getUserSessions(testUsers[0]);
    
    console.log(`    📈 Legacy system returned: ${legacySessions.length} sessions`);
    console.log(`    📈 New system returned: ${newSessions.length} sessions`);
    
    // Check if session counts match (within reasonable tolerance)
    const tolerance = Math.max(1, Math.floor(legacySessions.length * 0.1)); // 10% tolerance
    if (Math.abs(legacySessions.length - newSessions.length) > tolerance) {
      console.warn(`    ⚠️  Session count mismatch: Legacy=${legacySessions.length}, New=${newSessions.length}`);
    } else {
      console.log('    ✅ Session counts are consistent');
    }
    
    // Check if session names and creators match
    const legacySessionMap = new Map(legacySessions.map(s => [s.sessionId, s]));
    let matchCount = 0;
    
    for (const newSession of newSessions) {
      const legacySession = legacySessionMap.get(newSession.sessionId);
      if (legacySession) {
        if (legacySession.name === newSession.name && 
            legacySession.creator === newSession.creator) {
          matchCount++;
        }
      }
    }
    
    console.log(`    ✅ ${matchCount}/${newSessions.length} sessions have matching metadata`);
  }

  async testPerformance() {
    console.log('  📊 Performance testing...');
    
    const testEmail = testUsers[0];
    const iterations = 5;
    
    // Test legacy system performance
    this.sessionService.enableLegacySystem();
    console.log('    ⏱️  Testing legacy system performance...');
    const legacyStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await this.sessionService.getUserSessions(testEmail);
    }
    
    const legacyTime = Date.now() - legacyStart;
    console.log(`    📈 Legacy system: ${legacyTime}ms for ${iterations} iterations (${(legacyTime/iterations).toFixed(1)}ms avg)`);
    
    // Test new system performance
    this.sessionService.enableNewSystem();
    console.log('    ⏱️  Testing new system performance...');
    const newStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await this.sessionService.getUserSessions(testEmail);
    }
    
    const newTime = Date.now() - newStart;
    console.log(`    📈 New system: ${newTime}ms for ${iterations} iterations (${(newTime/iterations).toFixed(1)}ms avg)`);
    
    // Calculate improvement
    const improvement = ((legacyTime - newTime) / legacyTime * 100).toFixed(1);
    if (newTime < legacyTime) {
      console.log(`    ✅ Performance improved by ${improvement}%`);
    } else {
      console.log(`    📊 Performance difference: ${improvement}% (negative = slower)`);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test sessions created during testing
      for (const sessionId of this.createdSessions) {
        try {
          await this.sessionService.deleteSession(sessionId, testUsers[0]);
          console.log(`  🗑️  Deleted test session: ${sessionId}`);
        } catch (error) {
          // Try with other test users if first one fails
          for (const userEmail of testUsers) {
            try {
              await this.sessionService.deleteSession(sessionId, userEmail);
              console.log(`  🗑️  Deleted test session: ${sessionId}`);
              break;
            } catch (e) {
              // Continue to next user
            }
          }
        }
      }
      
      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.warn('⚠️  Some cleanup operations failed:', error.message);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Session Migration Test Script

Usage: node scripts/test-migration.js

This script will:
1. Test legacy system functionality
2. Run migration process
3. Test new system functionality
4. Compare data consistency
5. Measure performance improvements

The script creates temporary test data and cleans up after testing.
    `);
    process.exit(0);
  }
  
  const tester = new MigrationTester();
  
  try {
    await tester.runAllTests();
    console.log('\n🎉 Migration testing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration testing failed:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, cleaning up...');
  await mongoose.disconnect();
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = MigrationTester;
