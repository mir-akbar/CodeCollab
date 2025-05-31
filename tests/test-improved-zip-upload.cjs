// Test script to verify improved ZIP upload functionality
const io = require('socket.io-client');
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3012';
const TEST_SESSION = 'test-zip-upload-' + Date.now();

console.log(`🧪 Testing improved ZIP upload functionality for session: ${TEST_SESSION}`);

// Connect to WebSocket
const socket = io(API_URL, {
  transports: ['websocket', 'polling'],
  query: { sessionId: TEST_SESSION }
});

let eventsReceived = [];
let zipStartTime = null;

// Track all events
const eventTypes = [
  'zipUploadStarted',
  'zipProgress', 
  'zipFileProcessed',
  'zipExtractionComplete',
  'sessionFilesUpdated',
  'zipUploadComplete'
];

eventTypes.forEach(eventType => {
  socket.on(eventType, (data) => {
    const timestamp = Date.now();
    if (!zipStartTime) zipStartTime = timestamp;
    
    eventsReceived.push({
      type: eventType,
      timestamp,
      relativeTime: timestamp - zipStartTime,
      data
    });
    
    console.log(`📡 [${timestamp - zipStartTime}ms] ${eventType}:`, 
      eventType === 'sessionFilesUpdated' ? 
        `${data.files?.length || 0} files` : 
        data.message || 'Event received'
    );
  });
});

socket.on('connect', async () => {
  console.log('🔌 Connected to WebSocket');
  
  try {
    // Create test ZIP file if it doesn't exist
    if (!fs.existsSync('./api/test-upload/test-with-system-files.zip')) {
      console.log('❌ Test ZIP file not found. Please ensure api/test-upload/test-with-system-files.zip exists');
      process.exit(1);
    }
    
    // Upload ZIP file
    console.log('📤 Starting ZIP upload...');
    zipStartTime = Date.now();
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./api/test-upload/test-with-system-files.zip'));
    formData.append('sessionID', TEST_SESSION);
    formData.append('email', 'test@example.com');
    
    const response = await fetch(`${API_URL}/file-upload/file-upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`✅ Upload API completed: ${result.files?.length || 0} files processed`);
    
    // Wait for all events to be received
    setTimeout(() => {
      console.log('\n📊 Event Summary:');
      console.log(`Total events received: ${eventsReceived.length}`);
      console.log(`Total processing time: ${Date.now() - zipStartTime}ms`);
      
      // Check for proper event sequence
      const requiredEvents = ['zipUploadStarted', 'zipExtractionComplete', 'sessionFilesUpdated'];
      const receivedEventTypes = eventsReceived.map(e => e.type);
      
      console.log('\n🔍 Event Sequence Analysis:');
      requiredEvents.forEach(eventType => {
        const received = receivedEventTypes.includes(eventType);
        console.log(`${received ? '✅' : '❌'} ${eventType}: ${received ? 'Received' : 'Missing'}`);
      });
      
      // Check final file count
      const sessionUpdate = eventsReceived.find(e => e.type === 'sessionFilesUpdated');
      if (sessionUpdate) {
        console.log(`\n📁 Final file count: ${sessionUpdate.data.files.length} files`);
        sessionUpdate.data.files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name} (${file.type})`);
        });
      }
      
      // Verify no race conditions (all files should appear together)
      const zipComplete = eventsReceived.find(e => e.type === 'zipExtractionComplete');
      const sessionUpdated = eventsReceived.find(e => e.type === 'sessionFilesUpdated');
      
      if (zipComplete && sessionUpdated) {
        const timeDiff = Math.abs(sessionUpdated.relativeTime - zipComplete.relativeTime);
        console.log(`\n⏱️  Time between extraction complete and session update: ${timeDiff}ms`);
        console.log(timeDiff < 100 ? '✅ No significant lag detected' : '⚠️  Potential lag detected');
      }
      
      socket.disconnect();
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    socket.disconnect();
    process.exit(1);
  }
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from WebSocket');
});

socket.on('connect_error', (error) => {
  console.error('❌ WebSocket connection error:', error);
  process.exit(1);
});
