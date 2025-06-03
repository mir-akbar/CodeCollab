const { connectDB } = require('./api/config/database');
const Session = require('./api/models/Session');
const SessionParticipant = require('./api/models/SessionParticipant');

async function debugInvitationLogic() {
  try {
    await connectDB();
    console.log('🔍 Debugging invitation logic...\n');

    // Create a test session
    const sessionData = {
      sessionId: `debug-${Date.now()}`,
      name: 'Debug Session',
      description: 'Testing invitation logic',
      creator: 'test@example.com'
    };

    const session = new Session(sessionData);
    await session.save();
    console.log(`✅ Created session: ${session.sessionId}`);

    // Create owner participant
    const ownerParticipant = new SessionParticipant({
      sessionId: session.sessionId,
      userEmail: 'test@example.com',
      userName: 'test',
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
      invitedBy: 'test@example.com' // Owner invites themselves
    });
    await ownerParticipant.save();
    console.log(`✅ Created owner participant: test@example.com`);

    // Now test the exact logic from _inviteUserNew
    console.log('\n🧪 Testing invitation logic for admin@example.com...');
    
    const inviterEmail = 'test@example.com';
    const inviteeEmail = 'admin@example.com';
    
    // Check if inviter has permission
    console.log('1. Checking inviter permissions...');
    const inviterParticipant = await SessionParticipant.findOne({
      sessionId: session.sessionId,
      userEmail: inviterEmail,
      status: 'active'
    });
    console.log(`   Inviter found: ${!!inviterParticipant}`);
    if (inviterParticipant) {
      console.log(`   Inviter role: ${inviterParticipant.role}`);
      console.log(`   Has permission: ${['owner', 'admin'].includes(inviterParticipant.role)}`);
    }

    // Check if invitee is already a participant
    console.log('2. Checking if invitee already exists...');
    const existingParticipant = await SessionParticipant.findOne({
      sessionId: session.sessionId,
      userEmail: inviteeEmail
    });
    console.log(`   Existing participant found: ${!!existingParticipant}`);
    if (existingParticipant) {
      console.log(`   Existing participant details:`, {
        email: existingParticipant.userEmail,
        role: existingParticipant.role,
        status: existingParticipant.status
      });
    }

    // List all participants for this session
    console.log('\n📋 All participants in this session:');
    const allParticipants = await SessionParticipant.find({ sessionId: session.sessionId });
    allParticipants.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.userEmail} (${p.role}, ${p.status})`);
    });

    // Clean up
    await SessionParticipant.deleteMany({ sessionId: session.sessionId });
    await Session.deleteOne({ sessionId: session.sessionId });
    console.log('\n🧹 Cleaned up test data');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugInvitationLogic();
