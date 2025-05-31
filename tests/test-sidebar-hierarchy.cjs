const FormData = require('form-data');
const fs = require('fs');
const archiver = require('archiver');
const { default: fetch } = require('node-fetch');

const API_BASE = 'http://localhost:3012';

async function createTestZipForSidebar() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream('sidebar-test.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log('📦 Created test ZIP for sidebar');
      resolve('sidebar-test.zip');
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Create folders with files to test sidebar display
    const files = {
      'frontend/components/Button.jsx': 'export default function Button() { return <button>Click</button>; }',
      'frontend/components/Header.jsx': 'export default function Header() { return <h1>Header</h1>; }',
      'frontend/pages/Home.jsx': 'export default function Home() { return <div>Home</div>; }',
      'backend/controllers/userController.js': 'exports.getUser = () => {};',
      'backend/routes/auth.js': 'module.exports = router;',
      'tests/unit/button.test.js': 'test("button", () => {});',
      'tests/integration/api.test.js': 'test("api", () => {});',
      'docs/api/README.md': '# API Documentation',
      'config/database.js': 'module.exports = { host: "localhost" };',
      'README.md': '# Project README'
    };

    for (const [filePath, content] of Object.entries(files)) {
      archive.append(content, { name: filePath });
    }

    archive.finalize();
  });
}

async function testSidebarHierarchy() {
  console.log('🧪 TESTING SIDEBAR HIERARCHY DISPLAY');
  console.log('='.repeat(50));

  // Generate a unique session ID for this test
  const sessionId = `sidebar-test-${Date.now()}`;
  
  try {
    // Create test ZIP
    const zipPath = await createTestZipForSidebar();
    
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
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}\n${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload successful:', uploadResult.message);
    console.log(`📁 Files uploaded: ${uploadResult.totalFiles}`);

    // Wait for processing
    console.log('⏳ Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch hierarchy to verify structure
    console.log(`🔍 Fetching hierarchy for session: ${sessionId}`);
    const hierarchyResponse = await fetch(`${API_BASE}/files/hierarchy?session=${sessionId}`);
    
    if (!hierarchyResponse.ok) {
      const errorText = await hierarchyResponse.text();
      throw new Error(`Hierarchy fetch failed: ${hierarchyResponse.status}\n${errorText}`);
    }

    const hierarchy = await hierarchyResponse.json();
    
    // Display the hierarchy structure
    console.log('\n📊 HIERARCHY STRUCTURE FOR SIDEBAR:');
    console.log('='.repeat(50));
    
    function displayStructure(items, indent = '') {
      for (const item of items) {
        const icon = item.type === 'folder' ? '📁' : '📄';
        console.log(`${indent}${icon} ${item.name}${item.type === 'folder' ? '/' : ''}`);
        if (item.children && item.children.length > 0) {
          displayStructure(item.children, indent + '  ');
        }
      }
    }
    
    displayStructure(hierarchy);

    // Provide URL for testing
    console.log('\n🌐 TEST IN BROWSER:');
    console.log('='.repeat(50));
    console.log(`Frontend URL: http://localhost:5177/workspace?session=${sessionId}`);
    console.log('\n📋 TESTING CHECKLIST:');
    console.log('✅ Check if folders appear as collapsible items');
    console.log('✅ Check if files are nested inside their folders');
    console.log('✅ Check if clicking folders expands/collapses them');
    console.log('✅ Check if clicking files opens them in the editor');
    
    // Cleanup
    fs.unlinkSync(zipPath);
    
    console.log('\n🎉 Test setup complete! Open the browser URL to verify sidebar display.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSidebarHierarchy();
