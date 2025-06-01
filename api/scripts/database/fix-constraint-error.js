const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../../config/database');

// MongoDB connection
const connectDB = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

const fixDuplicateKeyError = async () => {
  console.log('🔧 Fixing duplicate key constraint errors...\n');
  
  try {
    const db = mongoose.connection.db;
    const filesCollection = db.collection('filestorages');
    
    // 1. First, let's check the problematic documents
    console.log('🔍 Finding documents with null/undefined filePath...');
    const problematicDocs = await filesCollection.find({
      $or: [
        { filePath: null },
        { filePath: undefined },
        { filePath: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`Found ${problematicDocs.length} problematic documents`);
    
    if (problematicDocs.length > 0) {
      console.log('\n🗑️  Removing documents with null/undefined filePath...');
      const deleteResult = await filesCollection.deleteMany({
        $or: [
          { filePath: null },
          { filePath: undefined },
          { filePath: { $exists: false } }
        ]
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} problematic documents`);
    }
    
    // 2. Check if there's a problematic index on 'path' field
    console.log('\n📋 Checking for problematic indexes...');
    const indexes = await filesCollection.indexes();
    
    const pathIndex = indexes.find(idx => idx.key && idx.key.path !== undefined);
    if (pathIndex) {
      console.log(`\n🗑️  Found problematic index on 'path' field: ${pathIndex.name}`);
      console.log('Dropping this index...');
      await filesCollection.dropIndex(pathIndex.name);
      console.log('✅ Problematic index dropped');
    }
    
    // 3. Ensure correct index exists on filePath (not path)
    console.log('\n🔧 Ensuring correct index on filePath...');
    try {
      await filesCollection.createIndex(
        { sessionId: 1, filePath: 1 }, 
        { unique: true, name: 'sessionId_1_filePath_1' }
      );
      console.log('✅ Created correct index: sessionId_1_filePath_1');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Index already exists or duplicate values found');
      } else {
        console.log('ℹ️  Index may already exist:', error.message);
      }
    }
    
    // 4. List final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await filesCollection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}${index.unique ? ' (UNIQUE)' : ''}`);
    });
    
    // 5. Verify no duplicates remain
    console.log('\n🔍 Verifying no duplicate sessionId + filePath combinations remain...');
    const duplicates = await filesCollection.aggregate([
      {
        $group: {
          _id: { sessionId: '$sessionId', filePath: '$filePath' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate combinations found - database is clean!');
    } else {
      console.log(`⚠️  Still found ${duplicates.length} duplicate combinations`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing duplicate key constraints:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (connected) {
    await fixDuplicateKeyError();
    await disconnectDB();
    console.log('\n🔒 Database connection closed');
  }
};

main().catch(console.error);
