const io = require('socket.io-client');

// Connect to the WebSocket server
const socket = io('http://localhost:3012', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  query: { sessionId: 'session123' }
});

console.log('🔌 Connecting to WebSocket server...');

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('🎧 Listening for fileUploaded events...');
});

socket.on('fileUploaded', (data) => {
  console.log('📤 Received fileUploaded event:');
  console.log(JSON.stringify(data, null, 2));
});

socket.on('filesChanged', (data) => {
  console.log('📁 Received filesChanged event:');
  console.log(JSON.stringify(data, null, 2));
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from WebSocket server');
});

socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

console.log('📡 WebSocket listener started. Upload a file to test...');

// Keep the script running
setTimeout(() => {
  console.log('⏰ Test completed. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 30000); // Run for 30 seconds
