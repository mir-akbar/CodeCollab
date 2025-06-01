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

const fixIndexes = async () => {
  console.log('🔧 Fixing MongoDB indexes...\n');
  
  try {
    const db = mongoose.connection.db;
    const filesCollection = db.collection('filestorages');
    
    // List current indexes
    console.log('📋 Current indexes:');
    const indexes = await filesCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Check if there's a problematic filename index
    const filenameIndex = indexes.find(idx => idx.key && idx.key.filename);
    
    if (filenameIndex) {
      console.log(`\n🗑️  Dropping problematic filename index: ${filenameIndex.name}`);
      await filesCollection.dropIndex(filenameIndex.name);
      console.log('✅ Filename index dropped successfully');
    } else {
      console.log('\n✅ No problematic filename index found');
    }
    
    // List indexes after cleanup
    console.log('\n📋 Indexes after cleanup:');
    const newIndexes = await filesCollection.indexes();
    newIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (connected) {
    await fixIndexes();
    await disconnectDB();
    console.log('\n🔒 Database connection closed');
  }
};

main().catch(console.error);
