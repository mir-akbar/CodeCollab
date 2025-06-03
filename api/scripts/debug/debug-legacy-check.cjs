/**
 * Check legacy SessionManagement collection
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SessionManagement = require('./models/SessionManagement');

const USER_EMAIL = 'ssbjs742@gmail.com';

async function checkLegacyRecords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab');
        console.log('🔗 Connected to MongoDB');

        // Check legacy SessionManagement collection
        console.log('\n📋 Checking Legacy SessionManagement collection:');
        
        const legacySessions = await SessionManagement.find({
            $or: [
                { createdBy: USER_EMAIL },
                { 'collaborators.email': USER_EMAIL }
            ]
        });
        
        console.log(`Found ${legacySessions.length} legacy session(s):`);
        legacySessions.forEach((s, i) => {
            console.log(`\n${i + 1}. Session ID: ${s.sessionId}`);
            console.log(`   Name: ${s.sessionName || 'N/A'}`);
            console.log(`   Created By: ${s.createdBy}`);
            console.log(`   Collaborators: ${s.collaborators?.length || 0}`);
            
            if (s.collaborators && s.collaborators.length > 0) {
                s.collaborators.forEach((collab, j) => {
                    console.log(`     ${j + 1}. ${collab.email} (${collab.accessLevel || 'N/A'})`);
                });
            }
        });

        // Check all legacy sessions to find the one we're looking for
        console.log('\n🔍 All legacy sessions:');
        const allLegacy = await SessionManagement.find({}).sort({ createdAt: -1 }).limit(10);
        allLegacy.forEach((s, i) => {
            console.log(`  ${i + 1}. "${s.sessionName || 'Unnamed'}" (${s.sessionId}) - Creator: ${s.createdBy}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

checkLegacyRecords();
