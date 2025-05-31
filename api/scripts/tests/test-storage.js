const mongoose = require('mongoose');
const fileStorageService = require('./services/fileStorageService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/codelab', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  testFileStorage();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

async function testFileStorage() {
  const sessionId = 'test-session-' + Date.now();
  
  try {
    console.log('\n🧪 Testing File Storage Service...\n');
    
    // Test 1: Store a small file
    console.log('1. Testing small file storage...');
    const smallFile = await fileStorageService.storeFile({
      sessionId,
      fileName: 'test.js',
      fileType: '.js',
      content: Buffer.from('console.log("Hello World!");', 'utf8'),
      mimeType: 'application/javascript',
      parentFolder: null,
      filePath: 'test.js'
    });
    console.log('✅ Small file stored:', smallFile.fileName, `(${smallFile.fileSize} bytes)`);
    
    // Test 2: Store a larger file with compression
    console.log('\n2. Testing large file with compression...');
    const largeContent = 'console.log("This is a test");'.repeat(1000);
    const largeFile = await fileStorageService.storeFile({
      sessionId,
      fileName: 'large.js',
      fileType: '.js',
      content: Buffer.from(largeContent, 'utf8'),
      mimeType: 'application/javascript',
      parentFolder: null,
      filePath: 'large.js'
    });
    console.log('✅ Large file stored:', largeFile.fileName, `(${largeFile.fileSize} bytes)`);
    if (largeFile.isCompressed) {
      console.log('   📦 Compression enabled, saved space:', 
        (largeFile.fileSize - largeFile.compressedSize), 'bytes');
    }
    
    // Test 3: Retrieve file
    console.log('\n3. Testing file retrieval...');
    const retrievedFile = await fileStorageService.getFile(sessionId, 'test.js');
    const content = retrievedFile.content.toString('utf8');
    console.log('✅ File retrieved:', retrievedFile.fileName);
    console.log('   Content:', content);
    
    // Test 4: Update file content
    console.log('\n4. Testing file update...');
    const newContent = Buffer.from('console.log("Updated content!");', 'utf8');
    const updatedFile = await fileStorageService.updateFileContent(sessionId, 'test.js', newContent);
    console.log('✅ File updated:', updatedFile.fileName);
    
    // Test 5: Get storage stats
    console.log('\n5. Testing storage statistics...');
    const stats = await fileStorageService.getStorageStats(sessionId);
    console.log('✅ Storage stats:');
    console.log('   Total files:', stats.totalFiles);
    console.log('   Original size:', stats.totalOriginalSize, 'bytes');
    console.log('   Stored size:', stats.totalStoredSize, 'bytes');
    console.log('   Compression ratio:', stats.compressionRatio + '%');
    
    // Test 6: Get file hierarchy
    console.log('\n6. Testing file hierarchy...');
    const hierarchy = await fileStorageService.getFileHierarchy(sessionId);
    console.log('✅ File hierarchy:', JSON.stringify(hierarchy, null, 2));
    
    // Test 7: Clean up
    console.log('\n7. Testing session cleanup...');
    const deletedCount = await fileStorageService.deleteSession(sessionId);
    console.log('✅ Session cleaned up, deleted files:', deletedCount);
    
    console.log('\n🎉 All tests passed! File storage service is working correctly.\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.disconnect();
  }
}
