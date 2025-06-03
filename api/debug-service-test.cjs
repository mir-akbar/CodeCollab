/**
 * Test the exact getUserSessions method that the API is using
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SessionService = require('./services/sessionService');
const { connectDB } = require('./config/database');

const USER_EMAIL = 'ssbjs742@gmail.com';

async function debugGetUserSessions() {
    try {
        // Use the same connection logic as the server
        await connectDB();
        console.log(`MongoDB connection established`);

        const sessionService = new SessionService();
        
        console.log(`\n🔧 Testing sessionService.getUserSessions('${USER_EMAIL}'):`);
        console.log(`   Using new system: ${sessionService.useNewSystem}`);
        
        const sessions = await sessionService.getUserSessions(USER_EMAIL);
        
        console.log(`\n📋 getUserSessions returned ${sessions.length} sessions:`);
        sessions.forEach((session, i) => {
            console.log(`\n${i + 1}. Session: "${session.name}" (${session.sessionId})`);
            console.log(`   Creator: ${session.creator}`);
            console.log(`   Is Creator: ${session.isCreator}`);
            console.log(`   Status: ${session.status}`);
            console.log(`   Participants: ${session.participants?.length || 0}`);
            
            if (session.participants) {
                session.participants.forEach((p, j) => {
                    console.log(`     ${j + 1}. ${p.email} - ${p.role} (${p.status})`);
                });
            }
        });

        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

debugGetUserSessions();
