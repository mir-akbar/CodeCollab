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

const checkSystemStatus = async () => {
  console.log('🔍 Checking system status...\n');
  
  try {
    const db = mongoose.connection.db;
    
    // Check filestorages collection
    const filesCollection = db.collection('filestorages');
    const totalFiles = await filesCollection.countDocuments();
    console.log(`📁 Total files in storage: ${totalFiles}`);
    
    // Get recent files (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFiles = await filesCollection.find({
      createdAt: { $gte: twentyFourHoursAgo }
    }).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`\n📅 Recent files (last 24 hours): ${recentFiles.length}`);
    if (recentFiles.length > 0) {
      recentFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.fileName} (${file.sessionId}) - ${file.createdAt}`);
      });
    }
    
    // Check sessions
    const sessionsCollection = db.collection('sessionmanagements');
    const totalSessions = await sessionsCollection.countDocuments();
    console.log(`\n👥 Total sessions: ${totalSessions}`);
    
    // Get recent sessions
    const recentSessions = await sessionsCollection.find({
      uploaded_at: { $gte: twentyFourHoursAgo }
    }).sort({ uploaded_at: -1 }).limit(5).toArray();
    
    console.log(`\n📅 Recent sessions (last 24 hours): ${recentSessions.length}`);
    if (recentSessions.length > 0) {
      recentSessions.forEach((session, index) => {
        console.log(`${index + 1}. ${session.name || 'Unnamed'} (${session.session_id}) - ${session.email}`);
      });
    }
    
    // Check for any system files that might have slipped through
    console.log('\n🔍 Checking for any unwanted system files...');
    const systemFilePatterns = [
      { fileName: { $regex: /^._/ } },
      { fileName: '.DS_Store' },
      { fileName: { $regex: /__MACOSX/ } },
      { filePath: { $regex: /__MACOSX/ } },
      { fileName: 'Thumbs.db' },
      { fileName: 'desktop.ini' }
    ];
    
    let systemFilesFound = 0;
    for (const pattern of systemFilePatterns) {
      const matches = await filesCollection.find(pattern).toArray();
      systemFilesFound += matches.length;
      if (matches.length > 0) {
        console.log(`⚠️  Found ${matches.length} files matching pattern:`, pattern);
        matches.forEach(match => {
          console.log(`   🚫 ${match.fileName} (${match.filePath || 'no path'})`);
        });
      }
    }
    
    if (systemFilesFound === 0) {
      console.log('✅ No unwanted system files found - filtering is working!');
    }
    
    // Storage statistics
    console.log('\n📊 Storage Statistics:');
    const stats = await filesCollection.aggregate([
      {
        $group: {
          _id: null,
          totalOriginalSize: { $sum: '$fileSize' },
          totalStoredSize: { 
            $sum: { 
              $cond: [
                '$isCompressed', 
                '$compressedSize', 
                '$fileSize'
              ] 
            }
          },
          compressedFiles: { $sum: { $cond: ['$isCompressed', 1, 0] } }
        }
      }
    ]).toArray();
    
    if (stats.length > 0) {
      const stat = stats[0];
      const compressionRatio = stat.totalOriginalSize > 0 
        ? ((stat.totalOriginalSize - stat.totalStoredSize) / stat.totalOriginalSize * 100).toFixed(2)
        : 0;
      
      console.log(`   📁 Total files: ${totalFiles}`);
      console.log(`   📏 Original size: ${stat.totalOriginalSize} bytes`);
      console.log(`   💾 Stored size: ${stat.totalStoredSize} bytes`);
      console.log(`   🗜️  Compressed files: ${stat.compressedFiles}`);
      console.log(`   📉 Compression ratio: ${compressionRatio}%`);
    }
    
  } catch (error) {
    console.error('❌ Error checking system status:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (connected) {
    await checkSystemStatus();
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
};

main().catch(console.error);
