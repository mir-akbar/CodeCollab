#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test data
const testData = {
  // Test user credentials (you may need to adjust these)
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123'
  },
  // Session to create
  sessionData: {
    name: 'Admin Role Test Session',
    description: 'Testing admin role assignment functionality',
    language: 'javascript'
  },
  // Admin invitation
  adminInvitation: {
    inviteeEmail: 'admin@example.com',
    role: 'admin'
  },
  // Editor invitation (for comparison)
  editorInvitation: {
    inviteeEmail: 'editor@example.com',
    role: 'editor'
  }
};

async function testAdminRoleAssignment() {
  console.log('🧪 Testing Admin Role Assignment...\n');

  try {
    // Step 1: Create a session (assuming we have auth token or can skip auth for testing)
    console.log('1️⃣ Creating test session...');
    const sessionResponse = await axios.post(`${API_BASE}/sessions`, testData.sessionData, {
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      }
    });
    
    const sessionId = sessionResponse.data.sessionId || sessionResponse.data.id;
    console.log(`   ✅ Session created with ID: ${sessionId}\n`);

    // Step 2: Test admin role invitation
    console.log('2️⃣ Testing admin role invitation...');
    const adminInviteResponse = await axios.post(
      `${API_BASE}/sessions/${sessionId}/invite`,
      testData.adminInvitation,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('   ✅ Admin invitation response:', JSON.stringify(adminInviteResponse.data, null, 2));

    // Step 3: Test editor role invitation (for comparison)
    console.log('\n3️⃣ Testing editor role invitation...');
    const editorInviteResponse = await axios.post(
      `${API_BASE}/sessions/${sessionId}/invite`,
      testData.editorInvitation,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('   ✅ Editor invitation response:', JSON.stringify(editorInviteResponse.data, null, 2));

    // Step 4: Verify participants and their roles
    console.log('\n4️⃣ Verifying participant roles...');
    const participantsResponse = await axios.get(`${API_BASE}/sessions/${sessionId}/participants`);
    console.log('   ✅ Current participants:', JSON.stringify(participantsResponse.data, null, 2));

    console.log('\n🎉 Test completed successfully!');
    
    // Analyze results
    const participants = participantsResponse.data.participants || participantsResponse.data;
    const adminParticipant = participants.find(p => p.email === testData.adminInvitation.inviteeEmail);
    const editorParticipant = participants.find(p => p.email === testData.editorInvitation.inviteeEmail);
    
    console.log('\n📊 Role Assignment Analysis:');
    console.log(`   Admin role correct: ${adminParticipant?.role === 'admin' ? '✅' : '❌'} (Expected: admin, Got: ${adminParticipant?.role})`);
    console.log(`   Editor role correct: ${editorParticipant?.role === 'editor' ? '✅' : '❌'} (Expected: editor, Got: ${editorParticipant?.role})`);

    if (adminParticipant?.role === 'admin' && editorParticipant?.role === 'editor') {
      console.log('\n🎯 SUCCESS: Role assignment is working correctly!');
    } else {
      console.log('\n⚠️  ISSUE: Role assignment may still have problems.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: This might be an authentication issue. You may need to:');
      console.log('   - Add proper auth headers');
      console.log('   - Create test users first');
      console.log('   - Or temporarily disable auth for testing');
    }
  }
}

// Run the test
if (require.main === module) {
  testAdminRoleAssignment();
}

module.exports = { testAdminRoleAssignment };
