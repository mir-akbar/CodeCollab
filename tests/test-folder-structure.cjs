#!/usr/bin/env node

const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const io = require('socket.io-client');

// Configuration
const API_URL = 'http://localhost:3012';
const SESSION_ID = 'test-folder-hierarchy-' + Date.now();

async function createTestZipWithFolders() {
  console.log('📦 Creating test ZIP with nested folder structure...');
  
  const zip = new AdmZip();
  
  // Create nested folder structure with files
  zip.addFile("src/components/Button.js", Buffer.from(`
// Button component
export function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}
`));
  
  zip.addFile("src/components/Header.js", Buffer.from(`
// Header component  
export function Header({ title }) {
  return <h1>{title}</h1>;
}
`));
  
  zip.addFile("src/utils/helpers.js", Buffer.from(`
// Helper utilities
export function formatDate(date) {
  return date.toLocaleDateString();
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
`));
  
  zip.addFile("src/styles/main.py", Buffer.from(`
# Python styling utilities
def apply_theme(component, theme):
    """Apply theme to component"""
    return f"{component} with {theme} theme"

def get_default_styles():
    return {
        "color": "#333",
        "background": "#fff"
    }
`));
  
  zip.addFile("tests/unit/button.test.js", Buffer.from(`
// Button unit tests
import { Button } from '../../src/components/Button.js';

describe('Button', () => {
  test('renders correctly', () => {
    // Test implementation
  });
});
`));
  
  zip.addFile("docs/README.py", Buffer.from(`
# Documentation utilities
def generate_docs():
    """Generate documentation"""
    return "Documentation generated successfully"
`));
  
  zip.addFile("config.java", Buffer.from(`
// Root level configuration
public class Config {
    public static final String VERSION = "1.0.0";
    public static final boolean DEBUG = true;
}
`));

  // Add some system files that should be filtered out
  zip.addFile(".DS_Store", Buffer.from("macOS system file"));
  zip.addFile("__MACOSX/src/._Button.js", Buffer.from("macOS metadata"));
  zip.addFile("Thumbs.db", Buffer.from("Windows thumbnail cache"));
  
  const zipPath = `/tmp/test-folder-structure-${Date.now()}.zip`;
  zip.writeZip(zipPath);
  
  console.log('📁 Created ZIP with folder structure:');
  console.log('  • src/components/Button.js');
  console.log('  • src/components/Header.js'); 
  console.log('  • src/utils/helpers.js');
  console.log('  • src/styles/main.py');
  console.log('  • tests/unit/button.test.js');
  console.log('  • docs/README.py');
  console.log('  • config.java (root level)');
  console.log('  • System files (should be filtered)');
  
  return zipPath;
}

async function uploadAndMonitorEvents() {
  console.log(`\n🔌 Setting up WebSocket monitoring for session: ${SESSION_ID}`);
  
  const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    query: { sessionId: SESSION_ID }
  });
  
  const eventsReceived = [];
  const startTime = Date.now();
  
  // Monitor all relevant events
  const eventTypes = [
    'zipUploadStarted',
    'zipProgress', 
    'zipFileProcessed',
    'zipExtractionComplete',
    'sessionFilesUpdated'
  ];
  
  eventTypes.forEach(eventType => {
    socket.on(eventType, (data) => {
      eventsReceived.push({
        type: eventType,
        data: data,
        timestamp: Date.now(),
        relativeTime: Date.now() - startTime
      });
      console.log(`📡 ${eventType}:`, data.message || 'Event received');
    });
  });
  
  await new Promise(resolve => {
    socket.on('connect', () => {
      console.log('✅ Socket connected');
      resolve();
    });
  });
  
  return { socket, eventsReceived, startTime };
}

async function uploadZip(zipPath) {
  console.log(`\n📤 Uploading ZIP to session: ${SESSION_ID}`);
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(zipPath));
  formData.append('sessionID', SESSION_ID);
  formData.append('email', 'test@example.com');
  
  const response = await axios.post(`${API_URL}/file-upload/file-upload`, formData, {
    headers: formData.getHeaders()
  });
  
  console.log('✅ Upload completed successfully');
  return response.data;
}

async function fetchFileHierarchy() {
  console.log(`\n🔍 Fetching file hierarchy for session: ${SESSION_ID}`);
  
  const response = await axios.get(`${API_URL}/files/hierarchy?session=${SESSION_ID}`);
  
  const hierarchy = response.data;
  console.log('📁 File hierarchy retrieved:');
  return hierarchy;
}

