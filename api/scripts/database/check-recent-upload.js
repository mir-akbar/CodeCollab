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

const checkRecentFiles = async () => {
  console.log('🔍 Checking for recently uploaded files...\n');
  
  try {
    const db = mongoose.connection.db;
    const filesCollection = db.collection('filestorages');
    
    // Get files from the test session
    const testSessionFiles = await filesCollection.find({ 
      sessionId: 'test-session-123' 
    }).toArray();
    
    console.log(`📄 Files found for test session: ${testSessionFiles.length}\n`);
    
    if (testSessionFiles.length > 0) {
      testSessionFiles.forEach((file, index) => {
        console.log(`File ${index + 1}:`);
        console.log(`  ID: ${file._id}`);
        console.log(`  Session: ${file.sessionId}`);
        console.log(`  Name: ${file.fileName}`);
        console.log(`  Type: ${file.fileType}`);
        console.log(`  Path: ${file.filePath}`);
        console.log(`  Size: ${file.fileSize} bytes`);
        console.log(`  MIME: ${file.mimeType}`);
        console.log(`  Created: ${file.createdAt}`);
        
        if (file.content) {
          const contentPreview = file.content.toString('utf8', 0, Math.min(100, file.content.length));
          console.log(`  Content: ${contentPreview.replace(/\n/g, '\\n')}`);
        }
        console.log('  ---');
      });
    }
    
    // Check total files
    const totalFiles = await filesCollection.countDocuments();
    console.log(`\n📊 Total files in database: ${totalFiles}`);
    
  } catch (error) {
    console.error('❌ Error checking files:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (connected) {
    await checkRecentFiles();
    await disconnectDB();
    console.log('\n🔒 Database connection closed');
  }
};

main().catch(console.error);
