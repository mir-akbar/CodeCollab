#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function debugFieldMapping() {
  console.log('🧪 Debugging Field Mapping in Invitation Flow...\n');

  try {
    // Step 1: Create a session
    console.log('1️⃣ Creating test session...');
    const sessionResponse = await axios.post(`${API_BASE}/sessions`, {
      name: 'Field Debug Session',
      description: 'Testing field mapping',
      creator: 'test@example.com'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'test@example.com'
      }
    });
    
    const sessionId = sessionResponse.data.session.sessionId;
    console.log('   ✅ Session created with ID:', sessionId);

    // Step 2: Test both API patterns to see which one works
    console.log('\n2️⃣ Testing different request patterns...\n');

    // Pattern A: New standard (inviteeEmail field)
    console.log('   🧪 Pattern A: New standard with inviteeEmail field');
    try {
      const patternA = await axios.post(
        `${API_BASE}/sessions/${sessionId}/invite`,
        {
          inviteeEmail: 'user-a@example.com',
          role: 'admin',
          inviterEmail: 'test@example.com'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': 'test@example.com'
          }
        }
      );
      console.log('      ✅ Pattern A SUCCESS:', patternA.data);
    } catch (error) {
      console.log('      ❌ Pattern A FAILED:', error.response?.data || error.message);
    }

    // Pattern B: Legacy API test format (email field for invitee)
    console.log('\n   🧪 Pattern B: Legacy API test format with email field');
    try {
      const patternB = await axios.post(
        `${API_BASE}/sessions/${sessionId}/invite`,
        {
          email: 'user-b@example.com',
          access: 'edit',
          inviterEmail: 'test@example.com'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': 'test@example.com'
          }
        }
      );
      console.log('      ✅ Pattern B SUCCESS:', patternB.data);
    } catch (error) {
      console.log('      ❌ Pattern B FAILED:', error.response?.data || error.message);
    }

    // Pattern C: Mixed format (what our test script was sending)
    console.log('\n   🧪 Pattern C: Mixed format (test script format)');
    try {
      const patternC = await axios.post(
        `${API_BASE}/sessions/${sessionId}/invite`,
        {
          inviteeEmail: 'user-c@example.com',
          role: 'admin',
          email: 'test@example.com'  // This was causing confusion
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': 'test@example.com'
          }
        }
      );
      console.log('      ✅ Pattern C SUCCESS:', patternC.data);
    } catch (error) {
      console.log('      ❌ Pattern C FAILED:', error.response?.data || error.message);
    }

    // Step 3: Check final session state
    console.log('\n3️⃣ Checking final session state...');
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

debugFieldMapping().catch(console.error);
