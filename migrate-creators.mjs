/**
 * Migration script to add session creators as owner participants
 * This fixes existing sessions that were created before the participant fix
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, 'api', '.env') });

async function migrateSessionCreators() {
  try {
    console.log('🔄 Starting migration: Adding session creators as participants...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI;
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || 'code_colab'
    });
    console.log('✅ Connected to MongoDB');

    // Access collections directly
    const db = mongoose.connection.db;
    const sessionsCollection = db.collection('sessions');
    const participantsCollection = db.collection('sessionparticipants');

    // Find all active sessions
    const sessions = await sessionsCollection.find({ status: 'active' }).toArray();
    console.log(`📊 Found ${sessions.length} active sessions to process`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const session of sessions) {
      console.log(`\n🔍 Processing session: ${session.sessionId} (${session.name})`);
      
      // Check if creator is already a participant
      const existingParticipant = await participantsCollection.findOne({
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
        const participantDoc = {
          sessionId: session.sessionId,
          cognitoId: session.creator,
          role: 'owner',
          status: 'active',
          invitedBy: session.creator, // Self-created
          joinedAt: session.createdAt || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await participantsCollection.insertOne(participantDoc);

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

// Run migration
migrateSessionCreators()
  .then(() => {
    console.log('\n🎉 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
