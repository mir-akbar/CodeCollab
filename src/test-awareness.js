// Test YJS Awareness API to debug the encodeUpdate issue
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

console.log('Testing YJS Awareness API...');

try {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  
  console.log('✅ Awareness created successfully');
  console.log('   Available methods:', Object.getOwnPropertyNames(awareness.constructor.prototype));
  
  // Test encodeUpdate method
  if (typeof awareness.encodeUpdate === 'function') {
    console.log('✅ encodeUpdate method exists');
    
    // Test the method with different parameters
    try {
      const update1 = awareness.encodeUpdate([0]); // Single client ID
      console.log('✅ encodeUpdate([0]) works, result length:', update1.length);
    } catch (e) {
      console.log('❌ encodeUpdate([0]) failed:', e.message);
    }
    
    try {
      const update2 = awareness.encodeUpdate(); // No parameters
      console.log('✅ encodeUpdate() works, result length:', update2.length);
    } catch (e) {
      console.log('❌ encodeUpdate() failed:', e.message);
    }
  } else {
    console.log('❌ encodeUpdate method does not exist');
    console.log('   Available methods:', Object.keys(awareness));
  }
  
} catch (error) {
  console.error('❌ Error during test:', error);
}
