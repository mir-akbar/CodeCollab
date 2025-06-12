#!/usr/bin/env node

/**
 * Index Optimization Validation Script
 * 
 * This script validates that all important query patterns still work
 * efficiently after index optimization.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab';

const testQueries = [
  {
    name: 'User - Find by Email',
    collection: 'User',
    query: () => User.findOne({ email: 'test@example.com' }),
    expectedIndex: 'email_1'
  },
  {
    name: 'User - Find by CognitoId', 
    collection: 'User',
    query: () => User.findOne({ cognitoId: 'test-cognito-id' }),
    expectedIndex: 'cognitoId_1'
  },
  {
    name: 'User - Find by Username',
    collection: 'User', 
    query: () => User.findOne({ username: 'testuser' }),
    expectedIndex: 'username_1'
  },
  {
    name: 'Session - Find User Created Sessions',
    collection: 'Session',
    query: () => Session.find({ creator: 'test-cognito-id', status: 'active' }),
    expectedIndex: 'creator_1_status_1'
  },
  {
    name: 'Session - Find by SessionId',
    collection: 'Session',
    query: () => Session.findOne({ sessionId: 'test-session-id' }),
    expectedIndex: 'sessionId_1'
  },
  {
    name: 'SessionParticipant - Find Session Participants',
    collection: 'SessionParticipant',
    query: () => SessionParticipant.find({ sessionId: 'test-session-id', status: { $in: ['active', 'invited'] } }),
    expectedIndex: 'sessionId_1_status_1'
  },
  {
    name: 'SessionParticipant - Find User Participations',
    collection: 'SessionParticipant',
    query: () => SessionParticipant.find({ cognitoId: 'test-cognito-id', status: { $in: ['active', 'invited'] } }),
    expectedIndex: 'cognitoId_1_status_1'
  },
  {
    name: 'SessionParticipant - Find Specific Participant',
    collection: 'SessionParticipant',
    query: () => SessionParticipant.findOne({ sessionId: 'test-session-id', cognitoId: 'test-cognito-id' }),
    expectedIndex: 'sessionId_1_cognitoId_1'
  },
  {
    name: 'SessionParticipant - Count Active Participants',
    collection: 'SessionParticipant',
    query: () => SessionParticipant.countDocuments({ sessionId: 'test-session-id', status: 'active' }),
    expectedIndex: 'sessionId_1_status_1'
  }
];

async function validateIndexOptimization() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Validating Query Performance...');
    
    let allOptimal = true;
    
    for (const test of testQueries) {
      try {
        console.log(`\n📋 Testing: ${test.name}`);
        
        // Get query explanation
        const query = test.query();
        const explanation = await query.explain('executionStats');
        
        const executionStats = explanation.executionStats || explanation.queryPlanner;
        const indexUsed = executionStats.winningPlan?.inputStage?.indexName || 
                         executionStats.inputStage?.indexName ||
                         'COLLSCAN';
        
        console.log(`   Index Used: ${indexUsed}`);
        
        if (indexUsed === 'COLLSCAN') {
          console.log(`   ❌ WARNING: Collection scan detected!`);
          allOptimal = false;
        } else if (indexUsed.includes(test.expectedIndex.replace('_1', ''))) {
          console.log(`   ✅ Optimal index used`);
        } else {
          console.log(`   ⚠️  Different index used (still efficient)`);
        }
        
        // Check execution time if available
        if (executionStats.totalTimeMillis !== undefined) {
          console.log(`   ⏱️  Execution time: ${executionStats.totalTimeMillis}ms`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        allOptimal = false;
      }
    }
    
    console.log('\n📊 Validation Summary:');
    if (allOptimal) {
      console.log('✅ All queries are using optimal indexes');
      console.log('🎉 Index optimization is successful!');
    } else {
      console.log('⚠️  Some queries may need attention');
      console.log('💡 Consider reviewing query patterns or index design');
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

async function showCurrentIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = [
      { name: 'users', model: User },
      { name: 'sessions', model: Session },
      { name: 'session_participants', model: SessionParticipant }
    ];

    console.log('\n📋 Current Database Indexes:');
    
    for (const { name, model } of collections) {
      console.log(`\n${name.toUpperCase()}:`);
      
      const collection = db.collection(name);
      const indexes = await collection.listIndexes().toArray();
      
      indexes.forEach(index => {
        const unique = index.unique ? ' (UNIQUE)' : '';
        const sparse = index.sparse ? ' (SPARSE)' : '';
        console.log(`  ✓ ${index.name}${unique}${sparse}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error showing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// CLI interface
const command = process.argv[2];

if (command === 'validate') {
  validateIndexOptimization();
} else if (command === 'indexes') {
  showCurrentIndexes();
} else {
  console.log('🔍 Index Optimization Validator');
  console.log('');
  console.log('Usage:');
  console.log('  node api/scripts/validate-indexes.js validate  - Test query performance');
  console.log('  node api/scripts/validate-indexes.js indexes   - Show current indexes');
  console.log('');
  console.log('Make sure MONGODB_URI is set in your .env file');
}
