const mongoose = require('mongoose');
const FileStorage = require('./models/FileStorage');

async function checkStorageAfterUpload() {
  try {
    console.log('🔌 Connecting to MongoDB after successful upload...');
    await mongoose.connect('mongodb://localhost:27017/code_colab');
    console.log('✅ Connected to MongoDB\n');

    // Check the most recent session
    const latestSession = 'storage-test-1748631950643';
    console.log(`🔍 Checking session: ${latestSession}`);
    
    const files = await FileStorage.find({ sessionId: latestSession }).select({
      fileName: 1,
      filePath: 1,
      fileType: 1,
      fileSize: 1,
      parentFolder: 1,
      mimeType: 1,
      isCompressed: 1,
      createdAt: 1
    }).sort({ filePath: 1 });

    console.log(`Found ${files.length} files in database:`);
    files.forEach(file => {
      console.log(`  📄 ${file.fileName} → ${file.filePath}`);
      console.log(`      Type: ${file.fileType} | Size: ${file.fileSize} bytes`);
      console.log(`      MIME: ${file.mimeType} | Compressed: ${file.isCompressed}`);
      console.log(`      Parent: ${file.parentFolder || 'None'}`);
      console.log(`      Created: ${file.createdAt}`);
      console.log('');
    });

    // Verify folder structure in database
    if (files.length > 0) {
      console.log('✅ DATABASE VERIFICATION:');
      const hasNestedFiles = files.some(f => f.filePath.includes('/'));
      const hasProperPaths = files.every(f => f.filePath && f.fileName);
      const hasMetadata = files.every(f => f.fileType && f.mimeType);
      
      console.log(`  Nested folder paths: ${hasNestedFiles ? '✅' : '❌'}`);
      console.log(`  Proper file paths: ${hasProperPaths ? '✅' : '❌'}`);
      console.log(`  Complete metadata: ${hasMetadata ? '✅' : '❌'}`);
      
      // Check if folder structure is preserved
      const nestedFile = files.find(f => f.filePath === 'folder/nested.py');
      if (nestedFile) {
        console.log(`  ✅ Nested file stored correctly: ${nestedFile.fileName} at ${nestedFile.filePath}`);
      }
    }

    // Get total count of all files
    const totalFiles = await FileStorage.countDocuments();
    console.log(`\n📊 Total files in database: ${totalFiles}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkStorageAfterUpload();
