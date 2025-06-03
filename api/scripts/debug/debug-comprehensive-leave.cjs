/**
 * Comprehensive debugging for leave session functionality
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SessionService = require('./services/sessionService');
const { connectDB } = require('./config/database');

const USER_EMAIL = 'ssbjs742@gmail.com';
const SESSION_ID = 'e9cf5f5d-375c-4845-b65a-68390117053d';

async function debugLeaveSession() {
    try {
        await connectDB();
        console.log(`✅ MongoDB connection established`);

        const sessionService = new SessionService();
        
        // Step 1: Check what getUserSessions returns
        console.log(`\n🔍 Step 1: Checking getUserSessions for ${USER_EMAIL}:`);
        let sessions = await sessionService.getUserSessions(USER_EMAIL);
        console.log(`   Found ${sessions.length} sessions`);
        
        sessions.forEach((session, index) => {
            console.log(`   Session ${index + 1}:`);
            console.log(`     ID: ${session.id}`);
            console.log(`     SessionID: ${session.sessionId}`);
            console.log(`     Name: ${session.name}`);
            console.log(`     Creator: ${session.creator}`);
            console.log(`     IsCreator: ${session.isCreator}`);
            console.log(`     Participants: ${session.participants?.length || 0}`);
            if (session.participants) {
                session.participants.forEach((p, i) => {
                    console.log(`       ${i + 1}. ${p.email || p.userEmail} (${p.role}) - Status: ${p.status}`);
                });
            }
        });

        // Step 2: Check if our target session is in the list
        const targetSession = sessions.find(s => 
            s.sessionId === SESSION_ID || s.id === SESSION_ID
        );
        
        console.log(`\n🎯 Step 2: Target session (${SESSION_ID}) found: ${!!targetSession}`);
        if (targetSession) {
            console.log(`   Target session details:`, JSON.stringify(targetSession, null, 2));
        }

        // Step 3: Check Session collection directly
        console.log(`\n📊 Step 3: Checking Session collection directly:`);
        try {
            const Session = require('./models/Session');
            const sessions_direct = await Session.find({});
            console.log(`   Found ${sessions_direct.length} sessions in Session collection`);
            
            const target_session_direct = await Session.findOne({ sessionId: SESSION_ID });
            console.log(`   Target session in Session collection: ${!!target_session_direct}`);
            if (target_session_direct) {
                console.log(`   Session details:`, JSON.stringify(target_session_direct, null, 2));
            }
        } catch (error) {
            console.log(`   Error accessing Session collection:`, error.message);
        }

        // Step 4: Check SessionParticipant collection directly
        console.log(`\n👥 Step 4: Checking SessionParticipant collection directly:`);
        try {
            const SessionParticipant = require('./models/SessionParticipant');
            const participants_direct = await SessionParticipant.find({});
            console.log(`   Found ${participants_direct.length} participants in SessionParticipant collection`);
            
            const user_participants = await SessionParticipant.find({ userEmail: USER_EMAIL });
            console.log(`   User ${USER_EMAIL} has ${user_participants.length} participant records`);
            
            user_participants.forEach((p, i) => {
                console.log(`     ${i + 1}. Session: ${p.sessionId}, Role: ${p.role}, Status: ${p.status}`);
            });

            const target_participants = await SessionParticipant.find({ sessionId: SESSION_ID });
            console.log(`   Session ${SESSION_ID} has ${target_participants.length} participants`);
            target_participants.forEach((p, i) => {
                console.log(`     ${i + 1}. User: ${p.userEmail}, Role: ${p.role}, Status: ${p.status}`);
            });
        } catch (error) {
            console.log(`   Error accessing SessionParticipant collection:`, error.message);
        }

        // Step 5: Check all collections to understand data sources
        console.log(`\n🗂️ Step 5: Checking all collections:`);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`   Available collections:`);
        collections.forEach(col => {
            console.log(`     - ${col.name}`);
        });

        // Step 6: Try to find the session data source
        console.log(`\n🔎 Step 6: Searching for session ${SESSION_ID} across collections:`);
        for (const collection of collections) {
            try {
                const col = mongoose.connection.db.collection(collection.name);
                const count = await col.countDocuments({ 
                    $or: [
                        { sessionId: SESSION_ID },
                        { session_id: SESSION_ID },
                        { _id: SESSION_ID }
                    ]
                });
                if (count > 0) {
                    console.log(`   Found ${count} documents in ${collection.name}`);
                    const docs = await col.find({ 
                        $or: [
                            { sessionId: SESSION_ID },
                            { session_id: SESSION_ID },
                            { _id: SESSION_ID }
                        ]
                    }).toArray();
                    docs.forEach((doc, i) => {
                        console.log(`     Document ${i + 1}:`, JSON.stringify(doc, null, 2));
                    });
                }
            } catch (error) {
                // Skip collections that can't be queried
            }
        }

        // Step 7: Test access check methods
        console.log(`\n🔐 Step 7: Testing access check methods:`);
        try {
            const accessResult = await sessionService.checkSessionAccess(SESSION_ID, USER_EMAIL);
            console.log(`   checkSessionAccess result:`, JSON.stringify(accessResult, null, 2));
        } catch (error) {
            console.log(`   checkSessionAccess error:`, error.message);
        }

        try {
            const accessForLeaveResult = await sessionService.checkSessionAccessForLeave(SESSION_ID, USER_EMAIL);
            console.log(`   checkSessionAccessForLeave result:`, JSON.stringify(accessForLeaveResult, null, 2));
        } catch (error) {
            console.log(`   checkSessionAccessForLeave error:`, error.message);
        }

        // Step 8: Attempt the leave operation
        console.log(`\n🚪 Step 8: Attempting leave operation:`);
        try {
            const leaveResult = await sessionService.leaveSession(SESSION_ID, USER_EMAIL);
            console.log(`   Leave result:`, JSON.stringify(leaveResult, null, 2));
        } catch (error) {
            console.log(`   Leave error:`, error.message);
            console.log(`   Full error:`, error);
        }

        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

debugLeaveSession();
