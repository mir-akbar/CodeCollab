const { connectDB, disconnectDB } = require('../../config/database');
const FileStorage = require('../../models/FileStorage');

async function debugSidebar() {
    try {
        await connectDB();

        const sessionId = '2cba80bb-bce4-4d46-961d-d37e7e836f49';
        
        // Check what files exist for this session
        const files = await FileStorage.find({ sessionId }).sort({ createdAt: -1 });
        
        console.log(`\n🔍 Files for session ${sessionId}:`);
        console.log(`   Total files: ${files.length}`);
        
        if (files.length > 0) {
            files.forEach((file, index) => {
                console.log(`\n   File ${index + 1}:`);
                console.log(`     Name: ${file.fileName}`);
                console.log(`     Path: ${file.filePath}`);
                console.log(`     Type: ${file.fileType}`);
                console.log(`     Size: ${file.fileSize} bytes`);
                console.log(`     Created: ${file.createdAt}`);
                console.log(`     Session: ${file.sessionId}`);
            });
            
            // Test the API format transformation
            console.log('\n📡 API Response Format:');
            const apiResponse = files.map(file => ({
                name: file.fileName,
                type: file.fileType.replace('.', ''),
                path: file.filePath,
                size: file.fileSize
            }));
            
            console.log(JSON.stringify(apiResponse, null, 2));
        } else {
            console.log('   ❌ No files found for this session');
        }
        
        // Check all recent sessions to see if files are in different sessions
        console.log('\n🔍 Checking recent sessions...');
        const recentSessions = await FileStorage.distinct('sessionId', {
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });
        
        console.log(`   Found ${recentSessions.length} recent sessions:`);
        for (const session of recentSessions) {
            const sessionFiles = await FileStorage.countDocuments({ sessionId: session });
            console.log(`     ${session}: ${sessionFiles} files`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await disconnectDB();
    }
}

debugSidebar();
