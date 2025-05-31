const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://admin:admin@cluster91438.fvtzi.mongodb.net/code_colab?retryWrites=true&w=majority&appName=Cluster91438', {
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

const analyzeFileContents = async () => {
  console.log('🔍 Analyzing file contents to identify what these files are...\n');
  
  try {
    const db = mongoose.connection.db;
    const filesCollection = db.collection('filestorages');
    
    const allFiles = await filesCollection.find({}).toArray();
    
    console.log(`Found ${allFiles.length} files to analyze:\n`);
    
    allFiles.forEach((doc, index) => {
      console.log(`File ${index + 1}:`);
      console.log(`  ID: ${doc._id}`);
      console.log(`  Session: ${doc.sessionId}`);
      console.log(`  Size: ${doc.content ? doc.content.length : 0} bytes`);
      console.log(`  Created: ${doc.createdAt}`);
      
      if (doc.content) {
        // Try to detect file type from content
        const contentStr = doc.content.toString('utf8', 0, Math.min(200, doc.content.length));
        
        // Check if it looks like a macOS system file
        if (contentStr.includes('Mac OS X') || 
            contentStr.includes('__MACOSX') || 
            contentStr.startsWith('._')) {
          console.log(`  🚫 DETECTED: Likely macOS system file`);
        }
        
        // Check if it starts with ZIP signature
        if (doc.content[0] === 0x50 && doc.content[1] === 0x4B) {
          console.log(`  📦 DETECTED: ZIP file`);
        }
        
        // Check for binary markers
        const isBinary = contentStr.includes('\0') || contentStr.includes('\ufffd');
        
        if (isBinary) {
          console.log(`  🔧 DETECTED: Binary file`);
          // Show hex dump of first 32 bytes
          const hexDump = Array.from(doc.content.slice(0, 32))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          console.log(`  Hex: ${hexDump}`);
        } else {
          console.log(`  📄 DETECTED: Text file`);
          console.log(`  Preview: ${contentStr.replace(/\n/g, '\\n').substring(0, 100)}...`);
        }
      }
      
      console.log('  ---\n');
    });
    
  } catch (error) {
    console.error('❌ Error analyzing files:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (connected) {
    await analyzeFileContents();
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
};

main().catch(console.error);