function analyzeHierarchy(hierarchy) {
  console.log('\n📊 ANALYSIS: Folder Structure Handling');
  console.log('==========================================');
  
  const folders = hierarchy.filter(item => item.type === 'folder');
  const rootFiles = hierarchy.filter(item => item.type === 'file');
  
  console.log(`📁 Found ${folders.length} folders:`);
  folders.forEach(folder => {
    console.log(`   • ${folder.name} (${folder.children?.length || 0} children)`);
    if (folder.children) {
      folder.children.forEach(child => {
        console.log(`     - ${child.name} (${child.type})`);
      });
    }
  });
  
  console.log(`📄 Found ${rootFiles.length} root-level files:`);
  rootFiles.forEach(file => {
    console.log(`   • ${file.name}`);
  });
  
  // Check expected structure
  const expectedFolders = ['src', 'tests', 'docs'];
  const expectedSubfolders = {
    'src': ['components', 'utils', 'styles'],
    'tests': ['unit']
  };
  
  console.log('\n✅ VERIFICATION:');
  
  // Check if main folders exist
  expectedFolders.forEach(folderName => {
    const found = folders.find(f => f.name === folderName);
    if (found) {
      console.log(`✅ ${folderName}/ folder preserved`);
      
      // Check subfolders for 'src'
      if (folderName === 'src' && expectedSubfolders[folderName]) {
        expectedSubfolders[folderName].forEach(subfolderName => {
          const subfolder = found.children?.find(c => c.name === subfolderName && c.type === 'folder');
          if (subfolder) {
            console.log(`  ✅ ${folderName}/${subfolderName}/ subfolder preserved`);
          } else {
            console.log(`  ❌ ${folderName}/${subfolderName}/ subfolder missing`);
          }
        });
      }
    } else {
      console.log(`❌ ${folderName}/ folder missing`);
    }
  });
  
  // Check if config.java is at root level
  const configFile = rootFiles.find(f => f.name === 'config.java');
  if (configFile) {
    console.log('✅ Root-level file (config.java) preserved');
  } else {
    console.log('❌ Root-level file (config.java) missing');
  }
  
  // Check specific nested files
  const srcFolder = folders.find(f => f.name === 'src');
  if (srcFolder) {
    const componentsFolder = srcFolder.children?.find(c => c.name === 'components');
    if (componentsFolder) {
      const buttonFile = componentsFolder.children?.find(c => c.name === 'Button.js');
      const headerFile = componentsFolder.children?.find(c => c.name === 'Header.js');
      
      console.log(`${buttonFile ? '✅' : '❌'} src/components/Button.js preserved`);
      console.log(`${headerFile ? '✅' : '❌'} src/components/Header.js preserved`);
    }
  }
  
  return {
    totalFolders: folders.length,
    totalFiles: rootFiles.length + folders.reduce((acc, f) => acc + (f.children?.length || 0), 0),
    hierarchyPreserved: folders.length >= 3, // At least src, tests, docs
    rootFilesPreserved: rootFiles.length >= 1 // At least config.java
  };
}

async function cleanup(zipPath, socket) {
  console.log('\n🧹 Cleaning up...');
  
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
    console.log('✅ Temporary ZIP file deleted');
  }
  
  if (socket) {
    socket.disconnect();
    console.log('✅ Socket disconnected');
  }
}

async function main() {
  let zipPath, socket;
  
  try {
    console.log('🧪 TESTING: ZIP Folder Structure Handling');
    console.log('==========================================');
    
    // Create test ZIP with nested folder structure
    zipPath = await createTestZipWithFolders();
    
    // Setup monitoring
    const { socket: sock, eventsReceived } = await uploadAndMonitorEvents();
    socket = sock;
    
    // Upload the ZIP
    await uploadZip(zipPath);
    
    // Wait for processing to complete
    console.log('\n⏳ Waiting for ZIP processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Fetch and analyze hierarchy
    const hierarchy = await fetchFileHierarchy();
    const analysis = analyzeHierarchy(hierarchy);
    
    // Final summary
    console.log('\n🎯 FINAL RESULTS:');
    console.log('================');
    console.log(`📁 Total folders: ${analysis.totalFolders}`);
    console.log(`📄 Total files: ${analysis.totalFiles}`);
    console.log(`🗂️  Hierarchy preserved: ${analysis.hierarchyPreserved ? 'YES' : 'NO'}`);
    console.log(`📄 Root files preserved: ${analysis.rootFilesPreserved ? 'YES' : 'NO'}`);
    
    if (analysis.hierarchyPreserved && analysis.rootFilesPreserved) {
      console.log('\n🎉 SUCCESS: Folder structure handling works correctly!');
      return true;
    } else {
      console.log('\n❌ ISSUES: Folder structure handling needs improvement');
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    return false;
  } finally {
    await cleanup(zipPath, socket);
  }
}

// Run the test
if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { main };
