const { io } = require('socket.io-client');
const fs = require('fs');
const AdmZip = require('adm-zip');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3012';
const SESSION_ID = `debug-hierarchy-${Date.now()}`;

async function createSimpleNestedZip() {
  console.log('📦 Creating ZIP with simple nested structure...');
  
  const zip = new AdmZip();
  
  // Create a simple nested structure with allowed file extensions
  zip.addFile("folder1/file1.js", Buffer.from("console.log('Content in folder1');"));
  zip.addFile("folder1/subfolder/file2.py", Buffer.from("print('Content in subfolder')"));
  zip.addFile("root.java", Buffer.from("// Root level file"));
  
  const zipPath = `/tmp/debug-hierarchy-${Date.now()}.zip`;
  zip.writeZip(zipPath);
  
  console.log('📁 Created ZIP with structure:');
  console.log('  • folder1/file1.js');
  console.log('  • folder1/subfolder/file2.py');
  console.log('  • root.java');
  
  return zipPath;
}

async function uploadAndWait() {
  console.log(`\n🔌 Connecting to WebSocket for session: ${SESSION_ID}`);
  
  const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    query: { sessionId: SESSION_ID }
  });

  return new Promise((resolve, reject) => {
    socket.on('connect', async () => {
      console.log('✅ Socket connected');
      
      socket.on('zipExtractionComplete', () => {
        console.log('✅ ZIP extraction complete');
        setTimeout(() => resolve(socket), 1000); // Wait a moment for DB writes
      });

      try {
        const zipPath = await createSimpleNestedZip();
        
        console.log(`📤 Uploading ZIP to session: ${SESSION_ID}`);
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(zipPath));
        formData.append('sessionID', SESSION_ID);

        await axios.post(`${API_URL}/file-upload/file-upload`, formData, {
          headers: formData.getHeaders()
        });

        fs.unlinkSync(zipPath);
        console.log('✅ Upload completed, temporary file cleaned');
        
      } catch (error) {
        reject(error);
      }
    });

    socket.on('connect_error', reject);
  });
}

async function analyzeHierarchy() {
  console.log(`\n🔍 Fetching file hierarchy for session: ${SESSION_ID}`);
  
  const response = await axios.get(`${API_URL}/files/hierarchy?session=${SESSION_ID}`);
  const hierarchy = response.data;
  
  console.log('\n📁 Raw hierarchy structure:');
  console.log(JSON.stringify(hierarchy, null, 2));
  
  console.log('\n🔍 Analysis:');
  hierarchy.forEach((item, index) => {
    if (item.type === 'folder') {
      console.log(`📁 Folder: "${item.name}" (path: ${item.path})`);
      if (item.children) {
        item.children.forEach(child => {
          console.log(`   ${child.type === 'folder' ? '📁' : '📄'} ${child.name} (${child.path})`);
        });
      }
    } else {
      console.log(`📄 File: "${item.name}" (path: ${item.path})`);
    }
  });
}

async function main() {
  try {
    console.log('🧪 DEBUG: ZIP Hierarchy Building');
    console.log('=================================');
    
    const socket = await uploadAndWait();
    await analyzeHierarchy();
    
    socket.disconnect();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
