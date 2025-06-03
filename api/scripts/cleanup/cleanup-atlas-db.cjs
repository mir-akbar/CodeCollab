/**
 * MongoDB Atlas Database Cleanup Script
 * 
 * This script provides various cleanup options for the Atlas database:
 * - Clean test/debug sessions
 * - Remove orphaned participants
 * - Clear old file storage records
 * - Reset database to clean state
 * 
 * Usage:
 *   node cleanup-atlas-db.cjs --all                    # Clean everything
 *   node cleanup-atlas-db.cjs --sessions               # Clean test sessions only
 *   node cleanup-atlas-db.cjs --participants           # Clean orphaned participants
 *   node cleanup-atlas-db.cjs --files                  # Clean old files
 *   node cleanup-atlas-db.cjs --messages               # Clean chat messages
 *   node cleanup-atlas-db.cjs --reset                  # Complete reset (DANGEROUS)
 *   node cleanup-atlas-db.cjs --dry-run --all          # Preview what would be deleted
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const { connectDB } = require('./config/database');

// Import models
const Session = require('./models/Session');
const SessionParticipant = require('./models/SessionParticipant');
const SessionManagement = require('./models/SessionManagement');
const FileStorage = require('./models/FileStorage');
const Message = require('./models/Message');

class AtlasDBCleaner {
    constructor(options = {}) {
        this.dryRun = options.dryRun || false;
        this.verbose = options.verbose || false;
        this.stats = {
            sessions: { deleted: 0, kept: 0 },
            participants: { deleted: 0, kept: 0 },
            files: { deleted: 0, kept: 0 },
            messages: { deleted: 0, kept: 0 },
            legacy: { deleted: 0, kept: 0 }
        };
    }

    async connect() {
        try {
            await connectDB();
            console.log('✅ Connected to MongoDB Atlas');
            
            // Verify we're connected to the right database
            const dbName = mongoose.connection.db.databaseName;
            console.log(`📍 Database: ${dbName}`);
            
            if (!dbName.includes('colab') && !dbName.includes('codelab')) {
                console.warn('⚠️  Warning: Database name doesn\'t contain "colab" - are you sure this is correct?');
                console.log('🛑 Stopping for safety. Please verify database connection.');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Failed to connect to Atlas:', error.message);
            process.exit(1);
        }
    }

    async cleanSessions(options = {}) {
        console.log('\n🧹 Cleaning Sessions...');
        
        const filter = {};
        
        // Add filters based on options
        if (options.testOnly) {
            filter.$or = [
                { name: /test/i },
                { name: /debug/i },
                { description: /test/i },
                { description: /debug/i }
            ];
        }
        
        if (options.oldSessions) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filter.createdAt = { $lt: oneWeekAgo };
        }

        const sessions = await Session.find(filter);
        console.log(`📊 Found ${sessions.length} sessions to process`);

        if (this.verbose) {
            sessions.forEach(session => {
                console.log(`   - "${session.name}" (${session.sessionId}) - ${session.creator}`);
            });
        }

        if (!this.dryRun && sessions.length > 0) {
            const result = await Session.deleteMany(filter);
            this.stats.sessions.deleted = result.deletedCount;
            console.log(`✅ Deleted ${result.deletedCount} sessions`);
        } else {
            this.stats.sessions.deleted = sessions.length;
            console.log(`📋 Would delete ${sessions.length} sessions (dry run)`);
        }
    }

    async cleanParticipants(options = {}) {
        console.log('\n🧹 Cleaning Participants...');
        
        // Find orphaned participants (participants without corresponding sessions)
        const allParticipants = await SessionParticipant.find({});
        const orphanedParticipants = [];
        
        for (const participant of allParticipants) {
            const sessionExists = await Session.findOne({ sessionId: participant.sessionId });
            if (!sessionExists) {
                orphanedParticipants.push(participant);
            }
        }
        
        console.log(`📊 Found ${orphanedParticipants.length} orphaned participants`);
        
        // Also find participants that left sessions
        const leftParticipants = await SessionParticipant.find({ status: 'left' });
        console.log(`📊 Found ${leftParticipants.length} participants who left sessions`);

        if (this.verbose) {
            orphanedParticipants.forEach(p => {
                console.log(`   - Orphaned: ${p.userEmail} in ${p.sessionId}`);
            });
            leftParticipants.forEach(p => {
                console.log(`   - Left: ${p.userEmail} in ${p.sessionId}`);
            });
        }

        const totalToDelete = orphanedParticipants.length + (options.includeLeft ? leftParticipants.length : 0);

        if (!this.dryRun && totalToDelete > 0) {
            let deletedCount = 0;
            
            if (orphanedParticipants.length > 0) {
                const orphanedIds = orphanedParticipants.map(p => p._id);
                const result1 = await SessionParticipant.deleteMany({ _id: { $in: orphanedIds } });
                deletedCount += result1.deletedCount;
            }
            
            if (options.includeLeft && leftParticipants.length > 0) {
                const result2 = await SessionParticipant.deleteMany({ status: 'left' });
                deletedCount += result2.deletedCount;
            }
            
            this.stats.participants.deleted = deletedCount;
            console.log(`✅ Deleted ${deletedCount} participant records`);
        } else {
            this.stats.participants.deleted = totalToDelete;
            console.log(`📋 Would delete ${totalToDelete} participant records (dry run)`);
        }
    }

    async cleanFiles(options = {}) {
        console.log('\n🧹 Cleaning File Storage...');
        
        const filter = {};
        
        if (options.oldFiles) {
            const oneMonthAgo = new Date();
            oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
            filter.createdAt = { $lt: oneMonthAgo };
        }

        const files = await FileStorage.find(filter);
        console.log(`📊 Found ${files.length} file records to process`);

        if (this.verbose && files.length < 20) {
            files.forEach(file => {
                console.log(`   - ${file.filename} (${file.sessionId}) - ${file.uploadedBy}`);
            });
        }

        if (!this.dryRun && files.length > 0) {
            const result = await FileStorage.deleteMany(filter);
            this.stats.files.deleted = result.deletedCount;
            console.log(`✅ Deleted ${result.deletedCount} file records`);
        } else {
            this.stats.files.deleted = files.length;
            console.log(`📋 Would delete ${files.length} file records (dry run)`);
        }
    }

    async cleanMessages(options = {}) {
        console.log('\n🧹 Cleaning Chat Messages...');
        
        const filter = {};
        
        if (options.oldMessages) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filter.timestamp = { $lt: oneWeekAgo };
        }

        const messages = await Message.find(filter);
        console.log(`📊 Found ${messages.length} messages to process`);

        if (!this.dryRun && messages.length > 0) {
            const result = await Message.deleteMany(filter);
            this.stats.messages.deleted = result.deletedCount;
            console.log(`✅ Deleted ${result.deletedCount} messages`);
        } else {
            this.stats.messages.deleted = messages.length;
            console.log(`📋 Would delete ${messages.length} messages (dry run)`);
        }
    }

    async cleanLegacyData() {
        console.log('\n🧹 Cleaning Legacy Session Data...');
        
        const legacySessions = await SessionManagement.find({});
        console.log(`📊 Found ${legacySessions.length} legacy session records`);

        if (this.verbose && legacySessions.length < 20) {
            legacySessions.forEach(session => {
                console.log(`   - "${session.sessionName}" (${session.sessionId}) - ${session.createdBy}`);
            });
        }

        if (!this.dryRun && legacySessions.length > 0) {
            const result = await SessionManagement.deleteMany({});
            this.stats.legacy.deleted = result.deletedCount;
            console.log(`✅ Deleted ${result.deletedCount} legacy session records`);
        } else {
            this.stats.legacy.deleted = legacySessions.length;
            console.log(`📋 Would delete ${legacySessions.length} legacy session records (dry run)`);
        }
    }

    async getCollectionStats() {
        console.log('\n📊 Current Database Statistics:');
        
        const collections = [
            { name: 'sessions', model: Session },
            { name: 'session_participants', model: SessionParticipant },
            { name: 'session_managements', model: SessionManagement },
            { name: 'file_storages', model: FileStorage },
            { name: 'messages', model: Message }
        ];

        for (const collection of collections) {
            try {
                const count = await collection.model.countDocuments();
                console.log(`   ${collection.name}: ${count} documents`);
            } catch (error) {
                console.log(`   ${collection.name}: Error counting (${error.message})`);
            }
        }
    }

    async printSummary() {
        console.log('\n📋 Cleanup Summary:');
        console.log('================================');
        Object.entries(this.stats).forEach(([collection, stats]) => {
            if (stats.deleted > 0) {
                console.log(`${collection.padEnd(15)}: ${stats.deleted} deleted`);
            }
        });
        
        const totalDeleted = Object.values(this.stats).reduce((sum, stats) => sum + stats.deleted, 0);
        console.log('================================');
        console.log(`Total deleted: ${totalDeleted} records`);
        
        if (this.dryRun) {
            console.log('\n💡 This was a dry run. Use --execute to actually delete the data.');
        }
    }

    async close() {
        await mongoose.connection.close();
        console.log('\n🔗 Database connection closed');
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        execute: args.includes('--execute'),
        all: args.includes('--all'),
        sessions: args.includes('--sessions'),
        participants: args.includes('--participants'),
        files: args.includes('--files'),
        messages: args.includes('--messages'),
        legacy: args.includes('--legacy'),
        reset: args.includes('--reset'),
        help: args.includes('--help') || args.includes('-h')
    };

    // If --execute is not specified, default to dry run
    if (!options.execute) {
        options.dryRun = true;
    }

    return options;
}

function printHelp() {
    console.log(`
MongoDB Atlas Database Cleanup Script

Usage:
  node cleanup-atlas-db.cjs [options]

Options:
  --all                    Clean everything (sessions, participants, files, messages)
  --sessions               Clean test/debug sessions only
  --participants           Clean orphaned participants
  --files                  Clean old file storage records
  --messages               Clean chat messages
  --legacy                 Clean legacy session management data
  --reset                  Complete reset (DANGEROUS - deletes everything)
  
  --dry-run               Preview what would be deleted (default if --execute not specified)
  --execute               Actually perform the deletion
  --verbose, -v           Show detailed information
  --help, -h              Show this help message

Examples:
  node cleanup-atlas-db.cjs --all --dry-run          # Preview complete cleanup
  node cleanup-atlas-db.cjs --sessions --execute     # Delete test sessions
  node cleanup-atlas-db.cjs --participants --execute # Clean orphaned participants
  node cleanup-atlas-db.cjs --reset --execute        # DANGER: Delete everything

Safety:
  - By default, the script runs in dry-run mode
  - Use --execute to actually delete data
  - The script will verify database name before proceeding
  - Legacy data cleanup preserves active sessions
`);
}

// Main execution
async function main() {
    const options = parseArgs();

    if (options.help) {
        printHelp();
        return;
    }

    console.log('🧹 MongoDB Atlas Database Cleanup Script');
    console.log('=========================================');
    
    if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No data will be deleted');
    } else {
        console.log('⚠️  EXECUTION MODE - Data WILL be deleted');
    }

    const cleaner = new AtlasDBCleaner({
        dryRun: options.dryRun,
        verbose: options.verbose
    });

    try {
        await cleaner.connect();
        await cleaner.getCollectionStats();

        if (options.reset) {
            console.log('\n🚨 RESET MODE - This will delete ALL data!');
            if (!options.dryRun) {
                console.log('⏳ Waiting 5 seconds... Press Ctrl+C to cancel');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            await cleaner.cleanSessions();
            await cleaner.cleanParticipants({ includeLeft: true });
            await cleaner.cleanFiles();
            await cleaner.cleanMessages();
            await cleaner.cleanLegacyData();
        } else {
            if (options.all || options.sessions) {
                await cleaner.cleanSessions({ testOnly: !options.all, oldSessions: options.all });
            }
            
            if (options.all || options.participants) {
                await cleaner.cleanParticipants({ includeLeft: options.all });
            }
            
            if (options.all || options.files) {
                await cleaner.cleanFiles({ oldFiles: options.all });
            }
            
            if (options.all || options.messages) {
                await cleaner.cleanMessages({ oldMessages: options.all });
            }
            
            if (options.all || options.legacy) {
                await cleaner.cleanLegacyData();
            }
        }

        if (!options.sessions && !options.participants && !options.files && !options.messages && !options.legacy && !options.all && !options.reset) {
            console.log('\n💡 No cleanup options specified. Use --help to see available options.');
            console.log('💡 To clean everything safely, use: --all --dry-run');
        }

        await cleaner.printSummary();
        
    } catch (error) {
        console.error('💥 Cleanup failed:', error.message);
        if (options.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        await cleaner.close();
    }
}

// Run the script
main().catch(console.error);
