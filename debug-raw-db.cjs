// Debug script to check database directly
const mongoose = require('./api/node_modules/mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/codelab';

async function checkDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all sessions
    console.log('📋 All sessions in database:');
    const sessions = await mongoose.connection.db.collection('sessions').find({}).toArray();
    
    sessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.sessionId} - ${session.name} (${session.creator})`);
    });

    // Get all participants
    console.log('\n👥 All participants in database:');
    const participants = await mongoose.connection.db.collection('session_participants').find({}).toArray();
    
    participants.forEach((participant, index) => {
      console.log(`   ${index + 1}. ${participant.userEmail} in ${participant.sessionId} - ${participant.role} (${participant.status})`);
    });

    // Look for our specific test session
    const sessionId = 'a95098ae-b7a6-4c75-8dcd-1926734939ab';
    console.log(`\n🔍 Looking for session: ${sessionId}`);
    
    const session = await mongoose.connection.db.collection('sessions').findOne({ sessionId });
    console.log('Session found:', session ? 'YES' : 'NO');
    
    if (session) {
      const sessionParticipants = await mongoose.connection.db.collection('session_participants').find({ sessionId }).toArray();
      console.log(`Participants in this session: ${sessionParticipants.length}`);
      
      sessionParticipants.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.userEmail} - ${p.role} (${p.status})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkDatabase();
