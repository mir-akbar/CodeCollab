/**
 * Test script to verify sessions are properly displayed for invited users
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001';

async function testSessionVisibility() {
  console.log('🧪 Testing session visibility for invited users...\n');

  try {
    // Test 1: Check sessions for akbarmir02@gmail.com (session creator)
    console.log('👤 Step 1: Testing session visibility for creator (akbarmir02@gmail.com)...');
    
    // Note: This test is limited without proper auth tokens
    // In a real scenario, we'd test with authenticated requests
    
    console.log('⚠️  Note: This test requires authentication to properly verify.');
    console.log('💡 Expected behavior after fix:');
    console.log('  1. akbarmir02@gmail.com should see "my-coding-session" with 2 participants');
    console.log('  2. mirakbarkhan@protonmail.com should see "my-coding-session" in their sessions list');
    console.log('  3. Participant status should show both "active" and "invited" users');
    
    console.log('\n✅ To verify the fix:');
    console.log('  1. Log in as akbarmir02@gmail.com');
    console.log('  2. Check that "my-coding-session" shows 2 participants');
    console.log('  3. Log in as mirakbarkhan@protonmail.com');
    console.log('  4. Check that "my-coding-session" appears in sessions list');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Database query examples that should now work correctly
console.log('\n📊 Database queries that are now fixed:');
console.log(`
// Before (incorrect):
SessionParticipant.find({
  cognitoId: user.cognitoId,
  status: 'active'  // ❌ Only active, missing invited users
});

// After (correct):
SessionParticipant.find({
  cognitoId: user.cognitoId,
  status: { $in: ['active', 'invited'] }  // ✅ Includes both active and invited
});
`);

testSessionVisibility();
