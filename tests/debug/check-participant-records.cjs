/**
 * Direct database check for participant records
 */
require('dotenv').config({ path: '../../api/.env' });
const mongoose = require('mongoose');
const SessionParticipant = require('../../api/models/SessionParticipant');

const SESSION_ID = 'e9cf5f5d-375c-4845-b65a-68390117053d';
const USER_EMAIL = 'ssbjs742@gmail.com';

async function checkParticipantRecords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab');
        console.log('🔗 Connected to MongoDB');

        console.log(`\n🔍 Checking participant records for:`);
        console.log(`   Session: ${SESSION_ID}`);
        console.log(`   User: ${USER_EMAIL}`);

        // Find all participant records for this user-session combination
        const participants = await SessionParticipant.find({
            sessionId: SESSION_ID,
            userEmail: USER_EMAIL
        }).sort({ createdAt: 1 });

        console.log(`\n📊 Found ${participants.length} participant record(s):`);
        
        participants.forEach((p, i) => {
            console.log(`\n${i + 1}. Record ID: ${p._id}`);
            console.log(`   Status: ${p.status}`);
            console.log(`   Role: ${p.role}`);
            console.log(`   Created: ${p.createdAt}`);
            console.log(`   Left At: ${p.leftAt || 'N/A'}`);
            console.log(`   Updated: ${p.updatedAt || 'N/A'}`);
        });

        // Now let's try to manually update the record to 'left' and see what happens
        if (participants.length > 0) {
            console.log(`\n🔧 Attempting manual status update...`);
            const participant = participants[0]; // Use the first/oldest record
            
            console.log(`   Before update: status = ${participant.status}`);
            
            participant.status = 'left';
            participant.leftAt = new Date();
            await participant.save();
            
            console.log(`   After update: status = ${participant.status}`);
            
            // Verify the update by refetching
            const updated = await SessionParticipant.findById(participant._id);
            console.log(`   Database verification: status = ${updated.status}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

checkParticipantRecords();
