#!/usr/bin/env node

/**
 * YJS Event Handler Fix Verification Test
 * Tests that the event handler removal errors are fixed
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 YJS Event Handler Fix Verification');
console.log('=====================================\n');

// Check 1: Verify SocketIOProvider has proper event handler management
console.log('1. 📁 Checking SocketIOProvider event handler management...');

const providerPath = path.join(__dirname, 'src/components/yjs/SocketIOProvider.jsx');
const providerContent = fs.readFileSync(providerPath, 'utf8');

const providerChecks = {
  'Has destroyed flag': providerContent.includes('this.destroyed = false'),
  'Has handler maps': providerContent.includes('this.yjsHandlers = new Map()') && providerContent.includes('this.socketHandlers = new Map()'),
  'Stores socket handlers': providerContent.includes('this.socketHandlers.set('),
  'Stores YJS handlers': providerContent.includes('this.yjsHandlers.set('),
  'Safe destroy method': providerContent.includes('if (this.destroyed) return'),
  'Try-catch in destroy': providerContent.includes('try {') && providerContent.includes('} catch (error) {') && providerContent.includes('console.warn'),
  'Prevents double cleanup': providerContent.includes('this.destroyed = true'),
  'Uses specific handler refs': providerContent.includes('this.socket.off(event, handler)')
};

let providerPassed = 0;
for (const [check, passed] of Object.entries(providerChecks)) {
  console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  if (passed) providerPassed++;
}

// Check 2: Verify CodeEditorPanel has proper cleanup
console.log('\n2. 🎨 Checking CodeEditorPanel cleanup management...');

const editorPath = path.join(__dirname, 'src/components/CodeEditorPanel.jsx');
const editorContent = fs.readFileSync(editorPath, 'utf8');

const editorChecks = {
  'Has try-catch in cleanup': editorContent.includes('try {') && editorContent.includes('bindingRef.current.destroy()') && editorContent.includes('} catch (error) {'),
  'Logs cleanup process': editorContent.includes('🧹 Cleaning up YJS resources'),
  'Handles destroy errors': editorContent.includes('console.warn') && editorContent.includes('Error destroying'),
  'Nullifies refs after cleanup': editorContent.includes('bindingRef.current = null'),
  'Cleans up in order': editorContent.includes('// Clean up in reverse order'),
  'Prevents null access': editorContent.includes('if (bindingRef.current)') && editorContent.includes('if (providerRef.current)')
};

let editorPassed = 0;
for (const [check, passed] of Object.entries(editorChecks)) {
  console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  if (passed) editorPassed++;
}

// Check 3: Verify no obvious event handler issues
console.log('\n3. 🔍 Checking for potential event handler issues...');

const issueChecks = {
  'No direct off() without refs': !providerContent.includes('.off(\'yjs-update\')') || providerContent.includes('this.socket.off(event, handler)'),
  'No duplicate event setup': (providerContent.match(/\.on\('yjs-update'/g) || []).length <= 2,
  'No missing destroy guards': !providerContent.includes('this.awareness.destroy()') || providerContent.includes('if (this.awareness &&'),
  'Proper awareness cleanup': providerContent.includes('typeof this.awareness.destroy === \'function\'')
};

let issuePassed = 0;
for (const [check, passed] of Object.entries(issueChecks)) {
  console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  if (passed) issuePassed++;
}

// Summary
console.log('\n📊 Fix Verification Summary');
console.log('============================');
console.log(`SocketIOProvider: ${providerPassed}/${Object.keys(providerChecks).length} (${Math.round(providerPassed/Object.keys(providerChecks).length*100)}%)`);
console.log(`CodeEditorPanel: ${editorPassed}/${Object.keys(editorChecks).length} (${Math.round(editorPassed/Object.keys(editorChecks).length*100)}%)`);
console.log(`Issue Prevention: ${issuePassed}/${Object.keys(issueChecks).length} (${Math.round(issuePassed/Object.keys(issueChecks).length*100)}%)`);

const totalPassed = providerPassed + editorPassed + issuePassed;
const totalChecks = Object.keys(providerChecks).length + Object.keys(editorChecks).length + Object.keys(issueChecks).length;

console.log(`\n🎯 Overall: ${totalPassed}/${totalChecks} (${Math.round(totalPassed/totalChecks*100)}%)`);

if (totalPassed === totalChecks) {
  console.log('\n🎉 SUCCESS: All event handler fixes are properly implemented!');
  console.log('\n✅ Expected results:');
  console.log('   - No "[yjs] Tried to remove event handler that doesn\'t exist" errors');
  console.log('   - Clean component mounting/unmounting');
  console.log('   - Proper YJS collaboration functionality');
  console.log('   - No memory leaks from unremoved event handlers');
  console.log('\n🚀 Test the application:');
  console.log('   1. Open multiple browser tabs to the same session');
  console.log('   2. Switch between different files multiple times');
  console.log('   3. Check browser console for any YJS errors');
  console.log('   4. Verify real-time collaboration still works');
} else {
  console.log('\n⚠️  Some fixes may not be complete. Review the failed checks above.');
}

console.log('\n🏁 Verification Complete!');
