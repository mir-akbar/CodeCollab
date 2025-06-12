/**
 * Test Participant Count Logic
 * 
 * This script tests that participant counts now only include active participants
 * and exclude pending invitations.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');
const { connectDB } = require('../config/database');

async function testParticipantCount() {
  try {
    // Connect to database
    await connectDB();
    console.log('🔗 Connected to MongoDB');
    
    // Find a session with participants
    const sessions = await Session.find({ status: 'active' }).limit(5);
    
    if (sessions.length === 0) {
      console.log('❌ No active sessions found');
      process.exit(1);
    }
    
    for (const session of sessions) {
      console.log(`\n📋 Testing session: ${session.name} (${session.sessionId})`);
      
      // Count all participants
      const totalParticipants = await SessionParticipant.countDocuments({
        sessionId: session.sessionId
      });
      
      // Count active participants
      const activeParticipants = await SessionParticipant.countDocuments({
        sessionId: session.sessionId,
        status: 'active'
      });
      
      // Count invited participants
      const invitedParticipants = await SessionParticipant.countDocuments({
        sessionId: session.sessionId,
        status: 'invited'
      });
      
      // Check session's stored count
      const storedCount = session.activity?.participantCount || 0;
      
      console.log(`📊 Participant counts:`);
      console.log(`  - Total participants: ${totalParticipants}`);
      console.log(`  - Active participants: ${activeParticipants}`);
      console.log(`  - Invited participants: ${invitedParticipants}`);
      console.log(`  - Session stored count: ${storedCount}`);
      
      // Test the updateActivity method
      await session.updateActivity();
      const updatedSession = await Session.findOne({ sessionId: session.sessionId });
      const newStoredCount = updatedSession.activity?.participantCount || 0;
      
      console.log(`  - Updated stored count: ${newStoredCount}`);
      
      // Verify the count matches active participants only
      if (newStoredCount === activeParticipants) {
        console.log(`✅ Participant count is correct (active only)`);
      } else {
        console.log(`❌ Participant count mismatch! Expected ${activeParticipants}, got ${newStoredCount}`);
      }
      
      // List participants by status
      if (totalParticipants > 0) {
        const participants = await SessionParticipant.find({ sessionId: session.sessionId });
        console.log(`👥 Participants:`);
        participants.forEach(p => {
          console.log(`  - ${p.email} (${p.role}, ${p.status})`);
        });
      }
    }
    
    console.log('\n🎉 Participant count test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
  }
}

testParticipantCount();
