/**
 * Script to create a test invitation and verify the complete workflow
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createTestInvitation() {
  try {
    console.log('🧪 Creating Test Invitation...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI;
    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || 'code_colab'
    });
    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoose.connection.db;
    const sessionsCollection = db.collection('sessions');
    const participantsCollection = db.collection('sessionparticipants');

    // Get the active session
    const session = await sessionsCollection.findOne({ status: 'active' });
    if (!session) {
      console.log('❌ No active session found');
      return;
    }

    console.log(`📋 Working with session: ${session.name} (${session.sessionId})`);
    console.log(`👤 Creator: ${session.creator}`);

    // Check current participants
    const currentParticipants = await participantsCollection.find({ 
      sessionId: session.sessionId 
    }).toArray();
    
    console.log(`\n👥 Current participants: ${currentParticipants.length}`);
    for (const p of currentParticipants) {
      console.log(`   - ${p.cognitoId}: ${p.role} (${p.status})`);
    }

    // Create invitation for the other user
    const inviteeId = '81332d8a-7001-7056-bfa3-df30c2fde221'; // mirakbarkhan@protonmail.com
    
    // Check if invitation already exists
    const existingInvitation = await participantsCollection.findOne({
      sessionId: session.sessionId,
      cognitoId: inviteeId
    });

    if (existingInvitation) {
      console.log(`\n⚠️  Invitation already exists:`);
      console.log(`   - ${existingInvitation.cognitoId}: ${existingInvitation.role} (${existingInvitation.status})`);
    } else {
      console.log(`\n📧 Creating invitation for ${inviteeId}...`);
      
      const invitationDoc = {
        sessionId: session.sessionId,
        cognitoId: inviteeId,
        role: 'editor',
        status: 'invited',
        invitedBy: session.creator,
        joinedAt: null,
        lastActive: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await participantsCollection.insertOne(invitationDoc);
      console.log(`✅ Invitation created successfully`);
    }

    // Verify final state
    console.log(`\n🔍 Final verification:`);
    const finalParticipants = await participantsCollection.find({ 
      sessionId: session.sessionId 
    }).toArray();
    
    console.log(`👥 Total participants: ${finalParticipants.length}`);
    for (const p of finalParticipants) {
      console.log(`   - ${p.cognitoId}: ${p.role} (${p.status})`);
    }

    // Test the getUserSessions logic for both users
    console.log(`\n🧪 Testing getUserSessions logic:`);
    
    for (const userId of [session.creator, inviteeId]) {
      console.log(`\n👤 Testing for user: ${userId}`);
      
      // Simulate getUserSessions query
      const userParticipations = await participantsCollection.find({
        cognitoId: userId,
        status: { $in: ['active', 'invited'] }
      }).toArray();
      
      const sessionIds = userParticipations.map(p => p.sessionId);
      const userSessions = await sessionsCollection.find({
        $or: [
          { sessionId: { $in: sessionIds } },
          { creator: userId }
        ],
        status: 'active'
      }).toArray();
      
      console.log(`   📊 Participations found: ${userParticipations.length}`);
      console.log(`   🔍 Sessions visible: ${userSessions.length}`);
      
      if (userSessions.length > 0) {
        for (const s of userSessions) {
          const participantCount = await participantsCollection.countDocuments({
            sessionId: s.sessionId,
            status: { $in: ['active', 'invited'] }
          });
          console.log(`      - ${s.name}: ${participantCount} participants`);
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
  createTestInvitation()
    .then(() => {
      console.log('\n🎉 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestInvitation };
