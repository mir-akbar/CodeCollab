#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

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
    language: 'javascript',
    creator: 'test@example.com'
  },
  // Admin invitation
  adminInvitation: {
    inviteeEmail: 'admin-user@example.com',
    role: 'admin'
  },
  // Editor invitation (for comparison)
  editorInvitation: {
    inviteeEmail: 'editor-user@example.com',
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
        'x-user-email': testData.testUser.email
      }
    });
    
    const sessionId = sessionResponse.data.sessionId || sessionResponse.data.id;
    console.log(`   ✅ Session created with ID: ${sessionId}\n`);

    // Step 2: Test admin role invitation
    console.log('2️⃣ Testing admin role invitation...');
    try {
      const adminInviteResponse = await axios.post(
        `${API_BASE}/sessions/${sessionId}/invite`,
        {
          ...testData.adminInvitation,
          email: testData.testUser.email // For middleware authentication
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': testData.testUser.email
          }
        }
      );
      
      console.log('   ✅ Admin invitation response:', JSON.stringify(adminInviteResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ Admin invitation failed:', error.response?.data || error.message);
      console.log('   🔄 Continuing test to check if invitation was processed anyway...');
    }

    // Step 3: Test editor role invitation (for comparison)
    console.log('\n3️⃣ Testing editor role invitation...');
    try {
      const editorInviteResponse = await axios.post(
        `${API_BASE}/sessions/${sessionId}/invite`,
        {
          ...testData.editorInvitation,
          email: testData.testUser.email // For middleware authentication
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': testData.testUser.email
          }
        }
      );
      
      console.log('   ✅ Editor invitation response:', JSON.stringify(editorInviteResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ Editor invitation failed:', error.response?.data || error.message);
      console.log('   🔄 Continuing test to check if invitation was processed anyway...');
    }

    // Step 4: Verify participants and their roles
    console.log('\n4️⃣ Verifying participant roles...');
    const sessionDetailsResponse = await axios.get(`${API_BASE}/sessions/${sessionId}`, {
      headers: {
        'x-user-email': testData.testUser.email
      }
    });
    console.log('   ✅ Session details:', JSON.stringify(sessionDetailsResponse.data, null, 2));

    console.log('\n🎉 Test completed successfully!');
    
    // Analyze results
    const session = sessionDetailsResponse.data.session;
    const participants = session.participants || [];
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
