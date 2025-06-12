#!/usr/bin/env node
/**
 * Migration Script: Update SessionParticipant records with user information
 * 
 * This script adds username, displayName, name, and email fields to existing
 * SessionParticipant records by looking up the corresponding User records.
 * 
 * Usage: node api/scripts/migrate-participant-user-info.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const SessionParticipant = require('../models/SessionParticipant');
const User = require('../models/User');

async function connectToDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function migrateParticipantUserInfo() {
  try {
    console.log('🔄 Starting SessionParticipant user info migration...');

    // Find all participants that don't have user info populated
    const participantsToUpdate = await SessionParticipant.find({
      $or: [
        { name: { $exists: false } },
        { email: { $exists: false } },
        { name: null },
        { email: null }
      ]
    });

    console.log(`📊 Found ${participantsToUpdate.length} participant records to update`);

    if (participantsToUpdate.length === 0) {
      console.log('✅ No participants need user info migration');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const participant of participantsToUpdate) {
      try {
        // Find the corresponding user
        const user = await User.findOne({ cognitoId: participant.cognitoId });
        
        if (!user) {
          console.warn(`⚠️  User not found for cognitoId: ${participant.cognitoId}`);
          errors++;
          continue;
        }

        // Update participant with user information
        await SessionParticipant.updateOne(
          { _id: participant._id },
          {
            $set: {
              username: user.username,
              displayName: user.displayName,
              name: user.name,
              email: user.email
            }
          }
        );

        updated++;
        
        if (updated % 50 === 0) {
          console.log(`📈 Updated ${updated}/${participantsToUpdate.length} participants...`);
        }
        
      } catch (error) {
        console.error(`❌ Error updating participant ${participant._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📋 Migration Summary:');
    console.log(`✅ Successfully updated: ${updated} participants`);
    console.log(`❌ Errors encountered: ${errors} participants`);
    
    if (updated > 0) {
      console.log('✨ Migration completed successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function validateMigration() {
  try {
    console.log('\n🔍 Validating migration results...');

    const participantsWithoutUserInfo = await SessionParticipant.countDocuments({
      $or: [
        { name: { $exists: false } },
        { email: { $exists: false } },
        { name: null },
        { email: null }
      ]
    });

    const totalParticipants = await SessionParticipant.countDocuments();

    console.log(`📊 Total participants: ${totalParticipants}`);
    console.log(`⚠️  Participants missing user info: ${participantsWithoutUserInfo}`);

    if (participantsWithoutUserInfo === 0) {
      console.log('✅ All participants have user information populated!');
    } else {
      console.log('⚠️  Some participants still missing user info (possibly orphaned records)');
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

async function main() {
  try {
    await connectToDatabase();
    await migrateParticipantUserInfo();
    await validateMigration();
    
    console.log('\n🎉 Migration script completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the migration
main().catch(console.error);
