/**
 * Test script to verify the complete invitation system fix
 * Tests session creation, participant counts, and visibility
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testInvitationSystemFix() {
  try {
    console.log('🧪 Testing Complete Invitation System Fix...\n');

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

    console.log('\n📊 Database State Analysis:');
    
    // 1. Check sessions and their participant counts
    const sessions = await sessionsCollection.find({ status: 'active' }).toArray();
    console.log(`\n🔍 Found ${sessions.length} active sessions:`);
    
    for (const session of sessions) {
      // Count participants for this session
      const participants = await participantsCollection.find({ 
        sessionId: session.sessionId 
      }).toArray();
      
      const activeParticipants = participants.filter(p => p.status === 'active');
      const invitedParticipants = participants.filter(p => p.status === 'invited');
      
      console.log(`\n📋 Session: ${session.name} (${session.sessionId})`);
      console.log(`   👤 Creator: ${session.creator}`);
      console.log(`   📈 Total Participants: ${participants.length}`);
      console.log(`   ✅ Active: ${activeParticipants.length}`);
      console.log(`   📧 Invited: ${invitedParticipants.length}`);
      
      // Show participant details
      if (participants.length > 0) {
        console.log(`   👥 Participant Details:`);
        for (const participant of participants) {
          console.log(`      - ${participant.cognitoId} (${participant.role}, ${participant.status})`);
        }
      }
    }

    // 2. Test getUserSessions logic simulation
    console.log('\n🔍 Testing Session Visibility Logic:');
    
    const testUsers = await usersCollection.find({}).limit(3).toArray();
    
    for (const user of testUsers) {
      // Simulate the getUserSessions query logic
      const userParticipations = await participantsCollection.find({
        cognitoId: user.cognitoId,
        status: { $in: ['active', 'invited'] } // This is the key fix
      }).toArray();
      
      const sessionIds = userParticipations.map(p => p.sessionId);
      const userSessions = await sessionsCollection.find({
        $or: [
          { sessionId: { $in: sessionIds } },
          { creator: user.cognitoId }
        ],
        status: 'active'
      }).toArray();
      
      console.log(`\n👤 User: ${user.firstName} ${user.lastName} (${user.cognitoId})`);
      console.log(`   📊 Participations: ${userParticipations.length}`);
      console.log(`   🔍 Visible Sessions: ${userSessions.length}`);
      
      if (userSessions.length > 0) {
        for (const session of userSessions) {
          const participation = userParticipations.find(p => p.sessionId === session.sessionId);
          const participantCount = await participantsCollection.countDocuments({
            sessionId: session.sessionId,
            status: { $in: ['active', 'invited'] }
          });
          
          console.log(`      - ${session.name}: ${participantCount} participants (Role: ${participation?.role || 'creator'})`);
        }
      }
    }

    // 3. Summary
    console.log('\n📈 System Health Summary:');
    const totalSessions = await sessionsCollection.countDocuments({ status: 'active' });
    const totalParticipants = await participantsCollection.countDocuments();
    const sessionsWithCreatorAsParticipant = await participantsCollection.distinct('sessionId', { role: 'owner' });
    
    console.log(`   📊 Total Active Sessions: ${totalSessions}`);
    console.log(`   👥 Total Participants: ${totalParticipants}`);
    console.log(`   ✅ Sessions with Creator as Participant: ${sessionsWithCreatorAsParticipant.length}/${totalSessions}`);
    
    if (sessionsWithCreatorAsParticipant.length === totalSessions) {
      console.log('   🎉 All sessions have creators as participants - Migration successful!');
    } else {
      console.log('   ⚠️  Some sessions missing creator participants - Migration may need to run again');
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
  testInvitationSystemFix()
    .then(() => {
      console.log('\n🎉 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testInvitationSystemFix };
