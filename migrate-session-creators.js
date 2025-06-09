/**
 * Migration script to add session creators as owner participants
 * This fixes existing sessions that were created before the participant fix
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Session = require('./api/models/Session');
const SessionParticipant = require('./api/models/SessionParticipant');
const User = require('./api/models/User');

async function migrateSessionCreators() {
  try {
    console.log('🔄 Starting migration: Adding session creators as participants...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all active sessions
    const sessions = await Session.find({ status: 'active' });
    console.log(`📊 Found ${sessions.length} active sessions to process`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const session of sessions) {
      console.log(`\n🔍 Processing session: ${session.sessionId} (${session.name})`);
      
      // Check if creator is already a participant
      const existingParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        cognitoId: session.creator
      });

      if (existingParticipant) {
        console.log(`   ⏭️  Creator already exists as participant with role: ${existingParticipant.role}`);
        skippedCount++;
        continue;
      }

      // Add creator as owner participant
      try {
        await SessionParticipant.create({
          sessionId: session.sessionId,
          cognitoId: session.creator,
          role: 'owner',
          status: 'active',
          invitedBy: session.creator, // Self-created
          joinedAt: session.createdAt || new Date()
        });

        console.log(`   ✅ Added creator as owner participant`);
        migratedCount++;

      } catch (error) {
        console.error(`   ❌ Failed to add creator as participant:`, error.message);
      }
    }

    console.log(`\n📈 Migration completed:`);
    console.log(`   ✅ Migrated: ${migratedCount} sessions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} sessions (already had creator as participant)`);
    console.log(`   📊 Total processed: ${sessions.length} sessions`);

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSessionCreators()
    .then(() => {
      console.log('\n🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateSessionCreators };
