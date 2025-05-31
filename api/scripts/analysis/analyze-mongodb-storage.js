const mongoose = require('mongoose');
const FileStorage = require('./models/FileStorage');

async function analyzeMongoDBStorage() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/code_colab');
    console.log('✅ Connected to MongoDB\n');

    // Get all recent sessions (last 10 sessions)
    console.log('📊 RECENT SESSIONS:');
    const recentSessions = await FileStorage.distinct('sessionId');
    const limitedSessions = recentSessions.slice(-10); // Get last 10
    console.log(`Found ${limitedSessions.length} recent sessions:`);
    limitedSessions.forEach((sessionId, index) => {
      console.log(`  ${index + 1}. ${sessionId}`);
    });

    if (limitedSessions.length === 0) {
      console.log('❌ No sessions found in database');
      return;
    }

    // Analyze the most recent session
    const latestSession = limitedSessions[limitedSessions.length - 1];
    console.log(`\n🔍 ANALYZING LATEST SESSION: ${latestSession}`);
    
    const files = await FileStorage.find({ sessionId: latestSession }).select({
      fileName: 1,
      filePath: 1,
      fileType: 1,
      fileSize: 1,
      parentFolder: 1,
      mimeType: 1,
      isCompressed: 1,
      createdAt: 1
    }).sort({ filePath: 1 });

    console.log(`\n📁 FILES IN SESSION (${files.length} total):`);
    files.forEach((file, index) => {
      const pathParts = file.filePath.split('/');
      const depth = pathParts.length - 1;
      const indent = '  '.repeat(depth);
      const compressed = file.isCompressed ? ' 🗜️' : '';
      const parent = file.parentFolder ? ` (parent: ${file.parentFolder})` : '';
      
      console.log(`${indent}📄 ${file.fileName} (${file.fileType})${compressed}`);
      console.log(`${indent}   Path: ${file.filePath}`);
      console.log(`${indent}   Size: ${file.fileSize} bytes | MIME: ${file.mimeType}${parent}`);
      console.log('');
    });

    // Analyze folder structure
    console.log('\n📁 FOLDER STRUCTURE ANALYSIS:');
    const folderMap = new Map();
    
    files.forEach(file => {
      const pathParts = file.filePath.split('/');
      
      // Create folder entries for each level
      for (let i = 1; i < pathParts.length; i++) {
        const folderPath = pathParts.slice(0, i).join('/');
        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, {
            path: folderPath,
            name: pathParts[i - 1],
            depth: i - 1,
            files: []
          });
        }
      }
      
      // Add file to its parent folder
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/');
        if (folderMap.has(parentPath)) {
          folderMap.get(parentPath).files.push(file.fileName);
        }
      }
    });

    // Display folder hierarchy
    const sortedFolders = Array.from(folderMap.values()).sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.path.localeCompare(b.path);
    });

    sortedFolders.forEach(folder => {
      const indent = '  '.repeat(folder.depth);
      console.log(`${indent}📁 ${folder.name}/ (${folder.path})`);
      folder.files.forEach(fileName => {
        console.log(`${indent}  📄 ${fileName}`);
      });
    });

    // Check for root files
    const rootFiles = files.filter(file => !file.filePath.includes('/'));
    if (rootFiles.length > 0) {
      console.log('\n📄 ROOT LEVEL FILES:');
      rootFiles.forEach(file => {
        console.log(`  📄 ${file.fileName} (${file.fileType})`);
      });
    }

    // Storage efficiency analysis
    console.log('\n💾 STORAGE ANALYSIS:');
    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    const compressedFiles = files.filter(file => file.isCompressed);
    
    console.log(`Total files: ${files.length}`);
    console.log(`Total size: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`);
    console.log(`Compressed files: ${compressedFiles.length}/${files.length}`);
    console.log(`Unique folders: ${folderMap.size}`);
    console.log(`Max depth: ${Math.max(...Array.from(folderMap.values()).map(f => f.depth), 0)}`);

    // Verify file paths are stored correctly
    console.log('\n✅ VERIFICATION:');
    const hasNestedFolders = Array.from(folderMap.values()).some(f => f.depth > 0);
    const hasProperPaths = files.every(file => file.filePath && file.fileName);
    const hasTypeInfo = files.every(file => file.fileType && file.mimeType);
    
    console.log(`Nested folder structure: ${hasNestedFolders ? '✅' : '❌'}`);
    console.log(`Proper file paths: ${hasProperPaths ? '✅' : '❌'}`);
    console.log(`File type metadata: ${hasTypeInfo ? '✅' : '❌'}`);
    console.log(`Parent folder tracking: ${files.some(f => f.parentFolder) ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Error analyzing MongoDB storage:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

analyzeMongoDBStorage();
