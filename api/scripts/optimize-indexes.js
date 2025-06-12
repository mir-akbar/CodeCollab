#!/usr/bin/env node

/**
 * Database Index Cleanup Script
 * 
 * This script removes unnecessary indexes from MongoDB collections
 * based on the index optimization analysis.
 * 
 * Run this script to clean up indexes in your MongoDB Atlas database.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab';

const indexesToDrop = {
  users: [
    'email_1_status_1',
    'activity.lastActiveAt_-1',
    'createdAt_-1',
    'profile.name_text_email_text',
    'activity.lastActiveAt_1',
    'status_1',
    'status_1_createdAt_-1',
    'metadata.subscriptionTier_1_status_1',
    'cognitoId_1_status_1'
  ],
  sessions: [
    'creator_1',
    'status_1',
    'createdAt_-1',
    'updatedAt_-1',
    'status_1_activity.lastActivity_-1',
    'settings.isPrivate_1_status_1',
    'activity.lastActivity_1',
    'status_1_settings.isPrivate_1_createdAt_-1'
  ],
  session_participants: [
    'sessionId_1',
    'cognitoId_1',
    'lastActive_1',
    'sessionId_1_role_1'
  ]
};

async function dropUnnecessaryIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    for (const [collectionName, indexes] of Object.entries(indexesToDrop)) {
      console.log(`\n📋 Processing collection: ${collectionName}`);
      
      const collection = db.collection(collectionName);
      
      // Get existing indexes
      const existingIndexes = await collection.listIndexes().toArray();
      const existingIndexNames = existingIndexes.map(idx => idx.name);
      
      console.log(`   Current indexes: ${existingIndexNames.join(', ')}`);
      
      for (const indexName of indexes) {
        if (existingIndexNames.includes(indexName)) {
          try {
            await collection.dropIndex(indexName);
            console.log(`   ✅ Dropped index: ${indexName}`);
          } catch (error) {
            if (error.code === 27) {
              console.log(`   ⚠️  Index not found: ${indexName}`);
            } else {
              console.log(`   ❌ Error dropping index ${indexName}:`, error.message);
            }
          }
        } else {
          console.log(`   ⚠️  Index not found: ${indexName}`);
        }
      }
      
      // Show remaining indexes
      const remainingIndexes = await collection.listIndexes().toArray();
      console.log(`   Remaining indexes: ${remainingIndexes.map(idx => idx.name).join(', ')}`);
    }

    console.log('\n🎉 Index cleanup completed!');
    
    // Show summary
    console.log('\n📊 Optimization Summary:');
    console.log('- Removed redundant field indexes covered by compound indexes');
    console.log('- Removed unused compound indexes');
    console.log('- Removed indexes on fields only used for updates');
    console.log('- Kept essential indexes for primary lookups and common queries');
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function listCurrentIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = ['users', 'sessions', 'session_participants'];

    console.log('\n📋 Current Index Status:');
    
    for (const collectionName of collections) {
      console.log(`\n${collectionName.toUpperCase()}:`);
      
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      
      indexes.forEach(index => {
        const keys = Object.keys(index.key).map(key => {
          const direction = index.key[key] === 1 ? 'ASC' : 
                           index.key[key] === -1 ? 'DESC' : 
                           index.key[key];
          return `${key}_${direction}`;
        }).join('_');
        
        const unique = index.unique ? ' (UNIQUE)' : '';
        const sparse = index.sparse ? ' (SPARSE)' : '';
        const text = index.textIndexVersion ? ' (TEXT)' : '';
        
        console.log(`  - ${index.name}${unique}${sparse}${text}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// CLI interface
const command = process.argv[2];

if (command === 'list') {
  listCurrentIndexes();
} else if (command === 'clean') {
  console.log('🧹 Starting index cleanup...');
  console.log('⚠️  This will remove unnecessary indexes from your database.');
  console.log('📝 Make sure you have a backup before proceeding.');
  console.log('');
  
  dropUnnecessaryIndexes();
} else {
  console.log('📖 Database Index Cleanup Tool');
  console.log('');
  console.log('Usage:');
  console.log('  node api/scripts/optimize-indexes.js list   - List current indexes');
  console.log('  node api/scripts/optimize-indexes.js clean  - Remove unnecessary indexes');
  console.log('');
  console.log('Make sure MONGODB_URI is set in your .env file');
}
