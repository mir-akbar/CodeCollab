const fileStorageService = require('./services/fileStorageService');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/code_colab');

console.log('🧪 Testing file filtering system...\n');

async function testFileFiltering() {
  const sessionId = 'test-filtering-' + Date.now();
  
  try {
    console.log('1. Testing file filtering...');
    
    // Test files that should be rejected
    const systemFiles = [
      { fileName: '._test.py', filePath: '__MACOSX/._test.py' },
      { fileName: '.DS_Store', filePath: '.DS_Store' },
      { fileName: 'test.py', filePath: '__MACOSX/test.py' },
      { fileName: 'Thumbs.db', filePath: 'folder/Thumbs.db' },
      { fileName: 'desktop.ini', filePath: 'desktop.ini' }
    ];
    
    let rejectedCount = 0;
    let acceptedCount = 0;
    
    for (const fileInfo of systemFiles) {
      try {
        await fileStorageService.storeFile({
          sessionId,
          fileName: fileInfo.fileName,
          fileType: '.py',
          content: Buffer.from('# test file', 'utf8'),
          mimeType: 'text/plain',
          parentFolder: null,
          filePath: fileInfo.filePath
        });
        acceptedCount++;
        console.log(`❌ SHOULD REJECT: ${fileInfo.filePath} was accepted (this is a problem!)`);
      } catch (error) {
        if (error.message.includes('System file ignored')) {
          rejectedCount++;
          console.log(`✅ Correctly rejected: ${fileInfo.filePath}`);
        } else {
          console.log(`⚠️  Unexpected error for ${fileInfo.filePath}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n📊 Filtering Results:`);
    console.log(`   ✅ Correctly rejected: ${rejectedCount}/5`);
    console.log(`   ❌ Incorrectly accepted: ${acceptedCount}/5`);
    
    // Test files that should be accepted
    console.log('\n2. Testing valid files...');
    
    const validFiles = [
      { fileName: 'app.js', filePath: 'src/app.js' },
      { fileName: 'main.py', filePath: 'scripts/main.py' },
      { fileName: 'Test.java', filePath: 'com/example/Test.java' }
    ];
    
    let validAccepted = 0;
    
    for (const fileInfo of validFiles) {
      try {
        const result = await fileStorageService.storeFile({
          sessionId,
          fileName: fileInfo.fileName,
          fileType: fileInfo.fileName.split('.').pop(),
          content: Buffer.from('console.log("valid file");', 'utf8'),
          mimeType: 'text/plain',
          parentFolder: null,
          filePath: fileInfo.filePath
        });
        validAccepted++;
        console.log(`✅ Correctly accepted: ${fileInfo.filePath} (${result.fileSize} bytes)`);
      } catch (error) {
        console.log(`❌ SHOULD ACCEPT: ${fileInfo.filePath} was rejected: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Valid File Results:`);
    console.log(`   ✅ Correctly accepted: ${validAccepted}/3`);
    
    // Get final stats
    const stats = await fileStorageService.getStorageStats(sessionId);
    console.log('\n📈 Final Storage Stats:');
    console.log(`   Total files stored: ${stats.totalFiles}`);
    console.log(`   Total size: ${stats.totalStoredSize} bytes`);
    
    // Cleanup
    const cleanupCount = await fileStorageService.deleteSession(sessionId);
    console.log(`\n🧹 Cleaned up ${cleanupCount} test files`);
    
    console.log('\n🎉 File filtering test completed!');
    
    if (rejectedCount === 5 && validAccepted === 3) {
      console.log('✅ ALL TESTS PASSED - File filtering is working correctly!');
    } else {
      console.log('❌ SOME TESTS FAILED - File filtering needs attention!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

testFileFiltering();
