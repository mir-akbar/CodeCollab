const fs = require('fs');
const path = require('path');

// Check if our debug component file exists and has the correct structure
const debugPath = path.join(process.cwd(), 'src/components/debug/TanStackDebugComponent.jsx');
if (fs.existsSync(debugPath)) {
  const content = fs.readFileSync(debugPath, 'utf8');
  console.log('✅ Debug component file exists');
  console.log('📊 File size:', content.length, 'characters');
  
  // Check for key imports and usage
  const hasFileManager = content.includes('useFileManager');
  const hasSessionActions = content.includes('useSessionActions');
  const hasCorrectUsage = content.includes('fileManager.isUploading');
  
  console.log('🔍 Key features check:');
  console.log('  useFileManager import:', hasFileManager ? '✅' : '❌');
  console.log('  useSessionActions import:', hasSessionActions ? '✅' : '❌');
  console.log('  Correct API usage:', hasCorrectUsage ? '✅' : '❌');
  
  if (hasFileManager && hasSessionActions && hasCorrectUsage) {
    console.log('🎉 Debug component appears to be correctly fixed!');
  } else {
    console.log('⚠️  Some issues may remain in the debug component');
  }
} else {
  console.log('❌ Debug component file not found');
}
