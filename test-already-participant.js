/**
 * Test script to verify the "already a participant" fix
 * This simulates the exact scenario from the browser error
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001';

async function testAlreadyParticipant() {
  console.log('🧪 Testing "already a participant" scenario...\n');

  try {
    // Test inviting an existing participant to see the improved response
    console.log('👤 Testing: Re-inviting existing participant...');
    
    // Using the exact session and user from the browser error
    const sessionId = 'f0dd1f95-0eb6-4109-8990-5719bbfcb763';
    const inviteResponse = await axios.post(`${API_BASE}/api/sessions/${sessionId}/invite`, {
      inviteeEmail: 'mirakbarkhan@protonmail.com',
      role: 'editor',
      inviterEmail: 'akbarmir02@gmail.com'
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without proper auth, but we can see if the error handling works
      }
    });

    console.log('📧 Response:', JSON.stringify(inviteResponse.data, null, 2));

    if (inviteResponse.data.success) {
      if (inviteResponse.data.alreadyParticipant) {
        console.log('✅ SUCCESS: Already participant case handled correctly!');
        console.log(`📊 User role: ${inviteResponse.data.currentRole}`);
        console.log(`📝 Message: ${inviteResponse.data.message}`);
      } else {
        console.log('✅ SUCCESS: Invitation sent successfully!');
        console.log(`📊 User existed before: ${inviteResponse.data.userExistedBefore}`);
      }
    } else {
      console.log('❌ Response indicates failure:', inviteResponse.data.error);
    }

  } catch (error) {
    console.log(`📊 Status: ${error.response?.status || 'Network error'}`);
    console.log('📧 Response data:', JSON.stringify(error.response?.data, null, 2));
    
    // Check if this is the expected auth error rather than our old participant error
    if (error.response?.status === 401) {
      console.log('✅ AUTH ERROR (expected): Need proper authentication to test fully');
    } else if (error.response?.status === 500 && error.response?.data?.error?.includes('already a participant')) {
      console.log('❌ STILL HAS OLD ERROR: The fix did not work');
    } else {
      console.log('🤔 OTHER ERROR:', error.message);
    }
  }
}

// Run the test
testAlreadyParticipant();
