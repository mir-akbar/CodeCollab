const mongoose = require('mongoose');

async function checkDatabaseConnection() {
  try {
    console.log('🔌 Checking MongoDB connection...');
    await mongoose.connect('mongodb://localhost:27017/code_colab');
    console.log('✅ Connected to MongoDB successfully');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 Available collections:');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });

    // Check if FileStorage collection exists and has data
    const FileStorage = require('./models/FileStorage');
    const totalFiles = await FileStorage.countDocuments();
    console.log(`\n📊 Total files in FileStorage: ${totalFiles}`);

    if (totalFiles > 0) {
      // Get sample files
      const sampleFiles = await FileStorage.find().limit(5).select({
        sessionId: 1,
        fileName: 1,
        filePath: 1,
        createdAt: 1
      }).sort({ createdAt: -1 });

      console.log('\n📄 Sample files:');
      sampleFiles.forEach(file => {
        console.log(`  - ${file.fileName} (${file.filePath}) - Session: ${file.sessionId}`);
      });
    }

    // Check distinct sessions
    const sessions = await FileStorage.distinct('sessionId');
    console.log(`\n🔗 Unique sessions: ${sessions.length}`);
    if (sessions.length > 0) {
      console.log('Recent sessions:');
      sessions.slice(-5).forEach(sessionId => {
        console.log(`  - ${sessionId}`);
      });
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkDatabaseConnection();
