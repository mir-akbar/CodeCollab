/**
 * Debug script to test leave session functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'akbarmir02@gmail.com';

async function testLeaveSession() {
    try {
        console.log('🧪 Testing Leave Session Functionality');
        console.log('=====================================');

        // Step 1: Get user sessions to find one to leave
        console.log('\n📋 Step 1: Getting user sessions...');
        const sessionsResponse = await axios.get(`${BASE_URL}/sessions`, {
            params: { email: TEST_EMAIL }
        });

        if (!sessionsResponse.data.success || !sessionsResponse.data.sessions.length) {
            console.log('❌ No sessions found for user. Creating a test session first...');
            
            // Create a test session
            const createResponse = await axios.post(`${BASE_URL}/sessions`, {
                creator: TEST_EMAIL, // Use 'creator' field as expected by validation
                name: 'Test Session for Leave',
                description: 'Test session created for leave functionality test'
            }, {
                params: { email: TEST_EMAIL }
            });
            
            if (!createResponse.data.success) {
                throw new Error('Failed to create test session');
            }
            
            console.log('✅ Created test session:', createResponse.data.session.sessionId);
            
            // Get sessions again
            const updatedSessionsResponse = await axios.get(`${BASE_URL}/sessions`, {
                params: { email: TEST_EMAIL }
            });
            
            sessionsResponse.data = updatedSessionsResponse.data;
        }

        const sessions = sessionsResponse.data.sessions;
        console.log(`✅ Found ${sessions.length} sessions for user`);
        
        // Find a session where user is not the owner (can leave)
        let targetSession = sessions.find(s => !s.isCreator && s.role !== 'owner');
        
        if (!targetSession) {
            console.log('❌ No non-owner sessions found. Creating invitation scenario...');
            
            // Use the first session and try to invite another user, then test with that user
            const ownerSession = sessions[0];
            const inviteeEmail = 'invitee@example.com';
            
            console.log(`📧 Inviting ${inviteeEmail} to session ${ownerSession.sessionId}`);
            
            try {
                await axios.post(`${BASE_URL}/sessions/${ownerSession.sessionId}/invite`, {
                    email: TEST_EMAIL,
                    inviteeEmail: inviteeEmail,
                    role: 'editor'
                });
                
                console.log('✅ Invitation sent successfully');
                
                // Now test leave with the invited user
                console.log(`\n🚪 Step 2: Testing leave session for invited user...`);
                const leaveResponse = await axios.post(`${BASE_URL}/sessions/${ownerSession.sessionId}/leave`, {
                    email: inviteeEmail
                });
                
                console.log('✅ Leave session response:', leaveResponse.data);
                
            } catch (inviteError) {
                console.log('⚠️  Invitation failed, testing leave as owner (should fail)...');
                targetSession = ownerSession;
            }
        }
        
        if (targetSession) {
            console.log(`\n🚪 Step 2: Testing leave session ${targetSession.sessionId}...`);
            console.log(`   User: ${TEST_EMAIL}`);
            console.log(`   Role: ${targetSession.role || targetSession.access}`);
            console.log(`   Is Creator: ${targetSession.isCreator}`);
            
            const leaveResponse = await axios.post(`${BASE_URL}/sessions/${targetSession.sessionId}/leave`, {
                email: TEST_EMAIL
            });
            
            console.log('✅ Leave session response:', leaveResponse.data);
            
            // Step 3: Verify the user no longer has access
            console.log('\n📋 Step 3: Verifying user no longer has access...');
            const verifyResponse = await axios.get(`${BASE_URL}/sessions`, {
                params: { email: TEST_EMAIL }
            });
            
            const remainingSessions = verifyResponse.data.sessions;
            const sessionStillExists = remainingSessions.some(s => 
                (s.sessionId === targetSession.sessionId || s.id === targetSession.id)
            );
            
            if (sessionStillExists) {
                console.log('❌ Session still appears in user\'s sessions list');
                const stillExistingSession = remainingSessions.find(s => 
                    s.sessionId === targetSession.sessionId || s.id === targetSession.id
                );
                console.log('   Session details:', stillExistingSession);
            } else {
                console.log('✅ Session successfully removed from user\'s sessions');
            }
        }

        console.log('\n🎉 Leave session test completed!');

    } catch (error) {
        console.error('💥 Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Run the test
testLeaveSession();
