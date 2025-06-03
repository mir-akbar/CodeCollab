/**
 * Debug script to test the exact scenario described by the user
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const OWNER_EMAIL = 'akbarmir02@gmail.com';
const PARTICIPANT_EMAIL = 'ssbjs742@gmail.com';

async function debugLiveScenario() {
    try {
        console.log('🔍 Debugging Live Leave Session Issue');
        console.log('====================================');

        // Step 1: Check current sessions for participant before leave
        console.log('\n📋 Step 1: Checking participant sessions BEFORE leave...');
        const beforeResponse = await axios.get(`${BASE_URL}/sessions`, {
            params: { email: PARTICIPANT_EMAIL }
        });

        console.log('Response status:', beforeResponse.status);
        console.log('Sessions for participant BEFORE leave:', beforeResponse.data.sessions?.length || 0);
        
        if (beforeResponse.data.sessions?.length > 0) {
            const participantSessions = beforeResponse.data.sessions;
            console.log('Session details:');
            participantSessions.forEach((session, index) => {
                console.log(`  ${index + 1}. ${session.name} (${session.sessionId})`);
                console.log(`     Creator: ${session.creator}`);
                console.log(`     Is Creator: ${session.isCreator}`);
                console.log(`     Role: ${session.role || 'N/A'}`);
                console.log(`     Access: ${session.access || 'N/A'}`);
                console.log(`     Participants: ${session.participants?.length || 0}`);
                
                // Check if participant is in the participants list
                const participantRecord = session.participants?.find(p => p.email === PARTICIPANT_EMAIL);
                console.log(`     Participant record: ${participantRecord ? JSON.stringify(participantRecord) : 'Not found'}`);
                console.log('');
            });

            // Test leave on the first session
            const sessionToLeave = participantSessions[0];
            console.log(`\n🚪 Step 2: Attempting to leave session ${sessionToLeave.sessionId}...`);
            
            const leaveResponse = await axios.post(`${BASE_URL}/sessions/${sessionToLeave.sessionId}/leave`, {
                email: PARTICIPANT_EMAIL
            });

            console.log('Leave response status:', leaveResponse.status);
            console.log('Leave response data:', leaveResponse.data);

            // Step 3: Check sessions after leave
            console.log('\n📋 Step 3: Checking participant sessions AFTER leave...');
            const afterResponse = await axios.get(`${BASE_URL}/sessions`, {
                params: { email: PARTICIPANT_EMAIL }
            });

            console.log('Response status:', afterResponse.status);
            console.log('Sessions for participant AFTER leave:', afterResponse.data.sessions?.length || 0);
            
            if (afterResponse.data.sessions?.length > 0) {
                console.log('❌ ISSUE CONFIRMED: Sessions still returned after leave');
                const afterSessions = afterResponse.data.sessions;
                afterSessions.forEach((session, index) => {
                    console.log(`  ${index + 1}. ${session.name} (${session.sessionId})`);
                    console.log(`     Still in participants: ${session.participants?.some(p => p.email === PARTICIPANT_EMAIL)}`);
                    
                    // Check participant record status
                    const participantRecord = session.participants?.find(p => p.email === PARTICIPANT_EMAIL);
                    if (participantRecord) {
                        console.log(`     Participant status: ${participantRecord.status || 'active'}`);
                        console.log(`     Participant role: ${participantRecord.role || 'N/A'}`);
                    }
                });
            } else {
                console.log('✅ Sessions correctly filtered out after leave');
            }

            // Step 4: Check raw database state
            console.log('\n🔍 Step 4: Checking session details directly...');
            const sessionDetailsResponse = await axios.get(`${BASE_URL}/sessions/${sessionToLeave.sessionId}`, {
                params: { email: OWNER_EMAIL }
            });

            if (sessionDetailsResponse.status === 200) {
                const sessionDetails = sessionDetailsResponse.data.session;
                console.log('Session participants after leave:');
                sessionDetails.participants?.forEach(p => {
                    console.log(`  - ${p.email}: ${p.status || 'active'} (${p.role || 'viewer'})`);
                });
            }

            // Step 5: Check for duplicate participant records
            console.log('\n🔍 Step 5: Checking for duplicate participant records...');
            try {
                const duplicateCheckResponse = await axios.get(`${BASE_URL}/debug/participants/${sessionToLeave.sessionId}/${PARTICIPANT_EMAIL}`, {
                    params: { email: OWNER_EMAIL }
                });
                
                if (duplicateCheckResponse.status === 200) {
                    const records = duplicateCheckResponse.data.participants;
                    console.log(`Found ${records.length} participant records:`);
                    records.forEach((record, index) => {
                        console.log(`  ${index + 1}. ID: ${record._id}, Status: ${record.status}, Role: ${record.role}, Created: ${record.createdAt}`);
                    });
                }
            } catch (debugError) {
                console.log('Debug endpoint not available - creating temporary endpoint...');
            }

        } else {
            console.log('❌ No sessions found for participant. The user may have already left all sessions.');
        }

    } catch (error) {
        console.error('💥 Debug failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

debugLiveScenario();
