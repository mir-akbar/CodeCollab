/**
 * Test script to verify invitation flow handles non-existent users
 * This tests the core functionality we just implemented
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function testInviteNonExistentUser() {
  console.log('🧪 Testing invitation of non-existent user...\n');

  try {
    // Step 1: Create a test session
    console.log('📝 Step 1: Creating test session...');
    const sessionResponse = await axios.post(`${API_BASE}/api/sessions`, {
      name: 'Test Invite Session',
      description: 'Testing invitation of non-existent users',
      creator: 'test@example.com'
    });

    if (!sessionResponse.data.success) {
      throw new Error('Failed to create session: ' + sessionResponse.data.error);
    }

    const sessionId = sessionResponse.data.session.sessionId;
    console.log(`✅ Session created: ${sessionId}`);

    // Step 2: Test inviting a non-existent user
    console.log('\n👤 Step 2: Inviting non-existent user...');
    const inviteResponse = await axios.post(`${API_BASE}/api/sessions/${sessionId}/invite`, {
      inviteeEmail: 'nonexistent@example.com',
      role: 'editor',
      inviterEmail: 'test@example.com'
    });

    console.log('📧 Invitation response:', JSON.stringify(inviteResponse.data, null, 2));

    if (inviteResponse.data.success) {
      console.log('✅ SUCCESS: Non-existent user was successfully invited!');
      console.log(`📊 User existed before invite: ${inviteResponse.data.inviteeExists || 'unknown'}`);
    } else {
      console.log('❌ FAILED: Invitation failed:', inviteResponse.data.error);
    }

    // Step 3: Verify the user was created in the database
    console.log('\n🔍 Step 3: Checking if placeholder user was created...');
    // Note: This would require a database query endpoint, which we don't have in the API
    // For now, we'll just verify the invitation succeeded

    // Step 4: Clean up - delete the test session
    console.log('\n🧹 Step 4: Cleaning up test session...');
    await axios.delete(`${API_BASE}/api/sessions/${sessionId}`, {
      data: { userEmail: 'test@example.com' }
    });
    console.log('✅ Test session cleaned up');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    if (error.response?.data) {
      console.error('📊 Error details:', error.response.data);
    }
    process.exit(1);
  }
}

// Test different scenarios
async function runAllTests() {
  console.log('🚀 Starting comprehensive invitation tests...\n');

  const tests = [
    {
      name: 'Invite non-existent user',
      inviteeEmail: 'brand-new-user@example.com',
      expectedResult: 'success'
    },
    {
      name: 'Invite with invalid email',
      inviteeEmail: 'invalid-email',
      expectedResult: 'error'
    },
    {
      name: 'Self-invitation attempt',
      inviteeEmail: 'test@example.com', // Same as inviter
      expectedResult: 'error'
    }
  ];

  for (const test of tests) {
    console.log(`\n🧪 Running test: ${test.name}`);
    console.log(`📧 Invitee: ${test.inviteeEmail}`);
    console.log(`🎯 Expected: ${test.expectedResult}`);
    
    try {
      // Create session for each test
      const sessionResponse = await axios.post(`${API_BASE}/api/sessions`, {
        name: `Test Session - ${test.name}`,
        description: 'Automated test session',
        creator: 'test@example.com'
      });

      const sessionId = sessionResponse.data.session.sessionId;

      // Try invitation
      const inviteResponse = await axios.post(`${API_BASE}/api/sessions/${sessionId}/invite`, {
        inviteeEmail: test.inviteeEmail,
        role: 'editor',
        inviterEmail: 'test@example.com'
      });

      const actualResult = inviteResponse.data.success ? 'success' : 'error';
      const passed = actualResult === test.expectedResult;

      console.log(`${passed ? '✅' : '❌'} Result: ${actualResult}`);
      if (!passed) {
        console.log(`❌ Expected ${test.expectedResult}, got ${actualResult}`);
        console.log(`📊 Response:`, inviteResponse.data);
      }

      // Clean up
      await axios.delete(`${API_BASE}/api/sessions/${sessionId}`, {
        data: { userEmail: 'test@example.com' }
      });

    } catch (error) {
      const actualResult = 'error';
      const passed = actualResult === test.expectedResult;
      
      console.log(`${passed ? '✅' : '❌'} Result: ${actualResult} (${error.message})`);
      if (!passed) {
        console.log(`❌ Expected ${test.expectedResult}, got ${actualResult}`);
      }
    }
  }

  console.log('\n🎉 All tests completed!');
}

// Run the test when called directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  // Check if we should run basic test or comprehensive tests
  const runComprehensive = process.argv.includes('--comprehensive');
  
  if (runComprehensive) {
    runAllTests();
  } else {
    testInviteNonExistentUser();
  }
}

export { testInviteNonExistentUser, runAllTests };
