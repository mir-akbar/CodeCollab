/**
 * Script to create a test invitation to verify participant count display
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createTestInvitation() {
  try {
    console.log('🧪 Creating test invitation...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI;
    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || 'code_colab'
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const participantsCollection = db.collection('sessionparticipants');
    const usersCollection = db.collection('users');

    // Find the test session
    const sessionId = 'f0dd1f95-0eb6-4109-8990-5719bbfcb763';
    
    // Create test invitation record (the one you mentioned)
    const invitationRecord = {
      sessionId: sessionId,
      cognitoId: '81332d8a-7001-7056-bfa3-df30c2fde221',
      role: 'editor',
      status: 'invited',
      invitedBy: 'c1b35d3a-3051-70aa-64c5-fa6b47696ce8',
      joinedAt: null,
      lastActive: new Date('2025-06-09T19:08:50.046Z'),
      createdAt: new Date('2025-06-09T19:08:50.047Z'),
      updatedAt: new Date('2025-06-09T19:08:50.047Z'),
      __v: 0
    };

    // Check if this invitation already exists
    const existing = await participantsCollection.findOne({
      sessionId: sessionId,
      cognitoId: '81332d8a-7001-7056-bfa3-df30c2fde221'
    });

    if (existing) {
      console.log('📋 Invitation already exists:', existing.role, existing.status);
    } else {
      // Insert the invitation record
      await participantsCollection.insertOne(invitationRecord);
      console.log('✅ Created test invitation record');
    }

    // Verify the record exists
    const participants = await participantsCollection.find({
      sessionId: sessionId,
      status: { $in: ['active', 'invited'] }
    }).toArray();

    console.log(`\n👥 Total participants now: ${participants.length}`);
    for (const participant of participants) {
      const user = await usersCollection.findOne({ cognitoId: participant.cognitoId });
      console.log(`   - ${user?.email || participant.cognitoId} (${participant.role}, ${participant.status})`);
    }

    console.log('\n🎉 Test invitation created successfully!');

  } catch (error) {
    console.error('💥 Failed to create test invitation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createTestInvitation()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestInvitation };
