#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testWithExistingSession() {
  console.log('🧪 Testing with existing session...\n');

  try {
    // Use the existing session from our database check
    const sessionId = '18d5d62f-bf42-49a0-9b01-5639a082cea6';
    console.log(`1️⃣ Using existing session: ${sessionId}`);
    
    // From the database, this session has:
    // - test@example.com as owner
    // - guest@example.com as admin
    // So we'll try to invite someone who isn't already there

    console.log('\n2️⃣ Testing invitation with completely new user...');
    const testData = {
      "inviteeEmail": "brand-new-user@example.com", // Use a completely new email
      "role": "editor",
      "email": "test@example.com"  // This is the inviter (authenticated user)
    };
    console.log('   📤 Sending request data:', JSON.stringify(testData, null, 2));
    
    try {
      const inviteResponse = await axios.post(
        `${API_BASE}/sessions/${sessionId}/invite`,
        testData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': 'test@example.com'
          }
        }
      );
      
      console.log('   ✅ Success:', inviteResponse.data);
    } catch (error) {
      console.log('   ❌ Failed:', error.response?.data || error.message);
      
      // If this still fails, let's examine the exact error
      console.log('\n🔍 Debugging the invitation process...');
      console.log('   Request URL:', `${API_BASE}/sessions/${sessionId}/invite`);
      console.log('   Request Headers:', JSON.stringify({
        'Content-Type': 'application/json',
        'x-user-email': 'test@example.com'
      }, null, 2));
      console.log('   Request Body:', JSON.stringify(testData, null, 2));
      
      if (error.response) {
        console.log('   Response Status:', error.response.status);
        console.log('   Response Data:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Let's also verify what's currently in the session
    console.log('\n3️⃣ Checking current session participants...');
    try {
      const sessionDetailsResponse = await axios.get(`${API_BASE}/sessions/${sessionId}`, {
        headers: {
          'x-user-email': 'test@example.com'
        }
      });
      
      console.log('   📊 Current participants:');
      sessionDetailsResponse.data.session.participants.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.email} (${p.role}, ${p.status})`);
      });
    } catch (error) {
      console.log('   ❌ Failed to get session details:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testWithExistingSession().catch(console.error);
