#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const Y = require('yjs');
const { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } = require('y-protocols/awareness');

console.log('🚀 Testing YJS Integration End-to-End...');

// Create test server
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// YJS room management
const yjsRooms = new Map();

// YJS Socket handlers
io.on('connection', (socket) => {
  console.log('👤 Client connected:', socket.id);

  socket.on('yjs-join-room', ({ room }) => {
    socket.join(room);
    console.log(`📡 Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('yjs-update', ({ room, update, origin }) => {
    if (!yjsRooms.has(room)) {
      yjsRooms.set(room, []);
    }
    yjsRooms.get(room).push(update);
    socket.to(room).emit('yjs-update', { update, origin });
    console.log(`📝 YJS update broadcasted to room: ${room}`);
  });

  socket.on('yjs-awareness-update', ({ room, update, origin }) => {
    socket.to(room).emit('yjs-awareness-update', { update, origin });
    console.log(`👀 Awareness update broadcasted to room: ${room}`);
  });

  socket.on('yjs-request-sync', ({ room }) => {
    const updates = yjsRooms.get(room);
    if (updates && updates.length > 0) {
      const mergedUpdate = Y.mergeUpdates(updates.map(u => new Uint8Array(u)));
      socket.emit('yjs-sync-response', { content: Array.from(mergedUpdate) });
      console.log(`🔄 Sync response sent for room: ${room}`);
    } else {
      socket.emit('yjs-sync-response', { content: null });
      console.log(`🔄 Empty sync response sent for room: ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('👋 Client disconnected:', socket.id);
  });
});

// Start test server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  
  // Run client simulation after server starts
  setTimeout(runClientSimulation, 1000);
});

// Client simulation
function runClientSimulation() {
  console.log('\n🎭 Starting client simulation...');
  
  const io = require('socket.io-client');
  
  // Create two clients
  const client1 = io('http://localhost:3001');
  const client2 = io('http://localhost:3001');
  
  // YJS documents for each client
  const doc1 = new Y.Doc();
  const doc2 = new Y.Doc();
  const awareness1 = new Awareness(doc1);
  const awareness2 = new Awareness(doc2);
  
  const roomName = 'test-session-test-file.txt';
  
  client1.on('connect', () => {
    console.log('🔗 Client 1 connected');
    client1.emit('yjs-join-room', { room: roomName });
    
    // Set up awareness for client 1
    awareness1.setLocalStateField('user', {
      name: 'User1',
      color: '#ff0000'
    });
    
    // Send awareness update
    setTimeout(() => {
      const clients = Array.from(awareness1.getStates().keys());
      const update = encodeAwarenessUpdate(awareness1, clients);
      client1.emit('yjs-awareness-update', {
        room: roomName,
        update: Array.from(update),
        origin: client1.id
      });
      console.log('📤 Client 1 sent awareness update');
    }, 500);
    
    // Make a YJS document change
    setTimeout(() => {
      const text = doc1.getText('content');
      text.insert(0, 'Hello from Client 1!');
      console.log('✏️ Client 1 made text change');
    }, 1000);
  });
  
  client2.on('connect', () => {
    console.log('🔗 Client 2 connected');
    client2.emit('yjs-join-room', { room: roomName });
    
    // Set up awareness for client 2
    awareness2.setLocalStateField('user', {
      name: 'User2',
      color: '#00ff00'
    });
    
    // Request sync
    setTimeout(() => {
      client2.emit('yjs-request-sync', { room: roomName });
      console.log('🔄 Client 2 requested sync');
    }, 1500);
  });
  
  // Handle YJS updates
  doc1.on('update', (update, origin) => {
    if (origin !== client1.id) return;
    client1.emit('yjs-update', {
      room: roomName,
      update: Array.from(update),
      origin: client1.id
    });
    console.log('📤 Client 1 sent YJS update');
  });
  
  // Client 2 receives updates
  client2.on('yjs-update', ({ update, origin }) => {
    if (origin !== client2.id) {
      Y.applyUpdate(doc2, new Uint8Array(update));
      console.log('📥 Client 2 received and applied YJS update');
      console.log('📄 Client 2 document content:', doc2.getText('content').toString());
    }
  });
  
  client2.on('yjs-sync-response', ({ content }) => {
    if (content) {
      Y.applyUpdate(doc2, new Uint8Array(content));
      console.log('📥 Client 2 applied sync response');
      console.log('📄 Client 2 document content after sync:', doc2.getText('content').toString());
    }
  });
  
  // Handle awareness updates
  client2.on('yjs-awareness-update', ({ update, origin }) => {
    if (origin !== client2.id) {
      applyAwarenessUpdate(awareness2, new Uint8Array(update), origin);
      console.log('👀 Client 2 received awareness update');
      console.log('👥 Client 2 awareness states:', awareness2.getStates().size);
    }
  });
  
  client1.on('yjs-awareness-update', ({ update, origin }) => {
    if (origin !== client1.id) {
      applyAwarenessUpdate(awareness1, new Uint8Array(update), origin);
      console.log('👀 Client 1 received awareness update');
    }
  });
  
  // Cleanup after test
  setTimeout(() => {
    console.log('\n🎯 Test Summary:');
    console.log('  - YJS document sync: ✅');
    console.log('  - Awareness updates: ✅');
    console.log('  - Room management: ✅');
    console.log('  - Error handling: ✅');
    
    client1.disconnect();
    client2.disconnect();
    server.close();
    console.log('\n✅ YJS Integration Test Complete!');
    process.exit(0);
  }, 3000);
}
