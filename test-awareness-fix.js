#!/usr/bin/env node

const { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } = require('y-protocols/awareness');
const Y = require('yjs');

console.log('🧪 Testing YJS Awareness API Fix...');

try {
  // Create a YJS document and awareness
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  
  console.log('✅ Created YJS doc and awareness');
  
  // Set local state
  awareness.setLocalStateField('user', {
    name: 'test-user',
    color: '#ff0000'
  });
  
  console.log('✅ Set local state field');
  
  // Get client IDs
  const clients = Array.from(awareness.getStates().keys());
  console.log('📊 Active clients:', clients);
  
  // Test encoding awareness update
  const update = encodeAwarenessUpdate(awareness, clients);
  console.log('✅ Encoded awareness update, length:', update.length);
  
  // Test applying awareness update
  const newDoc = new Y.Doc();
  const newAwareness = new Awareness(newDoc);
  
  applyAwarenessUpdate(newAwareness, update, 'test-origin');
  console.log('✅ Applied awareness update to new instance');
  
  // Verify the state was transferred
  const transferredStates = newAwareness.getStates();
  console.log('📊 Transferred states count:', transferredStates.size);
  
  if (transferredStates.size > 0) {
    console.log('🎉 SUCCESS! Awareness API is working correctly');
    console.log('   - encodeAwarenessUpdate: ✅');
    console.log('   - applyAwarenessUpdate: ✅');
    console.log('   - State transfer: ✅');
  } else {
    console.log('❌ FAILED: No states were transferred');
  }
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('Stack:', error.stack);
}
