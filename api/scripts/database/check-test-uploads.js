const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../../config/database');
const FileStorage = require('../../models/FileStorage');

async function checkTestSessionUploads() {
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('✅ Connected to MongoDB');

        // Find files from recent test sessions
        const recentTestFiles = await FileStorage.find({
            sessionId: { $regex: /^test_session_/ }
        }).sort({ createdAt: -1 }).limit(20);

        console.log(`\n🔍 Found ${recentTestFiles.length} files from test sessions:`);

        if (recentTestFiles.length === 0) {
            console.log('❌ No test session files found');
        } else {
            recentTestFiles.forEach((file, index) => {
                console.log(`\nFile ${index + 1}:`);
                console.log(`  ID: ${file._id}`);
                console.log(`  Session: ${file.sessionId}`);
                console.log(`  Name: ${file.fileName}`);
                console.log(`  Type: ${file.fileType}`);
                console.log(`  Path: ${file.filePath}`);
                console.log(`  Size: ${file.fileSize} bytes`);
                console.log(`  Created: ${file.createdAt}`);
                console.log(`  Content Preview: ${file.content ? file.content.toString().substring(0, 100) + (file.content.length > 100 ? '...' : '') : 'No content'}`);
                console.log('  ---');
            });
        }

        // Also check total files and recent activity
        const totalFiles = await FileStorage.countDocuments();
        console.log(`\n📊 Total files in database: ${totalFiles}`);

        // Check very recent uploads (last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentFiles = await FileStorage.find({
            createdAt: { $gte: fiveMinutesAgo }
        }).sort({ createdAt: -1 });

        console.log(`\n⏰ Files uploaded in last 5 minutes: ${recentFiles.length}`);
        recentFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.fileName} (Session: ${file.sessionId}) - ${file.createdAt}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await disconnectDB();
        console.log('🔒 Database connection closed');
    }
}

checkTestSessionUploads();
