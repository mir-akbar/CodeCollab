const axios = require('axios');
const mongoose = require('./api/node_modules/mongoose');

// Import models 
const Session = require('./api/models/Session');
const SessionParticipant = require('./api/models/SessionParticipant');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/codelab';

async function debugDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the test session
    const sessionId = 'a95098ae-b7a6-4c75-8dcd-1926734939ab';
    
    console.log(`🔍 Looking for session: ${sessionId}`);
    
    // Find session in database
    const session = await Session.findOne({ sessionId });
    console.log('📋 Session found:', {
      id: session?._id,
      sessionId: session?.sessionId,
      name: session?.name,
      creator: session?.creator,
      status: session?.status
    });

    // Find ALL participants for this session (including inactive ones)
    console.log('\n🔍 All participants in database:');
    const allParticipants = await SessionParticipant.find({ sessionId });
    
    allParticipants.forEach((participant, index) => {
      console.log(`   ${index + 1}. ${participant.userEmail} - ${participant.role} (${participant.status}) [${participant._id}]`);
      console.log(`      Invited by: ${participant.invitedBy}`);
      console.log(`      Joined: ${participant.joinedAt}`);
      console.log(`      Created: ${participant.createdAt}`);
    });

    // Test the specific participant lookup that's causing issues
    console.log('\n🧪 Testing participant lookups:');
    
    const testEmails = ['admin-user@example.com', 'new-user@example.com', 'test@example.com'];
    
    for (const email of testEmails) {
      const existing = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: email
      });
      
      console.log(`   ${email}: ${existing ? `EXISTS (${existing.status}, ${existing.role})` : 'NOT FOUND'}`);
    }

    // Check if there are any participants with null/undefined emails or sessionIds
    console.log('\n🔍 Checking for data quality issues:');
    const invalidParticipants = await SessionParticipant.find({
      $or: [
        { sessionId: { $in: [null, undefined, ''] } },
        { userEmail: { $in: [null, undefined, ''] } }
      ]
    });
    
    console.log(`   Invalid participants found: ${invalidParticipants.length}`);
    invalidParticipants.forEach(p => {
      console.log(`   - ID: ${p._id}, SessionID: ${p.sessionId}, Email: ${p.userEmail}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugDatabase();
