#!/usr/bin/env node

/**
 * Atlas Index Checker - Comprehensive Database Analysis
 * 
 * This script lists ALL indexes in ALL collections in your database
 * to help identify what Atlas is actually showing.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab';
const DB_NAME = process.env.DB_NAME || 'code_colab';

async function analyzeAllIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoose.connection.db;
    console.log(`📊 Using database: ${db.databaseName}`);
    
    // Get ALL collections in the database
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`\n📊 Database: ${db.databaseName}`);
    console.log(`📋 Found ${collections.length} collections: ${collectionNames.join(', ')}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 COMPLETE INDEX ANALYSIS');
    console.log('='.repeat(80));
    
    let totalIndexes = 0;
    let unnecessaryIndexes = [];
    
    for (const collectionName of collectionNames) {
      console.log(`\n📁 Collection: ${collectionName.toUpperCase()}`);
      console.log('-'.repeat(50));
      
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      
      totalIndexes += indexes.length;
      
      if (indexes.length === 0) {
        console.log('   No indexes found');
        continue;
      }
      
      indexes.forEach((index, i) => {
        const keys = Object.keys(index.key).map(key => {
          const direction = index.key[key] === 1 ? '↑' : 
                           index.key[key] === -1 ? '↓' : 
                           index.key[key] === 'text' ? '📝' :
                           index.key[key];
          return `${key}${direction}`;
        }).join(', ');
        
        const flags = [];
        if (index.unique) flags.push('UNIQUE');
        if (index.sparse) flags.push('SPARSE');
        if (index.textIndexVersion) flags.push('TEXT');
        if (index.background) flags.push('BACKGROUND');
        
        const flagsStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        
        console.log(`   ${i + 1}. ${index.name}${flagsStr}`);
        console.log(`      Keys: ${keys}`);
        
        // Analyze if this index is necessary
        const analysis = analyzeIndexNecessity(collectionName, index);
        if (!analysis.necessary) {
          console.log(`      ⚠️  ${analysis.reason}`);
          unnecessaryIndexes.push({
            collection: collectionName,
            indexName: index.name,
            reason: analysis.reason
          });
        } else {
          console.log(`      ✅ ${analysis.reason}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Collections: ${collections.length}`);
    console.log(`Total Indexes: ${totalIndexes}`);
    console.log(`Unnecessary Indexes: ${unnecessaryIndexes.length}`);
    
    if (unnecessaryIndexes.length > 0) {
      console.log('\n🧹 INDEXES THAT CAN BE REMOVED:');
      console.log('-'.repeat(50));
      
      const byCollection = {};
      unnecessaryIndexes.forEach(idx => {
        if (!byCollection[idx.collection]) {
          byCollection[idx.collection] = [];
        }
        byCollection[idx.collection].push(idx);
      });
      
      for (const [collection, indexes] of Object.entries(byCollection)) {
        console.log(`\n📁 ${collection}:`);
        indexes.forEach(idx => {
          console.log(`   ❌ ${idx.indexName} - ${idx.reason}`);
        });
      }
      
      console.log('\n💡 To remove these indexes, run:');
      console.log('   node scripts/atlas-index-checker.js clean');
    } else {
      console.log('\n✅ All indexes are optimized!');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing indexes:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

function analyzeIndexNecessity(collectionName, index) {
  const indexName = index.name;
  
  // Always keep default _id index
  if (indexName === '_id_') {
    return { necessary: true, reason: 'Default MongoDB _id index' };
  }
  
  // Collection-specific analysis
  switch (collectionName) {
    case 'users':
      return analyzeUserIndex(indexName, index);
    case 'sessions':
      return analyzeSessionIndex(indexName, index);
    case 'session_participants':
      return analyzeParticipantIndex(indexName, index);
    default:
      // For unknown collections, be conservative
      return { necessary: true, reason: 'Unknown collection - keeping for safety' };
  }
}

function analyzeUserIndex(indexName, _index) {
  const necessaryIndexes = {
    'cognitoId_1': 'Primary user lookup by Cognito ID',
    'email_1': 'Primary user lookup by email',
    'username_1': 'User lookup by username (sparse unique)'
  };
  
  if (necessaryIndexes[indexName]) {
    return { necessary: true, reason: necessaryIndexes[indexName] };
  }
  
  // Check for unnecessary patterns
  if (indexName.includes('status') || indexName.includes('lastActive') || 
      indexName.includes('createdAt') || indexName.includes('activity') ||
      indexName.includes('profile') || indexName.includes('metadata')) {
    return { necessary: false, reason: 'No queries found using this pattern' };
  }
  
  return { necessary: false, reason: 'Not in essential index list' };
}

function analyzeSessionIndex(indexName, _index) {
  const necessaryIndexes = {
    'sessionId_1': 'Primary session lookup',
    'creator_1_status_1': 'getUserSessions query optimization'
  };
  
  if (necessaryIndexes[indexName]) {
    return { necessary: true, reason: necessaryIndexes[indexName] };
  }
  
  // Check for unnecessary patterns
  if (indexName.includes('creator_1') && !indexName.includes('status') ||
      indexName.includes('status_1') && !indexName.includes('creator') ||
      indexName.includes('activity') || indexName.includes('createdAt') ||
      indexName.includes('isPrivate') || indexName.includes('text')) {
    return { necessary: false, reason: 'Redundant or unused index pattern' };
  }
  
  return { necessary: false, reason: 'Not in essential index list' };
}

function analyzeParticipantIndex(indexName, _index) {
  const necessaryIndexes = {
    'sessionId_1_cognitoId_1': 'Primary participant lookup (unique)',
    'cognitoId_1_status_1': 'User active participations lookup',
    'sessionId_1_status_1': 'Session participant filtering and counting'
  };
  
  if (necessaryIndexes[indexName]) {
    return { necessary: true, reason: necessaryIndexes[indexName] };
  }
  
  // Check for unnecessary patterns
  if (indexName === 'sessionId_1' || indexName === 'cognitoId_1' ||
      indexName.includes('role') || indexName.includes('lastActive') ||
      indexName.includes('email') || indexName.includes('username') ||
      indexName.includes('name')) {
    return { necessary: false, reason: 'Covered by compound indexes or unused' };
  }
  
  return { necessary: false, reason: 'Not in essential index list' };
}

async function cleanUnnecessaryIndexes() {
  try {
    console.log('🧹 Starting comprehensive index cleanup...');
    console.log('⚠️  This will remove unnecessary indexes from your Atlas database.');
    console.log('📝 Make sure you have a backup before proceeding.');
    console.log('');
    
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoose.connection.db;
    console.log(`📊 Using database: ${db.databaseName}`);
    const collections = await db.listCollections().toArray();
    
    let removedCount = 0;
    
    for (const { name: collectionName } of collections) {
      console.log(`\n📁 Processing collection: ${collectionName}`);
      
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      
      for (const index of indexes) {
        const analysis = analyzeIndexNecessity(collectionName, index);
        
        if (!analysis.necessary) {
          try {
            await collection.dropIndex(index.name);
            console.log(`   ✅ Dropped: ${index.name} - ${analysis.reason}`);
            removedCount++;
          } catch (error) {
            console.log(`   ❌ Failed to drop ${index.name}: ${error.message}`);
          }
        } else {
          console.log(`   ✓ Kept: ${index.name} - ${analysis.reason}`);
        }
      }
    }
    
    console.log(`\n🎉 Cleanup completed! Removed ${removedCount} unnecessary indexes.`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// CLI interface
const command = process.argv[2];

if (command === 'clean') {
  cleanUnnecessaryIndexes();
} else {
  analyzeAllIndexes();
}
