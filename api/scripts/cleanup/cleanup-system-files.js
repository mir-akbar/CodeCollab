const mongoose = require('mongoose');
const FileStorage = require('./models/FileStorage');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/code_colab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log('🧹 Starting cleanup of unwanted system files from MongoDB...\n');

async function cleanupSystemFiles() {
  try {
    // Find all files that match system file patterns
    const systemFilePatterns = [
      { filePath: { $regex: /__MACOSX/ } },      // __MACOSX directory
      { fileName: { $regex: /^\._/ } },          // ._ prefixed files
      { fileName: '.DS_Store' },                 // macOS .DS_Store
      { fileName: 'Thumbs.db' },                 // Windows thumbnails
      { fileName: 'desktop.ini' },               // Windows desktop.ini
      { filePath: { $regex: /\.git\// } },       // Git files
      { filePath: { $regex: /node_modules\// } }, // Node modules
      { filePath: { $regex: /\.vscode\// } },     // VS Code files
      { filePath: { $regex: /\.idea\// } },       // IntelliJ files
    ];

    console.log('🔍 Searching for system files to remove...');
    
    for (const pattern of systemFilePatterns) {
      const files = await FileStorage.find(pattern);
      
      if (files.length > 0) {
        console.log(`\n📁 Found ${files.length} files matching pattern:`, JSON.stringify(pattern));
        
        // List the files before deletion
        files.forEach(file => {
          console.log(`   - ${file.filePath || file.fileName} (${file.fileSize} bytes)`);
        });
        
        // Delete the files
        const deleteResult = await FileStorage.deleteMany(pattern);
        console.log(`   ✅ Deleted ${deleteResult.deletedCount} files`);
      }
    }

    // Get storage statistics after cleanup
    console.log('\n📊 Storage statistics after cleanup:');
    const totalFiles = await FileStorage.countDocuments();
    const aggregation = await FileStorage.aggregate([
      {
        $group: {
          _id: null,
          totalOriginalSize: { $sum: '$fileSize' },
          totalStoredSize: { $sum: { $ifNull: ['$compressedSize', '$fileSize'] } },
          compressedFiles: { $sum: { $cond: ['$isCompressed', 1, 0] } }
        }
      }
    ]);

    if (aggregation.length > 0) {
      const stats = aggregation[0];
      const spaceSaved = stats.totalOriginalSize - stats.totalStoredSize;
      const compressionRatio = stats.totalOriginalSize > 0 
        ? ((spaceSaved / stats.totalOriginalSize) * 100).toFixed(2)
        : 0;

      console.log(`   Total files remaining: ${totalFiles}`);
      console.log(`   Original size: ${(stats.totalOriginalSize / 1024).toFixed(2)} KB`);
      console.log(`   Stored size: ${(stats.totalStoredSize / 1024).toFixed(2)} KB`);
      console.log(`   Space saved: ${(spaceSaved / 1024).toFixed(2)} KB`);
      console.log(`   Compression ratio: ${compressionRatio}%`);
      console.log(`   Compressed files: ${stats.compressedFiles}/${totalFiles}`);
    } else {
      console.log('   No files found in database');
    }

    console.log('\n🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the cleanup
cleanupSystemFiles();
