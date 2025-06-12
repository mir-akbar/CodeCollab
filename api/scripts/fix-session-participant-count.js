/**
 * Fix Session Participant Count
 * 
 * This script ensures that:
 * 1. Session creators are properly added as participants
 * 2. Session activity.participantCount is updated correctly
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');
const User = require('../models/User');
require('../config/database');

async function fixSessionParticipantCount() {
  try {
    await mongoose.connection.once('open', async () => {
      console.log('🔗 Connected to MongoDB Atlas');
      
      const sessionId = 'a1556f08-7ffb-49b7-afa9-4de82642868a';
      console.log(`🔍 Fixing session: ${sessionId}`);
      
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        console.log('❌ Session not found');
        process.exit(1);
      }
      
      console.log('✅ Found session:', {
        name: session.name,
        creator: session.creator,
        currentParticipantCount: session.activity?.participantCount
      });
      
      // Find the creator user
      const creatorUser = await User.findOne({ cognitoId: session.creator });
      if (!creatorUser) {
        console.log('❌ Creator user not found');
        process.exit(1);
      }
      
      console.log('✅ Found creator user:', {
        email: creatorUser.email,
        cognitoId: creatorUser.cognitoId
      });
      
      // Check if creator exists as participant
      const creatorParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        cognitoId: session.creator
      });
      
      if (!creatorParticipant) {
        console.log('➕ Creator not found as participant, adding...');
        
        // Add creator as participant
        await SessionParticipant.create({
          sessionId: session.sessionId,
          cognitoId: session.creator,
          role: 'owner',
          status: 'active',
          invitedBy: session.creator, // Self-created
          username: creatorUser.username,
          displayName: creatorUser.displayName,
          name: creatorUser.name,
          email: creatorUser.email,
          joinedAt: new Date()
        });
        
        console.log('✅ Added creator as participant');
      } else {
        console.log('✅ Creator already exists as participant:', {
          role: creatorParticipant.role,
          status: creatorParticipant.status
        });
        
        // Ensure creator has correct role and status
        if (creatorParticipant.role !== 'owner' || creatorParticipant.status !== 'active') {
          console.log('🔧 Updating creator participant...');
          creatorParticipant.role = 'owner';
          creatorParticipant.status = 'active';
          if (!creatorParticipant.joinedAt) {
            creatorParticipant.joinedAt = new Date();
          }
          await creatorParticipant.save();
          console.log('✅ Updated creator participant');
        }
      }
      
      // Update session activity
      console.log('🔄 Updating session activity...');
      await session.updateActivity();
      
      // Verify the count
      const updatedSession = await Session.findOne({ sessionId });
      const participantCount = await SessionParticipant.countDocuments({
        sessionId: session.sessionId,
        status: { $in: ['active', 'invited'] }
      });
      
      console.log('✅ Updated session activity:', {
        'session.activity.participantCount': updatedSession.activity.participantCount,
        'actual participant count': participantCount
      });
      
      // List all participants
      const allParticipants = await SessionParticipant.find({ sessionId: session.sessionId });
      console.log(`👥 All participants (${allParticipants.length}):`);
      allParticipants.forEach(p => {
        console.log(`  - ${p.email} (${p.role}, ${p.status})`);
      });
      
      console.log('🎉 Session participant count fixed successfully!');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSessionParticipantCount();
