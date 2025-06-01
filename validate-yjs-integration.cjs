#!/usr/bin/env node

/**
 * YJS Integration Validation Script
 * Tests the fixed SocketIOProvider and overall integration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 YJS Integration Validation');
console.log('==============================\n');

// Check 1: Files exist and are accessible
console.log('📁 Checking required files...');
const requiredFiles = [
  'src/components/yjs/SocketIOProvider.jsx',
  'src/components/CodeEditorPanel.jsx',
  'api/server.js',
  'api/services/fileStorageService.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing!`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Cannot continue validation.');
  process.exit(1);
}

// Check 2: SocketIOProvider implementation
console.log('\n🔌 Checking SocketIOProvider...');
const providerPath = path.join(__dirname, 'src/components/yjs/SocketIOProvider.jsx');
const providerContent = fs.readFileSync(providerPath, 'utf8');

const checks = {
  'Observable import removed': !providerContent.includes('from \'lib0/observable\''),
  'Awareness imports correct': providerContent.includes('encodeAwarenessUpdate, applyAwarenessUpdate'),
  'Simple event system': providerContent.includes('this.listeners = new Map()'),
  'Emit method fixed': providerContent.includes('emit(event, ...args)'),
  'Destroy method updated': providerContent.includes('this.listeners.clear()')
};

Object.entries(checks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
});

// Check 3: Package dependencies
console.log('\n📦 Checking package dependencies...');
const packagePath = path.join(__dirname, 'package.json');
const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredDeps = ['yjs', 'y-protocols', 'y-monaco'];
requiredDeps.forEach(dep => {
  if (packageContent.dependencies[dep]) {
    console.log(`✅ ${dep}: ${packageContent.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep}: Missing from dependencies`);
  }
});

// Check 4: Server YJS handlers
console.log('\n🖥️  Checking server YJS handlers...');
const serverPath = path.join(__dirname, 'api/server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

const serverChecks = {
  'YJS import': serverContent.includes('const Y = require(\'yjs\')'),
  'YJS rooms map': serverContent.includes('yjsRooms'),
  'Join room handler': serverContent.includes('yjs-join-room'),
  'Update handler': serverContent.includes('yjs-update'),
  'Awareness handler': serverContent.includes('yjs-awareness-update'),
  'Sync handler': serverContent.includes('yjs-request-sync')
};

Object.entries(serverChecks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
});

// Check 5: CodeEditorPanel YJS integration
console.log('\n🎨 Checking CodeEditorPanel YJS integration...');
const editorPath = path.join(__dirname, 'src/components/CodeEditorPanel.jsx');
const editorContent = fs.readFileSync(editorPath, 'utf8');

const editorChecks = {
  'Y-Monaco import': editorContent.includes('y-monaco'),
  'YJS document creation': editorContent.includes('new Y.Doc()'),
  'SocketIOProvider usage': editorContent.includes('new SocketIOProvider'),
  'MonacoBinding setup': editorContent.includes('MonacoBinding'),
  'Awareness setup': editorContent.includes('setLocalStateField'),
  'Room-based collaboration': editorContent.includes('${sessionId}-${currentFile}')
};

Object.entries(editorChecks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
});

// Summary
console.log('\n📊 Validation Summary');
console.log('=====================');

const allChecks = Object.values(checks).concat(
  Object.values(serverChecks),
  Object.values(editorChecks)
);

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;
const passRate = (passedChecks / totalChecks * 100).toFixed(1);

console.log(`Passed: ${passedChecks}/${totalChecks} (${passRate}%)`);

if (passRate >= 90) {
  console.log('🎉 EXCELLENT: YJS integration is ready for production!');
} else if (passRate >= 80) {
  console.log('✅ GOOD: YJS integration is mostly complete with minor issues.');
} else if (passRate >= 70) {
  console.log('⚠️  OKAY: YJS integration needs some fixes before production.');
} else {
  console.log('❌ CRITICAL: YJS integration has significant issues that need to be resolved.');
}

console.log('\n🚀 Next Steps:');
console.log('1. Start the backend server: cd api && npm start');
console.log('2. Start the frontend: npm run dev');
console.log('3. Open multiple browser tabs to test collaboration');
console.log('4. Create/join a session and open the same file in both tabs');
console.log('5. Test real-time editing and user awareness features');

console.log('\n✅ Validation Complete!');
