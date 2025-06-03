const axios = require('axios');

async function testSessionAccess() {
  try {
    console.log('🔍 Testing session access check...\n');

    const sessionId = '18d5d62f-bf42-49a0-9b01-5639a082cea6';
    const userEmail = 'test@example.com';

    console.log(`Session ID: ${sessionId}`);
    console.log(`User Email: ${userEmail}`);

    // Test the check-access endpoint directly
    console.log('\n📋 Testing check-access endpoint...');
    try {
      const response = await axios.get('http://localhost:3001/sessions/check-access', {
        params: {
          sessionId,
          userEmail
        }
      });
      console.log('✅ Access check result:', response.data);
    } catch (error) {
      console.log('❌ Access check failed:', error.response?.data || error.message);
    }

    // Test getting session details which uses the same middleware
    console.log('\n📋 Testing session details endpoint...');
    try {
      const response = await axios.get(`http://localhost:3001/sessions/${sessionId}`, {
        headers: {
          'x-user-email': userEmail
        }
      });
      console.log('✅ Session details:', response.data.session.name);
      console.log('   Participants:', response.data.session.participants.length);
    } catch (error) {
      console.log('❌ Session details failed:', error.response?.data || error.message);
    }

    // Test user sessions endpoint
    console.log('\n📋 Testing user sessions endpoint...');
    try {
      const response = await axios.get('http://localhost:3001/sessions', {
        headers: {
          'x-user-email': userEmail
        }
      });
      console.log('✅ User sessions found:', response.data.sessions.length);
      response.data.sessions.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} (${s.sessionId}) - Creator: ${s.creator}`);
      });
    } catch (error) {
      console.log('❌ User sessions failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSessionAccess();
