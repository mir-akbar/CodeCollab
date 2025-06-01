// Debug script to test cursor awareness visibility
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';

// Simulate two users connecting to the same room
console.log('🔍 Testing Cursor Awareness Visibility...\n');

// User 1 setup
const doc1 = new Y.Doc();
const awareness1 = new Awareness(doc1);
const socket1 = io('http://localhost:3000', { transports: ['websocket', 'polling'] });
const roomName = 'test-session-test-file.js';

// User 2 setup
const doc2 = new Y.Doc();
const awareness2 = new Awareness(doc2);
const socket2 = io('http://localhost:3000', { transports: ['websocket', 'polling'] });

let user1Connected = false;
let user2Connected = false;

// User 1 setup
socket1.on('connect', () => {
  console.log('👤 User 1 connected:', socket1.id);
  user1Connected = true;
  
  // Join room
  socket1.emit('yjs-join-room', { room: roomName });
  
  // Set awareness state for User 1
  awareness1.setLocalStateField('user', {
    name: 'User1',
    color: '#ff0000',
    colorLight: '#ff000033'
  });
  
  // Set a cursor position
  awareness1.setLocalStateField('cursor', {
    line: 1,
    column: 5,
    selection: { startLine: 1, startColumn: 5, endLine: 1, endColumn: 5 }
  });
  
  console.log('✅ User 1 awareness set:', awareness1.getLocalState());
  
  checkBothUsersReady();
});

// User 2 setup
socket2.on('connect', () => {
  console.log('👤 User 2 connected:', socket2.id);
  user2Connected = true;
  
  // Join room
  socket2.emit('yjs-join-room', { room: roomName });
  
  // Set awareness state for User 2
  awareness2.setLocalStateField('user', {
    name: 'User2',
    color: '#00ff00',
    colorLight: '#00ff0033'
  });
  
  // Set a different cursor position
  awareness2.setLocalStateField('cursor', {
    line: 3,
    column: 10,
    selection: { startLine: 3, startColumn: 10, endLine: 3, endColumn: 15 }
  });
  
  console.log('✅ User 2 awareness set:', awareness2.getLocalState());
  
  checkBothUsersReady();
});

function checkBothUsersReady() {
  if (user1Connected && user2Connected) {
    console.log('\n🔄 Both users connected, testing awareness exchange...\n');
    testAwarenessExchange();
  }
}

function testAwarenessExchange() {
  // Test User 1 sending awareness to User 2
  const user1ClientIds = Array.from(awareness1.getStates().keys());
  console.log('📤 User 1 sending awareness for clients:', user1ClientIds);
  
  if (user1ClientIds.length > 0) {
    const update1 = encodeAwarenessUpdate(awareness1, user1ClientIds);
    console.log('📦 User 1 awareness update size:', update1.length);
    
    // Simulate server broadcast
    socket1.emit('yjs-awareness-update', {
      room: roomName,
      update: Array.from(update1),
      origin: socket1.id
    });
  }
  
  // Test User 2 sending awareness to User 1
  const user2ClientIds = Array.from(awareness2.getStates().keys());
  console.log('📤 User 2 sending awareness for clients:', user2ClientIds);
  
  if (user2ClientIds.length > 0) {
    const update2 = encodeAwarenessUpdate(awareness2, user2ClientIds);
    console.log('📦 User 2 awareness update size:', update2.length);
    
    // Simulate server broadcast
    socket2.emit('yjs-awareness-update', {
      room: roomName,
      update: Array.from(update2),
      origin: socket2.id
    });
  }
}

// User 1 listening for awareness updates
socket1.on('yjs-awareness-update', ({ update, origin }) => {
  if (origin !== socket1.id) {
    console.log('📥 User 1 received awareness update from:', origin);
    
    try {
      applyAwarenessUpdate(awareness1, new Uint8Array(update), origin);
      console.log('✅ User 1 applied awareness update');
      console.log('👥 User 1 now sees states from:', Array.from(awareness1.getStates().keys()));
      
      // Check what states User 1 can see
      const states = awareness1.getStates();
      states.forEach((state, clientId) => {
        console.log(`   Client ${clientId}:`, {
          user: state.user,
          cursor: state.cursor
        });
      });
    } catch (error) {
      console.error('❌ User 1 failed to apply awareness:', error);
    }
  }
});

// User 2 listening for awareness updates
socket2.on('yjs-awareness-update', ({ update, origin }) => {
  if (origin !== socket2.id) {
    console.log('📥 User 2 received awareness update from:', origin);
    
    try {
      applyAwarenessUpdate(awareness2, new Uint8Array(update), origin);
      console.log('✅ User 2 applied awareness update');
      console.log('👥 User 2 now sees states from:', Array.from(awareness2.getStates().keys()));
      
      // Check what states User 2 can see
      const states = awareness2.getStates();
      states.forEach((state, clientId) => {
        console.log(`   Client ${clientId}:`, {
          user: state.user,
          cursor: state.cursor
        });
      });
    } catch (error) {
      console.error('❌ User 2 failed to apply awareness:', error);
    }
  }
});

// Test timeout
setTimeout(() => {
  console.log('\n🏁 Test completed. Summary:');
  console.log(`User 1 sees ${awareness1.getStates().size} total states`);
  console.log(`User 2 sees ${awareness2.getStates().size} total states`);
  
  // Check if they can see each other
  const user1States = awareness1.getStates();
  const user2States = awareness2.getStates();
  
  console.log('\n🎯 Cursor Visibility Analysis:');
  console.log(`User 1 can see other cursors: ${user1States.size > 1 ? '✅ YES' : '❌ NO'}`);
  console.log(`User 2 can see other cursors: ${user2States.size > 1 ? '✅ YES' : '❌ NO'}`);
  
  if (user1States.size <= 1 && user2States.size <= 1) {
    console.log('\n⚠️  ISSUE FOUND: Users cannot see each other\'s cursors!');
    console.log('Possible causes:');
    console.log('1. Awareness updates not being broadcast properly');
    console.log('2. MonacoBinding not configured with awareness');
    console.log('3. Client IDs not matching between awareness instances');
    console.log('4. Awareness events not being handled in Monaco editor');
  }
  
  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}, 5000);

console.log('⏳ Testing for 5 seconds...\n');
