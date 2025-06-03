/**
 * Find all sessions and participants
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SessionParticipant = require('./models/SessionParticipant');
const Session = require('./models/Session');

const USER_EMAIL = 'ssbjs742@gmail.com';

async function findAllSessions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab');
        console.log('🔗 Connected to MongoDB');

        // Find all sessions
        console.log('\n📋 All Sessions:');
        const allSessions = await Session.find({}).sort({ createdAt: -1 }).limit(10);
        allSessions.forEach((s, i) => {
            console.log(`  ${i + 1}. "${s.name}" (${s.sessionId}) - Creator: ${s.creator}`);
        });

        // Find all participant records for the user
        console.log(`\n👤 All participant records for ${USER_EMAIL}:`);
        const allParticipants = await SessionParticipant.find({
            userEmail: USER_EMAIL
        }).sort({ createdAt: -1 });
        
        console.log(`Found ${allParticipants.length} participant record(s):`);
        allParticipants.forEach((p, i) => {
            console.log(`\n${i + 1}. Session ID: ${p.sessionId}`);
            console.log(`   Status: ${p.status}`);
            console.log(`   Role: ${p.role}`);
            console.log(`   Created: ${p.createdAt}`);
            console.log(`   Left At: ${p.leftAt || 'N/A'}`);
        });

        // Let's also check if there are any sessions where this user is listed in participants
        console.log(`\n🔍 Checking sessions with ${USER_EMAIL} as participant...`);
        const sessionsWithUser = await Session.find({
            $or: [
                { creator: USER_EMAIL },
                { 'participants.email': USER_EMAIL }
            ]
        });
        
        console.log(`Found ${sessionsWithUser.length} sessions where user is involved:`);
        sessionsWithUser.forEach((s, i) => {
            console.log(`  ${i + 1}. "${s.name}" (${s.sessionId})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

findAllSessions();
