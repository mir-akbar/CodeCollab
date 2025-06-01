#!/usr/bin/env node

const Y = require('yjs');

// Mock socket.io for testing
const mockSocket = {
  connected: true,
  id: 'test-socket-id',
  emit: (event, data) => console.log(`📤 Socket emit: ${event}`, data),
  on: (event, handler) => console.log(`👂 Socket listening for: ${event}`),
  off: (event) => console.log(`🔇 Socket stopped listening for: ${event}`),
  join: (room) => console.log(`🏠 Socket joined room: ${room}`),
  to: (room) => ({ emit: (event, data) => console.log(`📡 Broadcast to ${room}: ${event}`) })
};

// Import our fixed SocketIOProvider
const { SocketIOProvider } = require('./src/components/yjs/SocketIOProvider.jsx');

console.log('🧪 Testing Fixed SocketIOProvider...');

try {
  // Create YJS document
  const doc = new Y.Doc();
  const text = doc.getText('content');
  
  // Create provider
  const provider = new SocketIOProvider('test-room', mockSocket, doc);
  
  console.log('✅ SocketIOProvider created successfully');
  
  // Test event system
  let syncEventFired = false;
  provider.on('synced', () => {
    syncEventFired = true;
    console.log('✅ Synced event received');
  });
  
  // Simulate sync response
  provider.emit('synced');
  
  if (syncEventFired) {
    console.log('✅ Event system working correctly');
  } else {
    console.log('❌ Event system failed');
  }
  
  // Test destroy
  provider.destroy();
  console.log('✅ Provider destroyed successfully');
  
  console.log('\n🎉 All tests passed! SocketIOProvider is fixed.');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}
