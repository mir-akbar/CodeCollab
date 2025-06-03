/**
 * Debug script to test participant management functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testParticipantManagement() {
  console.log('🔍 Starting Participant Management Debug Tests\n');

  try {
    // Step 1: Create a test session
    console.log('📝 Step 1: Creating test session...');
    const createResponse = await axios.post(`${BASE_URL}/sessions`, {
      name: "Debug Test Session",
      description: "Testing participant management",
      creator: "debug-owner@test.com",
      email: "debug-owner@test.com"
    }, {
      headers: { 'x-user-email': 'debug-owner@test.com' }
    });

    if (!createResponse.data.success) {
      throw new Error('Failed to create session');
    }

    const sessionId = createResponse.data.session.sessionId;
    console.log(`✅ Session created: ${sessionId}\n`);

    // Step 2: Invite a participant
    console.log('📧 Step 2: Inviting participant...');
    const inviteResponse = await axios.post(`${BASE_URL}/sessions/${sessionId}/invite`, {
      email: "debug-owner@test.com", // For auth
      inviteeEmail: "debug-participant@test.com",
      role: "editor",
      access: "edit",
      inviterEmail: "debug-owner@test.com"
    }, {
      headers: { 'x-user-email': 'debug-owner@test.com' }
    });

    console.log('Invite response:', inviteResponse.data);
    console.log('✅ Participant invited\n');

    // Step 3: Test removing participant
    console.log('🗑️  Step 3: Testing remove participant...');
    try {
      const removeResponse = await axios.post(`${BASE_URL}/sessions/${sessionId}/remove-participant`, {
        email: "debug-owner@test.com", // For auth
        participantEmail: "debug-participant@test.com",
        removerEmail: "debug-owner@test.com"
      }, {
        headers: { 'x-user-email': 'debug-owner@test.com' }
      });

      console.log('Remove response:', removeResponse.data);
      console.log('✅ Participant removed successfully\n');
    } catch (error) {
      console.log('❌ Remove participant failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      console.log('Request data:', error.config?.data);
      console.log();
    }

    // Step 4: Invite another participant for ownership transfer test
    console.log('📧 Step 4: Inviting second participant for ownership transfer...');
    const invite2Response = await axios.post(`${BASE_URL}/sessions/${sessionId}/invite`, {
      email: "debug-owner@test.com", // For auth
      inviteeEmail: "debug-newowner@test.com",
      role: "admin",
      access: "edit",
      inviterEmail: "debug-owner@test.com"
    }, {
      headers: { 'x-user-email': 'debug-owner@test.com' }
    });

    console.log('Second invite response:', invite2Response.data);
    console.log('✅ Second participant invited\n');

    // Step 5: Test ownership transfer
    console.log('👑 Step 5: Testing ownership transfer...');
    try {
      const transferResponse = await axios.post(`${BASE_URL}/sessions/${sessionId}/transfer-ownership`, {
        email: "debug-owner@test.com", // For auth
        newOwnerEmail: "debug-newowner@test.com",
        currentOwnerEmail: "debug-owner@test.com"
      }, {
        headers: { 'x-user-email': 'debug-owner@test.com' }
      });

      console.log('Transfer response:', transferResponse.data);
      console.log('✅ Ownership transferred successfully\n');
    } catch (error) {
      console.log('❌ Ownership transfer failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      console.log('Request data:', error.config?.data);
      console.log();
    }

    // Step 6: Get session to verify state
    console.log('📋 Step 6: Getting final session state...');
    const sessionResponse = await axios.get(`${BASE_URL}/sessions`, {
      headers: { 'x-user-email': 'debug-owner@test.com' }
    });

    console.log('Final sessions:', JSON.stringify(sessionResponse.data.sessions, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testParticipantManagement().then(() => {
  console.log('🏁 Debug tests completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
