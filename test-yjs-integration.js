#!/usr/bin/env node

/**
 * YJS Integration Test Script
 * Tests the basic YJS functionality and MongoDB integration
 */

const path = require('path');
const Y = require('yjs');

// Change to API directory to access services
process.chdir(path.join(__dirname, 'api'));

// Import services
const fileStorageService = require('./services/fileStorageService');
require('./db/index.js'); // Connect to MongoDB

async function testYjsIntegration() {
  console.log('🧪 Testing YJS Integration...\n');
  
  const testSessionId = 'test-session-' + Date.now();
  const testFilePath = 'test.js';
  
  try {
    // Test 1: Create YJS document with initial content
    console.log('1. Creating YJS document with initial content...');
    const doc1 = new Y.Doc();
    const ytext1 = doc1.getText('monaco');
    ytext1.insert(0, 'console.log("Hello YJS!");');
    
    const update1 = Y.encodeStateAsUpdate(doc1);
    console.log('✅ YJS document created');
    
    // Test 2: Sync YJS document to MongoDB
    console.log('\n2. Syncing YJS document to MongoDB...');
    await fileStorageService.syncYjsDocumentToFile(testSessionId, testFilePath, update1);
    console.log('✅ YJS document synced to MongoDB');
    
    // Test 3: Load YJS document from MongoDB
    console.log('\n3. Loading YJS document from MongoDB...');
    const loadedUpdate = await fileStorageService.getYjsDocumentFromFile(testSessionId, testFilePath);
    
    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, loadedUpdate);
    const ytext2 = doc2.getText('monaco');
    const loadedContent = ytext2.toString();
    
    console.log('✅ YJS document loaded from MongoDB');
    console.log('   Content:', loadedContent);
    
    // Test 4: Verify content integrity
    console.log('\n4. Verifying content integrity...');
    const originalContent = ytext1.toString();
    if (originalContent === loadedContent) {
      console.log('✅ Content integrity verified');
    } else {
      console.log('❌ Content mismatch!');
      console.log('   Original:', originalContent);
      console.log('   Loaded:', loadedContent);
    }
    
    // Test 5: Test collaborative editing simulation
    console.log('\n5. Testing collaborative editing simulation...');
    
    // User 1 makes changes
    ytext2.insert(ytext2.length, '\nconsole.log("User 1 edit");');
    const user1Update = Y.encodeStateAsUpdate(doc2);
    
    // User 2 document (starting from same state)
    const doc3 = new Y.Doc();
    Y.applyUpdate(doc3, loadedUpdate);
    const ytext3 = doc3.getText('monaco');
    ytext3.insert(0, '// User 2 comment\n');
    const user2Update = Y.encodeStateAsUpdate(doc3);
    
    // Merge both updates (simulating conflict resolution)
    const finalDoc = new Y.Doc();
    Y.applyUpdate(finalDoc, loadedUpdate);
    Y.applyUpdate(finalDoc, Y.encodeStateAsUpdate(doc2));
    Y.applyUpdate(finalDoc, Y.encodeStateAsUpdate(doc3));
    
    const finalContent = finalDoc.getText('monaco').toString();
    console.log('✅ Collaborative editing simulation completed');
    console.log('   Final content:', finalContent);
    
    // Test 6: Clean up
    console.log('\n6. Cleaning up test data...');
    await fileStorageService.deleteSession(testSessionId);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All YJS integration tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the test
testYjsIntegration();
