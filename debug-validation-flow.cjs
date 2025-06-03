#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test data matching our test script
const testData = {
  sessionData: {
    name: 'Validation Debug Session',
    description: 'Testing validation middleware',
    language: 'javascript',
    creator: 'test@example.com'
  },
  adminInvitation: {
    inviteeEmail: 'admin-user@example.com',
    role: 'admin'
  }
};

async function testValidationFlow() {
  console.log('🧪 Testing validation middleware flow...\n');

  try {
    // Step 1: Create a session
    console.log('1️⃣ Creating test session...');
    const sessionResponse = await axios.post(`${API_BASE}/sessions`, testData.sessionData, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'test@example.com'
      }
    });
    
    console.log('   ✅ Session created with ID:', sessionResponse.data.session.sessionId);
    const sessionId = sessionResponse.data.session.sessionId;

    // Step 2: Test exactly what our test script sends
    console.log('\n2️⃣ Testing invitation with test script format...');
    const requestData = {
      ...testData.adminInvitation,
      email: 'test@example.com' // This is what our test script adds for authentication
    };
    
    console.log('   📤 Sending request data:', JSON.stringify(requestData, null, 2));
    
    try {
      const inviteResponse = await axios.post(
        `${API_BASE}/sessions/${sessionId}/invite`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': 'test@example.com'
          }
        }
      );
      
      console.log('   ✅ Invitation response:', JSON.stringify(inviteResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ Invitation failed:', error.response?.data || error.message);
      console.log('   📊 Request details for debugging:');
      console.log('      URL:', `${API_BASE}/sessions/${sessionId}/invite`);
      console.log('      Body:', JSON.stringify(requestData, null, 2));
      console.log('      Headers:', JSON.stringify({
        'Content-Type': 'application/json',
        'x-user-email': 'test@example.com'
      }, null, 2));
    }

    // Step 3: Also test the format expected by the existing test files
    console.log('\n3️⃣ Testing invitation with API test format...');
    const apiTestData = {
      email: 'another-admin@example.com', // This is the invitee email in API tests
      access: 'edit',
      inviterEmail: 'test@example.com'
    };
    
    console.log('   📤 Sending API test data:', JSON.stringify(apiTestData, null, 2));
    
    try {
      const apiInviteResponse = await axios.post(
        `${API_BASE}/sessions/${sessionId}/invite`,
        apiTestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': 'test@example.com'
          }
        }
      );
      
      console.log('   ✅ API test invitation response:', JSON.stringify(apiInviteResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ API test invitation failed:', error.response?.data || error.message);
    }

    // Step 4: Verify final state
    console.log('\n4️⃣ Checking final session state...');
    const sessionDetailsResponse = await axios.get(`${API_BASE}/sessions/${sessionId}`, {
      headers: {
        'x-user-email': 'test@example.com'
      }
    });
    
    console.log('   📊 Final participants:');
    sessionDetailsResponse.data.session.participants.forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.email} (${p.role}, ${p.status})`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testValidationFlow().catch(console.error);
