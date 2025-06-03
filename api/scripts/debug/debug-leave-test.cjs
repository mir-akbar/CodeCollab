/**
 * Test the leave session functionality directly
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SessionService = require('./services/sessionService');
const { connectDB } = require('./config/database');

const USER_EMAIL = 'ssbjs742@gmail.com';
const SESSION_ID = 'e9cf5f5d-375c-4845-b65a-68390117053d';

async function testLeaveSession() {
    try {
        await connectDB();
        console.log(`MongoDB connection established`);

        const sessionService = new SessionService();
        
        console.log(`\n📋 Before leave - checking sessions for ${USER_EMAIL}:`);
        let sessions = await sessionService.getUserSessions(USER_EMAIL);
        console.log(`   Found ${sessions.length} sessions`);
        
        if (sessions.length > 0) {
            const participant = sessions[0].participants.find(p => p.email === USER_EMAIL);
            console.log(`   Participant status: ${participant?.status || 'not found'}`);
        }

        console.log(`\n🚪 Attempting to leave session ${SESSION_ID}...`);
        const leaveResult = await sessionService.leaveSession(SESSION_ID, USER_EMAIL);
        console.log(`   Leave result:`, leaveResult);

        console.log(`\n📋 After leave - checking sessions for ${USER_EMAIL}:`);
        sessions = await sessionService.getUserSessions(USER_EMAIL);
        console.log(`   Found ${sessions.length} sessions`);
        
        if (sessions.length > 0) {
            const participant = sessions[0].participants.find(p => p.email === USER_EMAIL);
            console.log(`   Participant status: ${participant?.status || 'not found'}`);
        }

        // Let's also check the raw participant record
        console.log(`\n🔍 Checking raw participant records:`);
        const SessionParticipant = require('./models/SessionParticipant');
        const rawParticipants = await SessionParticipant.find({
            sessionId: SESSION_ID,
            userEmail: USER_EMAIL
        });
        
        console.log(`   Found ${rawParticipants.length} raw participant records:`);
        rawParticipants.forEach((p, i) => {
            console.log(`     ${i + 1}. Status: ${p.status}, Role: ${p.role}, Created: ${p.createdAt}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

testLeaveSession();
