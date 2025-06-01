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

const inspectDatabase = async () => {
  console.log('🔍 Inspecting database collections and documents...\n');
  
  try {
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Collections found:');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });
    console.log('');
    
    // Check filestorages collection specifically
    const db = mongoose.connection.db;
    const filesCollection = db.collection('filestorages');
    
    const fileCount = await filesCollection.countDocuments();
    console.log(`📄 Files in 'filestorages' collection: ${fileCount}\n`);
    
    if (fileCount > 0) {
      console.log('🔍 Sample documents (showing first 3):');
      const sampleDocs = await filesCollection.find({}).limit(3).toArray();
      
      sampleDocs.forEach((doc, index) => {
        console.log(`Document ${index + 1}:`);
        console.log('  _id:', doc._id);
        console.log('  sessionId:', doc.sessionId);
        console.log('  fileName:', doc.fileName);
        console.log('  fileType:', doc.fileType);
        console.log('  filePath:', doc.filePath);
        console.log('  mimeType:', doc.mimeType);
        console.log('  fileSize:', doc.fileSize);
        console.log('  content length:', doc.content ? doc.content.length : 'N/A');
        console.log('  createdAt:', doc.createdAt);
        console.log('  ---');
      });
      
      // Look for potential system files
      console.log('\n🔍 Searching for potential system files...');
      
      const systemFilePatterns = [
        { fileName: { $regex: /^._/ } },
        { fileName: '.DS_Store' },
        { fileName: { $regex: /__MACOSX/ } },
        { filePath: { $regex: /__MACOSX/ } },
        { fileName: 'Thumbs.db' },
        { fileName: 'desktop.ini' }
      ];
      
      for (const pattern of systemFilePatterns) {
        const matches = await filesCollection.find(pattern).toArray();
        if (matches.length > 0) {
          console.log(`⚠️  Found ${matches.length} files matching pattern:`, pattern);
          matches.forEach(match => {
            console.log(`   🚫 ${match.fileName} (${match.filePath || 'no path'})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (connected) {
    await inspectDatabase();
    await disconnectDB();
    console.log('\n🔒 Database connection closed');
  }
};

main().catch(console.error);
