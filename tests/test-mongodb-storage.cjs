const { io } = require('socket.io-client');
const fs = require('fs');
const AdmZip = require('adm-zip');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3012';
const SESSION_ID = `storage-test-${Date.now()}`;

async function createTestZip() {
  console.log('📦 Creating simple test ZIP...');
  
  const zip = new AdmZip();
  zip.addFile("test.js", Buffer.from("console.log('Hello World');"));
  zip.addFile("folder/nested.py", Buffer.from("print('Nested file')"));
  
  const zipPath = `/tmp/storage-test-${Date.now()}.zip`;
  zip.writeZip(zipPath);
  
  console.log('📁 Created ZIP with:');
  console.log('  • test.js');
  console.log('  • folder/nested.py');
  
  return zipPath;
}

async function uploadAndVerifyStorage() {
  console.log(`\n🔌 Testing storage for session: ${SESSION_ID}`);
  
  const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    query: { sessionId: SESSION_ID }
  });

  return new Promise((resolve, reject) => {
    socket.on('connect', async () => {
      console.log('✅ Socket connected');
      
      let filesProcessed = 0;
      
      socket.on('zipFileProcessed', (data) => {
        filesProcessed++;
        console.log(`📁 File processed: ${filesProcessed}`);
      });
      
      socket.on('zipExtractionComplete', async (data) => {
        console.log('✅ ZIP extraction complete:', data);
        
        // Wait a moment for database writes
        setTimeout(async () => {
          try {
            // Immediately check if files exist via API
            console.log('\n🔍 Checking files via API...');
            const response = await axios.get(`${API_URL}/files/hierarchy?session=${SESSION_ID}`);
            const hierarchy = response.data;
            
            console.log('API Response:', JSON.stringify(hierarchy, null, 2));
            
            resolve({ socket, filesProcessed, hierarchy });
          } catch (error) {
            reject(error);
          }
        }, 2000);
      });

      try {
        const zipPath = await createTestZip();
        
        console.log(`📤 Uploading ZIP...`);
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(zipPath));
        formData.append('sessionID', SESSION_ID);

        await axios.post(`${API_URL}/file-upload/file-upload`, formData, {
          headers: formData.getHeaders()
        });

        fs.unlinkSync(zipPath);
        console.log('✅ Upload completed');
        
      } catch (error) {
        reject(error);
      }
    });

    socket.on('connect_error', reject);
  });
}

async function main() {
  try {
    console.log('🧪 TESTING: MongoDB Storage Verification');
    console.log('========================================');
    
    const { socket, filesProcessed, hierarchy } = await uploadAndVerifyStorage();
    
    console.log(`\n📊 RESULTS:`);
    console.log(`Files processed: ${filesProcessed}`);
    console.log(`API hierarchy items: ${hierarchy.length}`);
    
    if (hierarchy.length > 0) {
      console.log('✅ Files successfully stored and retrievable via API');
    } else {
      console.log('❌ Files not found via API despite processing success');
    }
    
    socket.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
