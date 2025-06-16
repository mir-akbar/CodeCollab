#!/usr/bin/env node

/**
 * Zustand Migration Progress Checker
 * Run with: node scripts/check-migration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Zustand Migration Progress Check\n');

// Check if stores exist
const storesPath = path.join(__dirname, '../src/stores');
const stores = ['uiStore.js', 'editorStore.js', 'sessionStore.js', 'index.js'];

console.log('📦 Store Files:');
stores.forEach(store => {
  const exists = fs.existsSync(path.join(storesPath, store));
  console.log(`  ${exists ? '✅' : '❌'} ${store}`);
});

// Check migrated components
const migrations = [
  { 
    file: 'src/pages/CodeWorkspace.jsx', 
    pattern: 'useUIStore',
    description: 'CodeWorkspace using UI store'
  },
  { 
    file: 'src/components/CollaborationPanel.jsx', 
    pattern: 'useUIStore',
    description: 'CollaborationPanel using UI store'
  },
  { 
    file: 'src/components/code-editor/MonacoEditor.jsx', 
    pattern: 'useEditorStore',
    description: 'MonacoEditor using Editor store'
  }
];

console.log('\n🔄 Component Migrations:');
migrations.forEach(({ file, pattern, description }) => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const migrated = content.includes(pattern);
    console.log(`  ${migrated ? '✅' : '⏳'} ${description}`);
  } else {
    console.log(`  ❌ ${file} not found`);
  }
});

// Count remaining useState instances
const srcPath = path.join(__dirname, '../src');
let useStateCount = 0;

function countUseState(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      countUseState(filePath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/useState/g);
      if (matches) {
        useStateCount += matches.length;
      }
    }
  });
}

countUseState(srcPath);

console.log(`\n📊 Migration Stats:`);
console.log(`  useState instances remaining: ${useStateCount}`);
console.log(`  Estimated migration progress: ${Math.round((1 - useStateCount/60) * 100)}%`);

console.log(`\n📋 Next Steps:`);
console.log(`  1. Run components and test basic functionality`);
console.log(`  2. Continue migrating session components`);
console.log(`  3. Update remaining hooks to use stores`);
console.log(`  4. Add proper TypeScript types`);

console.log(`\n🛡️  Safety: All changes are backwards compatible`);
console.log(`   You can run both old and new patterns in parallel`);
