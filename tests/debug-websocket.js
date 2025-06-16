/**
 * Debug WebSocket Connection
 * Simple test to check if WebSocket connections work
 */

// Test WebSocket connection to the backend
const testWebSocketConnection = () => {
  console.log('🧪 Testing WebSocket connection...');
  
  // Test basic WebSocket connection
  const ws = new WebSocket('ws://localhost:3001/yjs-websocket/test-session/test-file');
  
  ws.onopen = function(event) {
    console.log('✅ WebSocket connection opened:', event);
    ws.close();
  };
  
  ws.onmessage = function(event) {
    console.log('📨 WebSocket message received:', event.data);
  };
  
  ws.onerror = function(error) {
    console.error('❌ WebSocket connection error:', error);
  };
  
  ws.onclose = function(event) {
    console.log('🔌 WebSocket connection closed:', event);
  };
  
  // Close after 5 seconds if still open
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('⏰ Closing test WebSocket connection');
      ws.close();
    }
  }, 5000);
};

// Run the test
testWebSocketConnection();
