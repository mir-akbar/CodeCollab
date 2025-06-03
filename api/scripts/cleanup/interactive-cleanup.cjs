/**
 * Interactive MongoDB Atlas Database Cleanup Script
 * 
 * This script provides an interactive menu for cleaning the Atlas database safely.
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const readline = require('readline');
const { connectDB } = require('./config/database');

// Import models
const Session = require('./models/Session');
const SessionParticipant = require('./models/SessionParticipant');
const SessionManagement = require('./models/SessionManagement');
const FileStorage = require('./models/FileStorage');
const Message = require('./models/Message');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

class InteractiveDBCleaner {
    async connect() {
        try {
            await connectDB();
            console.log('✅ Connected to MongoDB Atlas');
            
            const dbName = mongoose.connection.db.databaseName;
            console.log(`📍 Database: ${dbName}`);
            
            if (!dbName.includes('colab') && !dbName.includes('codelab')) {
                console.warn('⚠️  Warning: Database name doesn\'t contain "colab"');
                const confirm = await question('Are you sure you want to continue? (yes/no): ');
                if (confirm.toLowerCase() !== 'yes') {
                    console.log('🛑 Cleanup cancelled for safety');
                    process.exit(0);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to connect to Atlas:', error.message);
            process.exit(1);
        }
    }

    async showStats() {
        console.log('\n📊 Current Database Statistics:');
        console.log('================================');
        
        const collections = [
            { name: 'Sessions', model: Session },
            { name: 'Participants', model: SessionParticipant },
            { name: 'Legacy Sessions', model: SessionManagement },
            { name: 'File Storage', model: FileStorage },
            { name: 'Messages', model: Message }
        ];

        for (const collection of collections) {
            try {
                const count = await collection.model.countDocuments();
                console.log(`${collection.name.padEnd(20)}: ${count} documents`);
            } catch (error) {
                console.log(`${collection.name.padEnd(20)}: Error (${error.message})`);
            }
        }
    }

    async showMainMenu() {
        console.log('\n🧹 Atlas Database Cleanup Options:');
        console.log('===================================');
        console.log('1. View database statistics');
        console.log('2. Clean test/debug sessions');
        console.log('3. Clean orphaned participants');
        console.log('4. Clean old files (30+ days)');
        console.log('5. Clean old messages (7+ days)');
        console.log('6. Clean legacy session data');
        console.log('7. Custom cleanup...');
        console.log('8. DANGER: Complete reset');
        console.log('9. Exit');
        
        const choice = await question('\nSelect an option (1-9): ');
        return choice;
    }

    async cleanTestSessions() {
        console.log('\n🔍 Finding test/debug sessions...');
        
        const testSessions = await Session.find({
            $or: [
                { name: /test/i },
                { name: /debug/i },
                { description: /test/i },
                { description: /debug/i },
                { name: /sample/i }
            ]
        });

        if (testSessions.length === 0) {
            console.log('✅ No test sessions found');
            return;
        }

        console.log(`\n📋 Found ${testSessions.length} test sessions:`);
        testSessions.forEach((session, i) => {
            console.log(`  ${i + 1}. "${session.name}" - Created by ${session.creator}`);
        });

        const confirm = await question(`\nDelete these ${testSessions.length} sessions? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
            const sessionIds = testSessions.map(s => s.sessionId);
            
            // Delete sessions
            const sessionResult = await Session.deleteMany({
                sessionId: { $in: sessionIds }
            });
            
            // Delete related participants
            const participantResult = await SessionParticipant.deleteMany({
                sessionId: { $in: sessionIds }
            });

            console.log(`✅ Deleted ${sessionResult.deletedCount} sessions`);
            console.log(`✅ Deleted ${participantResult.deletedCount} participant records`);
        } else {
            console.log('❌ Cleanup cancelled');
        }
    }

    async cleanOrphanedParticipants() {
        console.log('\n🔍 Finding orphaned participants...');
        
        const allParticipants = await SessionParticipant.find({});
        const orphanedParticipants = [];
        
        for (const participant of allParticipants) {
            const sessionExists = await Session.findOne({ sessionId: participant.sessionId });
            if (!sessionExists) {
                orphanedParticipants.push(participant);
            }
        }

        const leftParticipants = await SessionParticipant.find({ status: 'left' });

        console.log(`\n📋 Found:`);
        console.log(`  - ${orphanedParticipants.length} orphaned participants`);
        console.log(`  - ${leftParticipants.length} participants who left sessions`);

        if (orphanedParticipants.length === 0 && leftParticipants.length === 0) {
            console.log('✅ No orphaned participants found');
            return;
        }

        console.log('\nCleanup options:');
        console.log('1. Delete only orphaned participants');
        console.log('2. Delete only participants who left');
        console.log('3. Delete both');
        console.log('4. Cancel');

        const choice = await question('Select option (1-4): ');
        let deletedCount = 0;

        switch (choice) {
            case '1':
                if (orphanedParticipants.length > 0) {
                    const orphanedIds = orphanedParticipants.map(p => p._id);
                    const result = await SessionParticipant.deleteMany({ _id: { $in: orphanedIds } });
                    deletedCount = result.deletedCount;
                }
                break;
            case '2':
                if (leftParticipants.length > 0) {
                    const result = await SessionParticipant.deleteMany({ status: 'left' });
                    deletedCount = result.deletedCount;
                }
                break;
            case '3':
                if (orphanedParticipants.length > 0) {
                    const orphanedIds = orphanedParticipants.map(p => p._id);
                    const result1 = await SessionParticipant.deleteMany({ _id: { $in: orphanedIds } });
                    deletedCount += result1.deletedCount;
                }
                if (leftParticipants.length > 0) {
                    const result2 = await SessionParticipant.deleteMany({ status: 'left' });
                    deletedCount += result2.deletedCount;
                }
                break;
            default:
                console.log('❌ Cleanup cancelled');
                return;
        }

        console.log(`✅ Deleted ${deletedCount} participant records`);
    }

    async cleanOldFiles() {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

        const oldFiles = await FileStorage.find({
            createdAt: { $lt: oneMonthAgo }
        });

        if (oldFiles.length === 0) {
            console.log('✅ No old files found (30+ days)');
            return;
        }

        console.log(`\n📋 Found ${oldFiles.length} files older than 30 days`);
        
        const confirm = await question(`Delete these ${oldFiles.length} old files? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
            const result = await FileStorage.deleteMany({
                createdAt: { $lt: oneMonthAgo }
            });
            console.log(`✅ Deleted ${result.deletedCount} file records`);
        } else {
            console.log('❌ Cleanup cancelled');
        }
    }

    async cleanOldMessages() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const oldMessages = await Message.find({
            timestamp: { $lt: oneWeekAgo }
        });

        if (oldMessages.length === 0) {
            console.log('✅ No old messages found (7+ days)');
            return;
        }

        console.log(`\n📋 Found ${oldMessages.length} messages older than 7 days`);
        
        const confirm = await question(`Delete these ${oldMessages.length} old messages? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
            const result = await Message.deleteMany({
                timestamp: { $lt: oneWeekAgo }
            });
            console.log(`✅ Deleted ${result.deletedCount} messages`);
        } else {
            console.log('❌ Cleanup cancelled');
        }
    }

    async cleanLegacyData() {
        const legacySessions = await SessionManagement.find({});

        if (legacySessions.length === 0) {
            console.log('✅ No legacy session data found');
            return;
        }

        console.log(`\n📋 Found ${legacySessions.length} legacy session records`);
        
        const confirm = await question(`Delete these ${legacySessions.length} legacy records? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
            const result = await SessionManagement.deleteMany({});
            console.log(`✅ Deleted ${result.deletedCount} legacy session records`);
        } else {
            console.log('❌ Cleanup cancelled');
        }
    }

    async completeReset() {
        console.log('\n🚨 DANGER: COMPLETE DATABASE RESET');
        console.log('===================================');
        console.log('This will delete ALL data:');
        console.log('- All sessions');
        console.log('- All participants');
        console.log('- All files');
        console.log('- All messages');
        console.log('- All legacy data');
        
        const confirm1 = await question('\nType "DELETE ALL DATA" to confirm: ');
        if (confirm1 !== 'DELETE ALL DATA') {
            console.log('❌ Reset cancelled');
            return;
        }

        const confirm2 = await question('Are you absolutely sure? (yes/no): ');
        if (confirm2.toLowerCase() !== 'yes') {
            console.log('❌ Reset cancelled');
            return;
        }

        console.log('\n🗑️  Deleting all data...');
        
        const results = {};
        results.sessions = await Session.deleteMany({});
        results.participants = await SessionParticipant.deleteMany({});
        results.files = await FileStorage.deleteMany({});
        results.messages = await Message.deleteMany({});
        results.legacy = await SessionManagement.deleteMany({});

        console.log('\n✅ Database reset complete:');
        console.log(`   Sessions: ${results.sessions.deletedCount} deleted`);
        console.log(`   Participants: ${results.participants.deletedCount} deleted`);
        console.log(`   Files: ${results.files.deletedCount} deleted`);
        console.log(`   Messages: ${results.messages.deletedCount} deleted`);
        console.log(`   Legacy: ${results.legacy.deletedCount} deleted`);
    }

    async close() {
        rl.close();
        await mongoose.connection.close();
        console.log('\n🔗 Database connection closed');
    }
}

async function main() {
    console.log('🧹 Interactive MongoDB Atlas Database Cleanup');
    console.log('==============================================');

    const cleaner = new InteractiveDBCleaner();
    
    try {
        await cleaner.connect();
        
        while (true) {
            const choice = await cleaner.showMainMenu();
            
            switch (choice) {
                case '1':
                    await cleaner.showStats();
                    break;
                case '2':
                    await cleaner.cleanTestSessions();
                    break;
                case '3':
                    await cleaner.cleanOrphanedParticipants();
                    break;
                case '4':
                    await cleaner.cleanOldFiles();
                    break;
                case '5':
                    await cleaner.cleanOldMessages();
                    break;
                case '6':
                    await cleaner.cleanLegacyData();
                    break;
                case '7':
                    console.log('💡 Use the command-line version for custom cleanup options');
                    console.log('   node cleanup-atlas-db.cjs --help');
                    break;
                case '8':
                    await cleaner.completeReset();
                    break;
                case '9':
                    console.log('👋 Goodbye!');
                    await cleaner.close();
                    return;
                default:
                    console.log('❌ Invalid option. Please select 1-9.');
                    break;
            }
            
            await question('\nPress Enter to continue...');
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);
