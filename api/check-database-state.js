/**
 * Script to check current database state and identify issues
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabaseState() {
  try {
    console.log('🔍 Checking Current Database State...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI;
    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || 'code_colab'
    });
    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoose.connection.db;
    const sessionsCollection = db.collection('sessions');
    const participantsCollection = db.collection('sessionparticipants');
    const usersCollection = db.collection('users');

    // 1. Get all sessions
    const sessions = await sessionsCollection.find({ status: 'active' }).toArray();
    console.log(`📋 Found ${sessions.length} active sessions:`);
    
    for (const session of sessions) {
      console.log(`\n📋 Session: ${session.name}`);
      console.log(`   🆔 ID: ${session.sessionId}`);
      console.log(`   👤 Creator: ${session.creator}`);
      console.log(`   📅 Created: ${session.createdAt}`);
      
      // Get all participants for this session
      const participants = await participantsCollection.find({ 
        sessionId: session.sessionId 
      }).toArray();
      
      console.log(`   👥 Participants in database: ${participants.length}`);
      
      if (participants.length === 0) {
        console.log('   ❌ NO PARTICIPANTS FOUND!');
      } else {
        for (const participant of participants) {
          console.log(`      - ${participant.cognitoId}: ${participant.role} (${participant.status})`);
          console.log(`        Invited by: ${participant.invitedBy}`);
          console.log(`        Joined: ${participant.joinedAt || 'Not joined yet'}`);
        }
      }
      
      // Check if creator exists as participant
      const creatorParticipant = participants.find(p => p.cognitoId === session.creator);
      if (!creatorParticipant) {
        console.log(`   ❌ CREATOR NOT FOUND AS PARTICIPANT!`);
        console.log(`   🔧 Creator ${session.creator} should be added as owner`);
      } else {
        console.log(`   ✅ Creator found as participant with role: ${creatorParticipant.role}`);
      }
    }

    // 2. Check for orphaned participants
    console.log(`\n🔍 Checking for orphaned participants...`);
    const allParticipants = await participantsCollection.find({}).toArray();
    const sessionIds = sessions.map(s => s.sessionId);
    
    for (const participant of allParticipants) {
      if (!sessionIds.includes(participant.sessionId)) {
        console.log(`❌ Orphaned participant: ${participant.cognitoId} in session ${participant.sessionId}`);
      }
    }

    // 3. Check users
    console.log(`\n👥 User Information:`);
    const users = await usersCollection.find({}).toArray();
    for (const user of users) {
      console.log(`   - ${user.cognitoId}: ${user.firstName} ${user.lastName} (${user.email})`);
    }

  } catch (error) {
    console.error('💥 Check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run check
if (require.main === module) {
  checkDatabaseState()
    .then(() => {
      console.log('\n🎉 Database check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseState };
