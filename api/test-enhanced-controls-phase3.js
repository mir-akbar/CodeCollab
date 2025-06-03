// Phase 3 Enhanced Session Controls Test
// Tests session settings, self-invite, role requests, and access controls

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to test database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const SessionParticipant = require('./models/SessionParticipant');
const Session = require('./models/Session');
const SessionService = require('./services/sessionService');

async function testEnhancedSessionControls() {
  console.log('\n🧪 Testing Phase 3: Enhanced Session Controls...');
  
  const sessionService = new SessionService();
  const testSessionId = 'test-enhanced-controls';
  
  try {
    // Clean up any existing test data
    await SessionParticipant.deleteMany({ sessionId: testSessionId });
    await Session.deleteMany({ sessionId: testSessionId });
    
    // Test 1: Create session with enhanced settings
    console.log('\n📝 Test 1: Creating session with enhanced settings...');
    
    const sessionResult = await sessionService.createSession({
      sessionId: testSessionId,
      name: 'Enhanced Controls Test Session',
      description: 'Testing enhanced session controls',
      creator: 'owner@test.com'
    });
    
    // Update session with enhanced settings
    await sessionService.updateSessionSettings(testSessionId, 'owner@test.com', {
      settings: {
        allowSelfInvite: true,
        allowRoleRequests: true,
        maxParticipants: 5,
        allowedDomains: ['test.com', 'example.com']
      }
    });
    
    console.log('✅ Session created with enhanced settings');
    
    // Test 2: Test self-invite with domain restrictions
    console.log('\n📝 Test 2: Testing self-invite with domain restrictions...');
    
    // Allowed domain should work
    await sessionService.selfInviteToSession(testSessionId, 'user1@test.com', 'viewer');
    console.log('✅ Self-invite works for allowed domain (test.com)');
    
    // Another allowed domain should work
    await sessionService.selfInviteToSession(testSessionId, 'user2@example.com', 'viewer');
    console.log('✅ Self-invite works for allowed domain (example.com)');
    
    // Disallowed domain should fail
    try {
      await sessionService.selfInviteToSession(testSessionId, 'user3@forbidden.com', 'viewer');
      console.log('❌ Self-invite should fail for disallowed domain');
    } catch (error) {
      if (error.message.includes('domain is not allowed')) {
        console.log('✅ Self-invite correctly blocked for disallowed domain');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 3: Test capacity limits
    console.log('\n📝 Test 3: Testing session capacity limits...');
    
    // Add more participants to approach limit (maxParticipants: 5)
    // We have: owner, user1@test.com, user2@example.com = 3 participants
    await sessionService.selfInviteToSession(testSessionId, 'user4@test.com', 'viewer');
    console.log('✅ Self-invite works when under capacity');
    
    await sessionService.selfInviteToSession(testSessionId, 'user5@test.com', 'viewer');
    console.log('✅ Self-invite works at capacity limit');
    
    // Capacity should now be reached (5 participants)
    try {
      await sessionService.selfInviteToSession(testSessionId, 'user6@test.com', 'viewer');
      console.log('❌ Self-invite should fail when at capacity');
    } catch (error) {
      if (error.message.includes('maximum participant capacity')) {
        console.log('✅ Self-invite correctly blocked when at capacity');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 4: Test role request functionality
    console.log('\n📝 Test 4: Testing role request functionality...');
    
    // User can request to downgrade their role
    await sessionService.requestRoleChange(testSessionId, 'user1@test.com', 'viewer');
    console.log('✅ Role request (viewer) processed successfully');
    
    // User cannot request admin or owner role
    try {
      await sessionService.requestRoleChange(testSessionId, 'user1@test.com', 'admin');
      console.log('❌ Role request for admin should fail');
    } catch (error) {
      if (error.message.includes('Only viewer and editor roles can be requested')) {
        console.log('✅ Role request for admin correctly blocked');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 5: Test session settings validation
    console.log('\n📝 Test 5: Testing session settings validation...');
    
    // Invalid maxParticipants should fail
    try {
      await sessionService.updateSessionSettings(testSessionId, 'owner@test.com', {
        settings: {
          maxParticipants: 0
        }
      });
      console.log('❌ Invalid maxParticipants should fail');
    } catch (error) {
      if (error.message.includes('must be at least 1')) {
        console.log('✅ Invalid maxParticipants correctly rejected');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Invalid domain format should fail
    try {
      await sessionService.updateSessionSettings(testSessionId, 'owner@test.com', {
        settings: {
          allowedDomains: ['invalid-domain']
        }
      });
      console.log('❌ Invalid domain format should fail');
    } catch (error) {
      if (error.message.includes('Invalid domain format')) {
        console.log('✅ Invalid domain format correctly rejected');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 6: Test permission restrictions for settings
    console.log('\n📝 Test 6: Testing permission restrictions for settings...');
    
    // Non-owner cannot update settings
    try {
      await sessionService.updateSessionSettings(testSessionId, 'user1@test.com', {
        settings: {
          allowSelfInvite: false
        }
      });
      console.log('❌ Non-owner should not be able to update settings');
    } catch (error) {
      if (error.message.includes('Insufficient permissions')) {
        console.log('✅ Non-owner correctly blocked from updating settings');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 7: Disable self-invite and test blocking
    console.log('\n📝 Test 7: Testing disabled self-invite...');
    
    await sessionService.updateSessionSettings(testSessionId, 'owner@test.com', {
      settings: {
        allowSelfInvite: false
      }
    });
    
    try {
      await sessionService.selfInviteToSession(testSessionId, 'newuser@test.com', 'viewer');
      console.log('❌ Self-invite should fail when disabled');
    } catch (error) {
      if (error.message.includes('Self-invitation is not allowed')) {
        console.log('✅ Self-invite correctly blocked when disabled');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 8: Disable role requests and test blocking
    console.log('\n📝 Test 8: Testing disabled role requests...');
    
    await sessionService.updateSessionSettings(testSessionId, 'owner@test.com', {
      settings: {
        allowRoleRequests: false
      }
    });
    
    try {
      await sessionService.requestRoleChange(testSessionId, 'user1@test.com', 'editor');
      console.log('❌ Role request should fail when disabled');
    } catch (error) {
      if (error.message.includes('Role requests are not allowed')) {
        console.log('✅ Role request correctly blocked when disabled');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Phase 3 Enhanced Session Controls Tests Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

async function runTests() {
  await connectDB();
  await testEnhancedSessionControls();
  await mongoose.connection.close();
  console.log('\n📊 Testing complete');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

if (require.main === module) {
  runTests();
}

module.exports = { testEnhancedSessionControls };
