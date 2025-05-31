const FormData = require('form-data');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const API_BASE = 'http://localhost:3012';

async function createTestZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream('final-test.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log('📦 Created ZIP file with nested structure');
      resolve('final-test.zip');
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Create a comprehensive folder structure
    const files = {
      'src/components/Button.jsx': 'export default function Button() { return <button>Click me</button>; }',
      'src/components/Header.jsx': 'export default function Header() { return <h1>Header</h1>; }',
      'src/utils/helpers.js': 'export function helper() { return "helper"; }',
      'src/hooks/useAuth.js': 'export function useAuth() { return { user: null }; }',
      'tests/unit/button.test.js': 'test("button works", () => {});',
      'tests/integration/app.test.js': 'test("app works", () => {});',
      'tests/e2e/full.test.js': 'test("e2e works", () => {});',
      'docs/API.md': '# API Documentation',
      'docs/setup/README.md': '# Setup Guide',
      'config/database.js': 'module.exports = { host: "localhost" };',
      'public/assets/logo.png': 'fake png content',
      'README.md': '# Project README'
    };

    for (const [filePath, content] of Object.entries(files)) {
      archive.append(content, { name: filePath });
    }

    archive.finalize();
  });
}

async function testFinalZipUpload() {
  console.log('🧪 FINAL ZIP UPLOAD TEST');
  console.log('='.repeat(50));

  const sessionId = `final-test-${Date.now()}`;
  
  // Connect to WebSocket for real-time updates
  console.log(`🔌 Connecting to WebSocket for session: ${sessionId}`);
  const ws = new WebSocket(`ws://localhost:3012?sessionId=${sessionId}`);
  
  await new Promise((resolve) => {
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      resolve();
    });
  });

  // Listen for file processing events
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log(`📁 WebSocket Event: ${message.type}`, message.data);
  });

  try {
    // Create test ZIP
    const zipPath = await createTestZip();
    
    // Upload ZIP
    console.log(`📤 Uploading ZIP to session: ${sessionId}`);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(zipPath));
    formData.append('sessionID', sessionId);

    const uploadResponse = await fetch(`${API_BASE}/file-upload/file-upload`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload Response:', uploadResult);

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch hierarchy
    console.log(`🔍 Fetching file hierarchy for session: ${sessionId}`);
    const hierarchyResponse = await fetch(`${API_BASE}/files/hierarchy?sessionId=${sessionId}`);
    
    if (!hierarchyResponse.ok) {
      throw new Error(`Hierarchy fetch failed: ${hierarchyResponse.status}`);
    }

    const hierarchy = await hierarchyResponse.json();
    
    // Display results
    console.log('\n📊 FINAL RESULTS:');
    console.log('='.repeat(50));
    console.log('📁 FOLDER STRUCTURE:');
    
    function displayHierarchy(items, indent = '') {
      for (const item of items) {
        const icon = item.type === 'folder' ? '📁' : '📄';
        console.log(`${indent}${icon} ${item.name}${item.type === 'folder' ? '/' : ''} (${item.path})`);
        if (item.children && item.children.length > 0) {
          displayHierarchy(item.children, indent + '  ');
        }
      }
    }
    
    displayHierarchy(hierarchy);
    
    // Analyze structure
    console.log('\n🔍 STRUCTURE ANALYSIS:');
    console.log('='.repeat(50));
    
    const totalFolders = countItems(hierarchy, 'folder');
    const totalFiles = countItems(hierarchy, 'file');
    const maxDepth = calculateMaxDepth(hierarchy);
    
    console.log(`📁 Total folders: ${totalFolders}`);
    console.log(`📄 Total files: ${totalFiles}`);
    console.log(`📏 Maximum depth: ${maxDepth}`);
    
    // Verify specific folder structure
    console.log('\n✅ VERIFICATION:');
    console.log('='.repeat(50));
    
    const srcFolder = hierarchy.find(item => item.name === 'src' && item.type === 'folder');
    if (srcFolder) {
      console.log('✅ src/ folder found with children:');
      srcFolder.children.forEach(child => {
        console.log(`   - ${child.name} (${child.type})`);
      });
    } else {
      console.log('❌ src/ folder not found');
    }
    
    const testsFolder = hierarchy.find(item => item.name === 'tests' && item.type === 'folder');
    if (testsFolder) {
      console.log('✅ tests/ folder found with children:');
      testsFolder.children.forEach(child => {
        console.log(`   - ${child.name} (${child.type})`);
      });
    } else {
      console.log('❌ tests/ folder not found');
    }

    // Cleanup
    fs.unlinkSync(zipPath);
    ws.close();
    
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    ws.close();
  }
}

function countItems(items, type) {
  let count = 0;
  for (const item of items) {
    if (item.type === type) count++;
    if (item.children) {
      count += countItems(item.children, type);
    }
  }
  return count;
}

function calculateMaxDepth(items, currentDepth = 1) {
  let maxDepth = currentDepth;
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      maxDepth = Math.max(maxDepth, calculateMaxDepth(item.children, currentDepth + 1));
    }
  }
  return maxDepth;
}

testFinalZipUpload();
