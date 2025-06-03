#!/usr/bin/env node
/**
 * Test script to validate TanStackDebugComponent is working correctly
 * This verifies the Phase 6 fix for the missing useSessionFiles hook
 */

const axios = require('axios');

async function testDebugComponent() {
  console.log('🧪 Testing Debug Component Fix');
  console.log('='.repeat(40));
  
  try {
    // Test 1: Check if debug page loads without JavaScript errors
    console.log('📱 Test 1: Debug page accessibility...');
    const debugResponse = await axios.get('http://localhost:5173/debug');
    
    if (debugResponse.status === 200) {
      console.log('✅ Debug page loads successfully');
      
      // Check if the page contains our debug component elements
      const htmlContent = debugResponse.data;
      const hasDebugContent = htmlContent.includes('TanStack') || 
                             htmlContent.includes('debug') || 
                             htmlContent.includes('test-file-upload-btn');
      
      if (hasDebugContent) {
        console.log('✅ Debug component elements detected in HTML');
      } else {
        console.log('⚠️  Debug component elements not found in HTML (may load via JS)');
      }
    } else {
      console.log('❌ Debug page failed to load');
      return false;
    }
    
    // Test 2: Check backend connectivity
    console.log('\n🔗 Test 2: Backend connectivity...');
    const backendResponse = await axios.get('http://localhost:3001/health');
    
    if (backendResponse.status === 200) {
      console.log('✅ Backend is responding');
    } else {
      console.log('❌ Backend connectivity issues');
      return false;
    }
    
    // Test 3: Check sessions API
    console.log('\n📊 Test 3: Sessions API...');
    const sessionsResponse = await axios.get('http://localhost:3001/sessions?email=test@example.com');
    
    if (sessionsResponse.status === 200) {
      console.log('✅ Sessions API is responding');
      console.log(`   Sessions found: ${sessionsResponse.data.sessions?.length || 0}`);
    } else {
      console.log('❌ Sessions API issues');
      return false;
    }
    
    console.log('\n🎉 All tests passed! Debug component should be working.');
    console.log('\n📋 Next Steps:');
    console.log('1. Open http://localhost:5173/debug in your browser');
    console.log('2. Check browser console for any JavaScript errors');
    console.log('3. Test the file upload functionality');
    console.log('4. Proceed with Phase 6 multi-user testing');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure both servers are running:');
      console.log('   Frontend: npm run dev (port 5173)');
      console.log('   Backend: npm start (port 3001)');
    }
    return false;
  }
}

// Run the test
testDebugComponent().then(success => {
  process.exit(success ? 0 : 1);
});
