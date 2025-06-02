#!/usr/bin/env node

/**
 * Simple duplication analysis script
 * Checks for content duplication in YJS documents
 */

const mongoose = require('mongoose');

// MongoDB connection
const mongoUri = 'mongodb://localhost:27017/codelab';

// File schema (simplified)
const fileSchema = new mongoose.Schema({
    fileName: String,
    filePath: String,
    content: String,
    yjsDocument: mongoose.Schema.Types.Buffer,
    sessionId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'files' });

const File = mongoose.model('File', fileSchema);

async function analyzeDuplication() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        console.log('📊 Analyzing files for content duplication...\n');

        // Get all files
        const files = await File.find({}).sort({ updatedAt: -1 }).limit(20);
        
        console.log(`Found ${files.length} files to analyze:\n`);

        for (const file of files) {
            const content = file.content || '';
            const contentLength = content.length;
            const yjsSize = file.yjsDocument ? file.yjsDocument.length : 0;
            
            console.log(`📄 File: ${file.fileName || 'unnamed'}`);
            console.log(`   Session: ${file.sessionId || 'no-session'}`);
            console.log(`   Content Length: ${contentLength} chars`);
            console.log(`   YJS Document Size: ${yjsSize} bytes`);
            console.log(`   Last Updated: ${file.updatedAt}`);
            
            // Simple duplication check - look for repeated patterns
            if (contentLength > 0) {
                const lines = content.split('\n');
                const uniqueLines = new Set(lines);
                const duplicateRatio = (lines.length - uniqueLines.size) / lines.length;
                
                if (duplicateRatio > 0.3) {
                    console.log(`   ⚠️  High duplication ratio: ${(duplicateRatio * 100).toFixed(1)}%`);
                }
                
                // Check for obvious duplication patterns
                const suspiciousPatterns = [
                    'function test()',
                    'console.log',
                    'const ',
                    'import '
                ];
                
                for (const pattern of suspiciousPatterns) {
                    const matches = content.match(new RegExp(pattern, 'g'));
                    if (matches && matches.length > 5) {
                        console.log(`   🔍 Pattern "${pattern}" appears ${matches.length} times`);
                    }
                }
            }
            
            console.log('');
        }

        console.log('📈 Analysis complete!');
        
    } catch (error) {
        console.error('❌ Error during analysis:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

analyzeDuplication();
