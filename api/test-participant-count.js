/**
 * Test script to verify participant count is correctly displayed
 * This tests the getUserSessions API response to ensure participant counts are accurate
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testParticipantCountDisplay() {
  try {
    console.log('🧪 Testing Participant Count Display...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI;
    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || 'code_colab'
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const sessionsCollection = db.collection('sessions');
    const participantsCollection = db.collection('sessionparticipants');
    const usersCollection = db.collection('users');

    // Get a test session
    const testSession = await sessionsCollection.findOne({ status: 'active' });
    console.log(`\n📋 Testing session: ${testSession.name} (${testSession.sessionId})`);

    // Get all participants for this session
    const allParticipants = await participantsCollection.find({
      sessionId: testSession.sessionId,
      status: { $in: ['active', 'invited'] }
    }).toArray();

    console.log(`\n👥 Total participants found: ${allParticipants.length}`);
    
    for (const participant of allParticipants) {
      const user = await usersCollection.findOne({ cognitoId: participant.cognitoId });
      console.log(`   - ${user?.email || 'unknown'} (${participant.role}, ${participant.status})`);
    }

    // Now test the sessionService getUserSessions method
    console.log('\n🔍 Testing sessionService.getUserSessions()...');
    
    // Import and test the sessionService
    const sessionService = require('./services/sessionService');
    
    // Get the creator's email
    const creatorUser = await usersCollection.findOne({ cognitoId: testSession.creator });
    const creatorEmail = creatorUser?.email;
    
    if (creatorEmail) {
      console.log(`\n📧 Getting sessions for creator: ${creatorEmail}`);
      
      const sessions = await sessionService.getUserSessions(creatorEmail);
      const targetSession = sessions.find(s => s.sessionId === testSession.sessionId);
      
      if (targetSession) {
        console.log(`\n📊 Session data returned by getUserSessions:`);
        console.log(`   - Session name: ${targetSession.name}`);
        console.log(`   - Participants count: ${targetSession.participants?.length || 0}`);
        console.log(`   - Participants array:`);
        
        if (targetSession.participants) {
          targetSession.participants.forEach((p, i) => {
            console.log(`     ${i + 1}. ${p.email} (${p.role}, ${p.status})`);
          });
        }
        
        // Check if count matches database
        const expectedCount = allParticipants.length;
        const actualCount = targetSession.participants?.length || 0;
        
        console.log(`\n✅ Verification:`);
        console.log(`   - Expected participant count: ${expectedCount}`);
        console.log(`   - Actual participant count: ${actualCount}`);
        
        if (expectedCount === actualCount) {
          console.log(`   🎉 ✅ Participant count is CORRECT!`);
        } else {
          console.log(`   ⚠️  ❌ Participant count MISMATCH!`);
        }
        
      } else {
        console.log(`   ❌ Session not found in getUserSessions response`);
      }
    }

    // Test if invited user can see the session
    console.log('\n🔍 Testing invited user session visibility...');
    
    const invitedParticipant = allParticipants.find(p => p.status === 'invited');
    if (invitedParticipant) {
      const invitedUser = await usersCollection.findOne({ cognitoId: invitedParticipant.cognitoId });
      if (invitedUser) {
        console.log(`\n📧 Getting sessions for invited user: ${invitedUser.email}`);
        
        const invitedUserSessions = await sessionService.getUserSessions(invitedUser.email);
        const invitedUserSession = invitedUserSessions.find(s => s.sessionId === testSession.sessionId);
        
        if (invitedUserSession) {
          console.log(`   ✅ Invited user CAN see the session`);
          console.log(`   - User role: ${invitedUserSession.userRole}`);
          console.log(`   - Participants count: ${invitedUserSession.participants?.length || 0}`);
        } else {
          console.log(`   ❌ Invited user CANNOT see the session`);
        }
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run test
if (require.main === module) {
  testParticipantCountDisplay()
    .then(() => {
      console.log('\n🎉 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testParticipantCountDisplay };
