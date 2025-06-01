#!/usr/bin/env node

/**
 * MongoDB Content Duplication Analysis Tool
 * Checks for content duplication issues in stored files
 */

const mongoose = require('mongoose');
const FileStorage = require('./api/models/FileStorage');

async function analyzeContentDuplication() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/code_colab');
    console.log('✅ Connected to MongoDB\n');

    // Get all sessions
    const sessions = await FileStorage.distinct('sessionId');
    console.log(`📊 Found ${sessions.length} sessions in database\n`);

    let totalDuplicationIssues = 0;

    for (const sessionId of sessions.slice(-5)) { // Check last 5 sessions
      console.log(`🔍 ANALYZING SESSION: ${sessionId}`);
      console.log('=' .repeat(60));

      const files = await FileStorage.find({ sessionId }).select({
        fileName: 1,
        filePath: 1,
        fileSize: 1,
        content: 1,
        lastModified: 1
      }).sort({ lastModified: -1 });

      console.log(`Files in session: ${files.length}\n`);

      for (const file of files) {
        try {
          const content = file.content.toString('utf8');
          const duplicationAnalysis = analyzeDuplication(content);
          
          console.log(`📄 File: ${file.fileName} (${file.filePath})`);
          console.log(`   Size: ${file.fileSize} bytes`);
          console.log(`   Lines: ${content.split('\n').length}`);
          
          if (duplicationAnalysis.hasDuplication) {
            console.log(`   ⚠️  DUPLICATION DETECTED:`);
            console.log(`      Repeated lines: ${duplicationAnalysis.duplicatedLines.length}`);
            console.log(`      Examples:`);
            duplicationAnalysis.duplicatedLines.slice(0, 3).forEach(line => {
              console.log(`        "${line.trim().substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
            });
            totalDuplicationIssues++;
          } else {
            console.log(`   ✅ No duplication detected`);
          }
          
          console.log('');
        } catch (error) {
          console.log(`   ❌ Error analyzing file: ${error.message}\n`);
        }
      }

      console.log('-' .repeat(60) + '\n');
    }

    console.log(`📊 SUMMARY:`);
    console.log(`Total files with duplication issues: ${totalDuplicationIssues}`);
    
    if (totalDuplicationIssues > 0) {
      console.log('\n⚠️  RECOMMENDED ACTIONS:');
      console.log('1. Restart the server to apply YJS fixes');
      console.log('2. Test with multiple users in the same session');
      console.log('3. Monitor for new duplication issues');
      console.log('4. Consider running cleanup script for existing duplicated files');
    } else {
      console.log('\n✅ No content duplication issues found!');
    }

  } catch (error) {
    console.error('❌ Error analyzing content duplication:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

function analyzeDuplication(content) {
  const lines = content.split('\n');
  const lineCounts = new Map();
  const duplicatedLines = [];

  // Count occurrences of each non-empty line
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0) {
      const count = lineCounts.get(trimmedLine) || 0;
      lineCounts.set(trimmedLine, count + 1);
    }
  });

  // Find duplicated lines
  lineCounts.forEach((count, line) => {
    if (count > 1) {
      duplicatedLines.push(line);
    }
  });

  // Check for suspicious patterns
  const hasDuplication = duplicatedLines.length > 0;
  const hasIdenticalBlocks = checkForIdenticalBlocks(content);
  
  return {
    hasDuplication: hasDuplication || hasIdenticalBlocks,
    duplicatedLines,
    totalLines: lines.length,
    uniqueLines: lineCounts.size,
    duplicateCount: duplicatedLines.length
  };
}

function checkForIdenticalBlocks(content) {
  // Check for repeated blocks of code (common in YJS duplication)
  const lines = content.split('\n');
  const blockSize = 5; // Check for repeated 5-line blocks
  
  for (let i = 0; i <= lines.length - blockSize * 2; i++) {
    const block1 = lines.slice(i, i + blockSize).join('\n');
    const block2 = lines.slice(i + blockSize, i + blockSize * 2).join('\n');
    
    if (block1 === block2 && block1.trim().length > 0) {
      return true;
    }
  }
  
  return false;
}

// Run the analysis
analyzeContentDuplication();
