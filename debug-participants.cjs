const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function checkSessionParticipants() {
  try {
    console.log('🔍 Checking current session participants...\n');

    // Get all sessions for the test user
    const sessionsResponse = await axios.get(`${API_BASE}/sessions`, {
      headers: {
        'x-user-email': 'test@example.com'
      }
    });

    console.log('📋 Sessions found:', sessionsResponse.data.sessions.length);
    
    // Get the most recent session
    if (sessionsResponse.data.sessions.length > 0) {
      const session = sessionsResponse.data.sessions[0];
      
      console.log(`\n📊 Session: ${session.name} (${session.sessionId})`);
      console.log(`   Creator: ${session.creator}`);
      console.log(`   Participants (${session.participants.length}):`);
      
      session.participants.forEach((participant, index) => {
        console.log(`   ${index + 1}. ${participant.email || participant.userEmail} - ${participant.role} (${participant.status})`);
      });

      // Test inviting a user who isn't in the session
      const testEmails = [
        'admin-user@example.com',
        'another-admin@example.com', 
        'new-user@example.com',
        'fresh-invite@example.com'
      ];

      console.log('\n🧪 Testing invitations with different users...');
      
      for (const email of testEmails) {
        const isParticipant = session.participants.some(p => 
          (p.email === email || p.userEmail === email)
        );
        
        console.log(`   ${email}: ${isParticipant ? '❌ Already participant' : '✅ Available for invite'}`);
        
        // Try inviting the first available user
        if (!isParticipant) {
          console.log(`\n📤 Testing invitation to ${email}...`);
          
          try {
            const inviteResponse = await axios.post(
              `${API_BASE}/sessions/${session.sessionId}/invite`,
              {
                inviteeEmail: email,
                role: 'admin',
                email: 'test@example.com'
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-email': 'test@example.com'
                }
              }
            );
            
            console.log(`   ✅ Success:`, inviteResponse.data);
            break; // Success, stop testing
            
          } catch (error) {
            console.log(`   ❌ Failed:`, error.response?.data || error.message);
          }
        }
      }

    } else {
      console.log('❌ No sessions found for test@example.com');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkSessionParticipants();
