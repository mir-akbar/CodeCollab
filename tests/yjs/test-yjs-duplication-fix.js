#!/usr/bin/env node

/**
 * Test script to verify YJS content duplication fix
 * Simulates multiple users opening the same file and making edits
 */

import { io } from 'socket.io-client';
import * as Y from 'yjs';

const SERVER_URL = 'http://localhost:3012';
const TEST_SESSION = 'test-session-' + Date.now();
const TEST_FILE = 'test.js';
const ROOM_NAME = `${TEST_SESSION}-${TEST_FILE}`;

console.log('🧪 Testing YJS Content Duplication Fix...\n');
console.log(`Session: ${TEST_SESSION}`);
console.log(`File: ${TEST_FILE}`);
console.log(`Room: ${ROOM_NAME}\n`);

async function testMultiUserEditing() {
  return new Promise((resolve, reject) => {
    // Create two clients to simulate multiple users
    const client1 = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    const client2 = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    
    // YJS documents for each client
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    
    let client1Connected = false;
    let client2Connected = false;
    let client1Synced = false;
    let client2Synced = false;
    
    const initialContent = 'console.log("Initial content");';
    
    // Client 1 setup
    client1.on('connect', () => {
      console.log('👤 Client 1 connected');
      client1Connected = true;
      
      // Join room and request sync
      client1.emit('yjs-join-room', { room: ROOM_NAME });
      
      setTimeout(() => {
        client1.emit('yjs-request-sync', { room: ROOM_NAME });
      }, 100);
    });
    
    client1.on('yjs-sync-response', ({ content }) => {
      console.log('📥 Client 1 received sync response');
      
      if (content && content.length > 0) {
        Y.applyUpdate(doc1, new Uint8Array(content));
        console.log('   Applied existing content to Client 1');
      }
      
      // Add initial content if document is empty
      const ytext1 = doc1.getText('monaco');
      if (ytext1.length === 0) {
        ytext1.insert(0, initialContent);
        console.log('   Client 1 added initial content');
      }
      
      client1Synced = true;
      checkIfReady();
    });
    
    // Client 2 setup
    client2.on('connect', () => {
      console.log('👤 Client 2 connected');
      client2Connected = true;
      
      // Join room and request sync (after a delay to simulate real scenario)
      setTimeout(() => {
        client2.emit('yjs-join-room', { room: ROOM_NAME });
        client2.emit('yjs-request-sync', { room: ROOM_NAME });
      }, 500);
    });
    
    client2.on('yjs-sync-response', ({ content }) => {
      console.log('📥 Client 2 received sync response');
      
      if (content && content.length > 0) {
        Y.applyUpdate(doc2, new Uint8Array(content));
        console.log('   Applied existing content to Client 2');
      }
      
      client2Synced = true;
      checkIfReady();
    });
    
    // Set up YJS update listeners
    doc1.on('update', (update, origin) => {
      if (origin !== 'remote') {
        client1.emit('yjs-update', {
          room: ROOM_NAME,
          update: Array.from(update),
          origin: client1.id
        });
      }
    });
    
    doc2.on('update', (update, origin) => {
      if (origin !== 'remote') {
        client2.emit('yjs-update', {
          room: ROOM_NAME,
          update: Array.from(update),
          origin: client2.id
        });
      }
    });
    
    // Handle incoming YJS updates
    client1.on('yjs-update', ({ update, origin }) => {
      if (origin !== client1.id) {
        Y.applyUpdate(doc1, new Uint8Array(update), 'remote');
      }
    });
    
    client2.on('yjs-update', ({ update, origin }) => {
      if (origin !== client2.id) {
        Y.applyUpdate(doc2, new Uint8Array(update), 'remote');
      }
    });
    
    function checkIfReady() {
      if (client1Connected && client2Connected && client1Synced && client2Synced) {
        console.log('\n🔄 Both clients ready, testing collaborative editing...\n');
        testCollaborativeEditing();
      }
    }
    
    function testCollaborativeEditing() {
      // Wait a moment for initial sync
      setTimeout(() => {
        // Client 1 makes an edit
        const ytext1 = doc1.getText('monaco');
        ytext1.insert(ytext1.length, '\n// Client 1 edit');
        console.log('✏️  Client 1 made an edit');
        
        // Client 2 makes an edit after a short delay
        setTimeout(() => {
          const ytext2 = doc2.getText('monaco');
          ytext2.insert(0, '// Client 2 edit at start\n');
          console.log('✏️  Client 2 made an edit');
          
          // Check results after edits
          setTimeout(() => {
            checkResults();
          }, 1000);
        }, 500);
      }, 500);
    }
    
    function checkResults() {
      const content1 = doc1.getText('monaco').toString();
      const content2 = doc2.getText('monaco').toString();
      
      console.log('\n📊 RESULTS:\n');
      console.log('Client 1 document:');
      console.log('=' .repeat(50));
      console.log(content1);
      console.log('=' .repeat(50));
      
      console.log('\nClient 2 document:');
      console.log('=' .repeat(50));
      console.log(content2);
      console.log('=' .repeat(50));
      
      // Check for content duplication
      const hasDuplication = checkForDuplication(content1) || checkForDuplication(content2);
      const contentsMatch = content1 === content2;
      
      console.log('\n✅ ANALYSIS:');
      console.log(`Documents match: ${contentsMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`Content duplication detected: ${hasDuplication ? '❌ YES' : '✅ NO'}`);
      
      if (!hasDuplication && contentsMatch) {
        console.log('\n🎉 SUCCESS: No content duplication detected!');
        resolve(true);
      } else {
        console.log('\n❌ FAILURE: Content duplication still occurs!');
        resolve(false);
      }
      
      // Cleanup
      client1.disconnect();
      client2.disconnect();
    }
    
    function checkForDuplication(content) {
      // Simple check for repeated lines
      const lines = content.split('\n');
      const uniqueLines = new Set(lines.filter(line => line.trim()));
      return lines.filter(line => line.trim()).length > uniqueLines.size;
    }
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('\n⏰ Test timeout - disconnecting clients');
      client1.disconnect();
      client2.disconnect();
      reject(new Error('Test timeout'));
    }, 10000);
  });
}

// Run the test
testMultiUserEditing()
  .then((success) => {
    if (success) {
      console.log('\n🎉 YJS duplication fix verified successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ YJS duplication fix failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
