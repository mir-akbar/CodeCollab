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

const cleanupSystemFiles = async () => {
  console.log('🧹 Starting cleanup of macOS system files...\n');
  
  try {
    const db = mongoose.connection.db;
    const filesCollection = db.collection('filestorages');
    
    // Find files that are likely macOS system files
    const allFiles = await filesCollection.find({}).toArray();
    const systemFiles = [];
    
    console.log('🔍 Analyzing files for macOS system file signatures...\n');
    
    for (const file of allFiles) {
      if (file.content) {
        const contentStr = file.content.toString('utf8', 0, Math.min(100, file.content.length));
        
        // Check for macOS system file signatures
        const isMacOSSystemFile = 
          contentStr.includes('Mac OS X') ||
          contentStr.includes('__MACOSX') ||
          (file.content[0] === 0x00 && contentStr.includes('Mac')) ||
          // Check for AppleDouble format (._files)
          (file.content[0] === 0x00 && file.content[1] === 0x05 && file.content[2] === 0x16 && file.content[3] === 0x07);
        
        // Also check if metadata fields are undefined (indicating old upload)
        const hasUndefinedMetadata = 
          file.fileName === undefined ||
          file.fileType === undefined ||
          file.mimeType === undefined;
        
        if (isMacOSSystemFile || (hasUndefinedMetadata && file.content.length < 1000 && contentStr.includes('Mac'))) {
          systemFiles.push(file);
          console.log(`🚫 Found system file: ID ${file._id}`);
          console.log(`   Size: ${file.content.length} bytes`);
          console.log(`   Created: ${file.createdAt}`);
          console.log(`   Has Mac signature: ${contentStr.includes('Mac OS X') || contentStr.includes('Mac')}`);
          console.log('   ---');
        }
      }
    }
    
    if (systemFiles.length === 0) {
      console.log('✅ No macOS system files found to clean up');
      return;
    }
    
    console.log(`\n⚠️  Found ${systemFiles.length} macOS system files to remove\n`);
    
    // Ask for confirmation
    console.log('🗑️  Proceeding with deletion...\n');
    
    let deletedCount = 0;
    for (const file of systemFiles) {
      try {
        await filesCollection.deleteOne({ _id: file._id });
        console.log(`✅ Deleted system file: ${file._id}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete file ${file._id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`   Deleted: ${deletedCount}/${systemFiles.length} system files`);
    
    // Show final statistics
    const remainingCount = await filesCollection.countDocuments();
    console.log(`   Remaining files in database: ${remainingCount}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (connected) {
    await cleanupSystemFiles();
    await disconnectDB();
    console.log('\n🔒 Database connection closed');
  }
};

main().catch(console.error);
