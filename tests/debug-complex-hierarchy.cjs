const { io } = require('socket.io-client');
const fs = require('fs');
const AdmZip = require('adm-zip');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3012';
const SESSION_ID = `debug-hierarchy-${Date.now()}`;

async function createComplexNestedZip() {
  console.log('📦 Creating ZIP with complex nested structure...');
  
  const zip = new AdmZip();
  
  // Create a more complex nested structure to test thoroughly
  zip.addFile("src/components/Button.js", Buffer.from("// Button component"));
  zip.addFile("src/components/Header.js", Buffer.from("// Header component"));
  zip.addFile("src/utils/helpers.js", Buffer.from("// Helper functions"));
  zip.addFile("tests/unit/button.test.js", Buffer.from("// Button tests"));
  zip.addFile("tests/integration/app.test.js", Buffer.from("// App tests"));
  zip.addFile("docs/README.py", Buffer.from("# Documentation"));
  zip.addFile("config.java", Buffer.from("// Root config"));
  
  const zipPath = `/tmp/debug-complex-hierarchy-${Date.now()}.zip`;
  zip.writeZip(zipPath);
  
  console.log('📁 Created ZIP with structure:');
  console.log('  • src/components/Button.js');
  console.log('  • src/components/Header.js');
  console.log('  • src/utils/helpers.js');
  console.log('  • tests/unit/button.test.js');
  console.log('  • tests/integration/app.test.js');
  console.log('  • docs/README.py');
  console.log('  • config.java');
  
  return zipPath;
}

async function uploadAndAnalyze() {
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
        setTimeout(() => resolve(socket), 1000);
      });

      try {
        const zipPath = await createComplexNestedZip();
        
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

function analyzeHierarchyStructure(hierarchy, level = 0) {
  const indent = '  '.repeat(level);
  
  hierarchy.forEach((item) => {
    if (item.type === 'folder') {
      console.log(`${indent}📁 ${item.name}/ (${item.path})`);
      if (item.children && item.children.length > 0) {
        analyzeHierarchyStructure(item.children, level + 1);
      }
    } else {
      console.log(`${indent}📄 ${item.name} (${item.path})`);
    }
  });
}

async function analyzeHierarchy() {
  console.log(`\n🔍 Fetching file hierarchy for session: ${SESSION_ID}`);
  
  const response = await axios.get(`${API_URL}/files/hierarchy?session=${SESSION_ID}`);
  const hierarchy = response.data;
  
  console.log('\n📊 EXPECTED STRUCTURE:');
  console.log('📁 src/');
  console.log('  📁 components/');
  console.log('    📄 Button.js');
  console.log('    📄 Header.js'); 
  console.log('  📁 utils/');
  console.log('    📄 helpers.js');
  console.log('📁 tests/');
  console.log('  📁 unit/');
  console.log('    📄 button.test.js');
  console.log('  📁 integration/');
  console.log('    📄 app.test.js');
  console.log('📁 docs/');
  console.log('  📄 README.py');
  console.log('📄 config.java');
  
  console.log('\n📊 ACTUAL STRUCTURE:');
  analyzeHierarchyStructure(hierarchy);
  
  console.log('\n🔍 DETAILED ANALYSIS:');
  console.log('Raw hierarchy:', JSON.stringify(hierarchy, null, 2));
}

async function main() {
  try {
    console.log('🧪 DEBUG: Complex ZIP Hierarchy Building');
    console.log('=========================================');
    
    const socket = await uploadAndAnalyze();
    await analyzeHierarchy();
    
    socket.disconnect();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
