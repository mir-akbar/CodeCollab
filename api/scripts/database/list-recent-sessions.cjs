const { MongoClient } = require('mongodb');

const MONGODB_URL = 'mongodb://localhost:27017/coding-interview-system';

async function listRecentSessions() {
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db('coding-interview-system');
    
    // Get all sessions sorted by creation date
    console.log('\n📊 RECENT SESSIONS:');
    console.log('='.repeat(50));
    
    const sessions = await db.collection('sessions').find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    if (sessions.length > 0) {
      console.log(`✅ Found ${sessions.length} sessions:`);
      sessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.sessionId}`);
        console.log(`      Created: ${session.createdAt}`);
        console.log(`      Files: ${session.files ? session.files.length : 0}`);
        console.log('');
      });
      
      // Check the most recent session with files
      const sessionWithFiles = sessions.find(s => s.files && s.files.length > 0);
      if (sessionWithFiles) {
        console.log('\n📁 MOST RECENT SESSION WITH FILES:');
        console.log('='.repeat(50));
        console.log(`Session: ${sessionWithFiles.sessionId}`);
        console.log(`Files: ${sessionWithFiles.files.length}`);
        
        sessionWithFiles.files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name} (${file.type})`);
          console.log(`      Path: ${file.filePath}`);
          console.log(`      Size: ${file.size} bytes`);
        });
      }
    } else {
      console.log('❌ No sessions found in database');
    }
    
    // Check GridFS files
    console.log('\n🗂️ RECENT GRIDFS FILES:');
    console.log('='.repeat(50));
    
    const gridFSFiles = await db.collection('fs.files').find({})
      .sort({ uploadDate: -1 })
      .limit(10)
      .toArray();
    
    if (gridFSFiles.length > 0) {
      console.log(`✅ Found ${gridFSFiles.length} recent GridFS files:`);
      gridFSFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.filename}`);
        console.log(`      Session: ${file.metadata?.sessionId || 'N/A'}`);
        console.log(`      Path: ${file.metadata?.filePath || 'N/A'}`);
        console.log(`      Size: ${file.length} bytes`);
        console.log(`      Upload: ${file.uploadDate}`);
        console.log('');
      });
    } else {
      console.log('❌ No GridFS files found');
    }
    
  } catch (error) {
    console.error('❌ Error checking MongoDB:', error.message);
  } finally {
    await client.close();
  }
}

listRecentSessions();
