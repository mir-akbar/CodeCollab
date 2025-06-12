/**
 * Database Migration Script: Fix SessionParticipant Indexes
 * 
 * This script removes old userEmail-based indexes and ensures
 * proper cognitoId-based indexes are in place.
 * 
 * Run this script to fix the invitation system.
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixParticipantIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/code_colab');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('session_participants');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:', indexes.map(idx => idx.name));

    // Remove old userEmail-based indexes if they exist
    const oldIndexes = indexes.filter(idx => 
      idx.name && (idx.name.includes('userEmail') || idx.key?.userEmail)
    );

    for (const oldIndex of oldIndexes) {
      try {
        await collection.dropIndex(oldIndex.name);
        console.log(`🗑️  Dropped old index: ${oldIndex.name}`);
      } catch (error) {
        console.log(`⚠️  Could not drop index ${oldIndex.name}:`, error.message);
      }
    }

    // Ensure correct indexes exist
    const requiredIndexes = [
      { sessionId: 1, cognitoId: 1 }, // Unique compound index
      { cognitoId: 1, status: 1 },
      { sessionId: 1, status: 1 },
      { sessionId: 1, role: 1 }
    ];

    for (const indexSpec of requiredIndexes) {
      try {
        const isUnique = JSON.stringify(indexSpec) === JSON.stringify({ sessionId: 1, cognitoId: 1 });
        await collection.createIndex(indexSpec, isUnique ? { unique: true } : {});
        console.log(`✅ Ensured index exists:`, indexSpec);
      } catch (error) {
        if (error.code === 11000 || error.message.includes('already exists')) {
          console.log(`📝 Index already exists:`, indexSpec);
        } else {
          console.error(`❌ Error creating index:`, indexSpec, error.message);
        }
      }
    }

    // Remove any documents with null userEmail (orphaned data)
    const orphanedDocs = await collection.find({ 
      $or: [
        { userEmail: null },
        { userEmail: { $exists: true } }, // Remove any docs that still have userEmail field
        { cognitoId: { $exists: false } } // Remove docs without cognitoId
      ]
    }).toArray();

    if (orphanedDocs.length > 0) {
      console.log(`🧹 Found ${orphanedDocs.length} orphaned documents to clean up`);
      await collection.deleteMany({ 
        $or: [
          { userEmail: null },
          { userEmail: { $exists: true } },
          { cognitoId: { $exists: false } }
        ]
      });
      console.log(`✅ Cleaned up ${orphanedDocs.length} orphaned documents`);
    }

    console.log('🎉 SessionParticipant indexes fixed successfully!');
    console.log('📋 Final indexes:', (await collection.indexes()).map(idx => idx.name));

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
if (require.main === module) {
  fixParticipantIndexes();
}

module.exports = fixParticipantIndexes;
