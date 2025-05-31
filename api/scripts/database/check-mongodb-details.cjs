const { MongoClient } = require('mongodb');

const MONGODB_URL = 'mongodb://localhost:27017/coding-interview-system';

async function checkMongoDBDetails(sessionId) {
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db('coding-interview-system');
    
    // Check session data
    console.log(`\n📊 CHECKING SESSION: ${sessionId}`);
    console.log('='.repeat(50));
    
    const sessionData = await db.collection('sessions').findOne({ sessionId });
    if (sessionData) {
      console.log('✅ Session found in database');
      console.log(`   Created: ${sessionData.createdAt}`);
      console.log(`   Files: ${sessionData.files ? sessionData.files.length : 0}`);
      
      if (sessionData.files && sessionData.files.length > 0) {
        console.log('\n📁 FILE DETAILS:');
        sessionData.files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name} (${file.type})`);
          console.log(`      Path: ${file.filePath}`);
          console.log(`      Size: ${file.size} bytes`);
          console.log(`      MIME: ${file.mimeType || 'N/A'}`);
          console.log(`      ID: ${file.fileId || 'N/A'}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Session not found in database');
    }
    
    // Check GridFS files
    console.log('\n🗂️ CHECKING GRIDFS FILES:');
    console.log('='.repeat(50));
    
    const gridFSFiles = await db.collection('fs.files').find({
      'metadata.sessionId': sessionId
    }).toArray();
    
    if (gridFSFiles.length > 0) {
      console.log(`✅ Found ${gridFSFiles.length} files in GridFS`);
      gridFSFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.filename}`);
        console.log(`      Size: ${file.length} bytes`);
        console.log(`      Upload Date: ${file.uploadDate}`);
        console.log(`      Content Type: ${file.contentType || 'N/A'}`);
        console.log(`      Session: ${file.metadata?.sessionId || 'N/A'}`);
        console.log(`      File Path: ${file.metadata?.filePath || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ No files found in GridFS for this session');
    }
    
  } catch (error) {
    console.error('❌ Error checking MongoDB:', error.message);
  } finally {
    await client.close();
  }
}

// Get session ID from command line or use default
const sessionId = process.argv[2] || 'debug-hierarchy-1748632004137';
checkMongoDBDetails(sessionId);
