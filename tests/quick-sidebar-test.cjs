const FormData = require('form-data');
const fs = require('fs');
const archiver = require('archiver');
const { default: fetch } = require('node-fetch');

const API_BASE = 'http://localhost:3012';

async function quickTest() {
  const sessionId = `quick-${Date.now()}`;
  
  console.log('🧪 Quick Sidebar Test');
  console.log(`Session: ${sessionId}`);
  
  // Create a simple ZIP with folders
  const output = fs.createWriteStream('quick-test.zip');
  const archive = archiver('zip');
  
  archive.pipe(output);
  archive.append('console.log("Hello");', { name: 'src/app.js' });
  archive.append('test("works", () => {});', { name: 'tests/app.test.js' });
  archive.finalize();
  
  await new Promise(resolve => output.on('close', resolve));
  
  // Upload
  const formData = new FormData();
  formData.append('file', fs.createReadStream('quick-test.zip'));
  formData.append('sessionID', sessionId);
  
  const response = await fetch(`${API_BASE}/file-upload/file-upload`, {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  console.log('✅ Upload result:', result.message);
  
  // Wait and check hierarchy
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const hierarchyResponse = await fetch(`${API_BASE}/files/hierarchy?session=${sessionId}`);
  const hierarchy = await hierarchyResponse.json();
  
  console.log('📁 Hierarchy result:');
  hierarchy.forEach(item => {
    console.log(`- ${item.type}: ${item.name} (${item.path})`);
    if (item.children) {
      item.children.forEach(child => {
        console.log(`  - ${child.type}: ${child.name} (${child.path})`);
      });
    }
  });
  
  console.log(`\n🌐 Test URL: http://localhost:5177/workspace?session=${sessionId}`);
  
  // Cleanup
  fs.unlinkSync('quick-test.zip');
}

quickTest().catch(console.error);
