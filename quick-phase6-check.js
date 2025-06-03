#!/usr/bin/env node

/**
 * Phase 6 Quick System Check
 * Simple validation of core system components
 */

import axios from 'axios';

const CLIENT_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

async function runQuickCheck() {
  console.log('🧪 Phase 6 Quick System Check');
  console.log('=' .repeat(40));

  const results = [];

  // Test 1: Frontend accessible
  try {
    const response = await axios.get(CLIENT_URL, { timeout: 5000 });
    console.log('✅ Frontend accessible (status:', response.status, ')');
    results.push(true);
  } catch (error) {
    console.log('❌ Frontend not accessible:', error.message);
    results.push(false);
  }

  // Test 2: Backend health check
  try {
    const response = await axios.get(`${API_URL}/session/health`, { timeout: 5000 });
    console.log('✅ Backend healthy (status:', response.status, ')');
    results.push(true);
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    results.push(false);
  }

  // Test 3: Sessions API
  try {
    const response = await axios.get(`${API_URL}/sessions`, {
      params: { email: 'test@example.com' },
      timeout: 5000
    });
    console.log('✅ Sessions API responding (status:', response.status, ')');
    console.log('   Sessions found:', response.data.sessions?.length || 0);
    results.push(true);
  } catch (error) {
    console.log('❌ Sessions API failed:', error.response?.status, error.message);
    results.push(false);
  }

  // Test 4: Debug interface check
  try {
    const response = await axios.get(`${CLIENT_URL}/debug`, { timeout: 5000 });
    console.log('✅ Debug interface accessible');
    results.push(true);
  } catch (error) {
    console.log('❌ Debug interface not accessible:', error.message);
    results.push(false);
  }

  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Results:', passed, '/', total, 'tests passed');
  
  if (passed === total) {
    console.log('🎉 System ready for Phase 6 testing!');
    console.log('📋 Next: Open multiple browsers to http://localhost:5173/debug');
  } else {
    console.log('⚠️ System needs attention before Phase 6 testing');
  }
}

runQuickCheck().catch(console.error);
