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

const checkIndexes = async () => {
  console.log('🔍 Checking database indexes and duplicate key errors...\n');
  
  try {
    const db = mongoose.connection.db;
    
    // Check filestorages collection indexes
    const filesCollection = db.collection('filestorages');
    
    console.log('📋 Current indexes in filestorages collection:');
    const indexes = await filesCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}${index.unique ? ' (UNIQUE)' : ''}`);
    });
    
    // Check for documents with null filePath
    console.log('\n🔍 Checking for documents with null filePath...');
    const nullPathDocs = await filesCollection.find({ filePath: null }).toArray();
    console.log(`Found ${nullPathDocs.length} documents with null filePath`);
    
    if (nullPathDocs.length > 0) {
      console.log('\n📄 Documents with null filePath:');
      nullPathDocs.forEach((doc, index) => {
        console.log(`${index + 1}. _id: ${doc._id}, sessionId: ${doc.sessionId}, fileName: ${doc.fileName}, filePath: ${doc.filePath}`);
      });
    }
    
    // Check for duplicate sessionId + filePath combinations
    console.log('\n🔍 Checking for duplicate sessionId + filePath combinations...');
    const duplicates = await filesCollection.aggregate([
      {
        $group: {
          _id: { sessionId: '$sessionId', filePath: '$filePath' },
          count: { $sum: 1 },
          docs: { $push: { id: '$_id', fileName: '$fileName' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate sessionId + filePath combinations:`);
      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. sessionId: ${dup._id.sessionId}, filePath: ${dup._id.filePath}, count: ${dup.count}`);
        dup.docs.forEach(doc => {
          console.log(`   - ${doc.id}: ${doc.fileName}`);
        });
      });
    } else {
      console.log('✅ No duplicate sessionId + filePath combinations found');
    }
    
    // Check sessionmanagements collection too
    console.log('\n📋 Checking sessionmanagements collection...');
    const sessionCollection = db.collection('sessionmanagements');
    const sessionIndexes = await sessionCollection.indexes();
    console.log('Current indexes in sessionmanagements collection:');
    sessionIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}${index.unique ? ' (UNIQUE)' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (connected) {
    await checkIndexes();
    await disconnectDB();
    console.log('\n🔒 Database connection closed');
  }
};

main().catch(console.error);
