const mongoose = require('mongoose');
const FileStorage = require('./models/FileStorage');

async function checkSpecificSessions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/code_colab');
    console.log('✅ Connected to MongoDB\n');

    // Check for the specific sessions from the logs
    const testSessions = [
      'debug-hierarchy-1748631741138',
      'test-folder-hierarchy-1748631761181'
    ];

    for (const sessionId of testSessions) {
      console.log(`🔍 Checking session: ${sessionId}`);
      
      const files = await FileStorage.find({ sessionId }).select({
        fileName: 1,
        filePath: 1,
        fileType: 1,
        fileSize: 1,
        parentFolder: 1,
        mimeType: 1,
        isCompressed: 1,
        createdAt: 1
      }).sort({ filePath: 1 });

      if (files.length === 0) {
        console.log(`  ❌ No files found for session ${sessionId}`);
      } else {
        console.log(`  ✅ Found ${files.length} files:`);
        files.forEach(file => {
          console.log(`    📄 ${file.fileName} → ${file.filePath} (${file.fileSize} bytes)`);
        });
      }
      console.log('');
    }

    // Also check for any files created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentFiles = await FileStorage.find({
      createdAt: { $gte: oneHourAgo }
    }).select({
      sessionId: 1,
      fileName: 1,
      filePath: 1,
      createdAt: 1
    }).sort({ createdAt: -1 });

    console.log(`🕐 Files created in the last hour: ${recentFiles.length}`);
    if (recentFiles.length > 0) {
      console.log('Recent files:');
      recentFiles.forEach(file => {
        console.log(`  📄 ${file.fileName} (${file.filePath}) - ${file.sessionId} - ${file.createdAt}`);
      });
    }

    // Get database statistics
    const stats = await mongoose.connection.db.stats();
    console.log(`\n📊 Database stats:`);
    console.log(`  Collections: ${stats.collections}`);
    console.log(`  Data size: ${stats.dataSize} bytes`);
    console.log(`  Storage size: ${stats.storageSize} bytes`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkSpecificSessions();
