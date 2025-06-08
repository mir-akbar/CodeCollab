#!/usr/bin/env node
/**
 * Rollback script for modular session service deployment
 * Generated on: 2025-06-04T10:53:42.264Z
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Rolling back modular session service deployment...');

// Restore environment configuration
const envPath = '/Users/mirakbari/Downloads/CodeLab-main 4/.env';
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /USE_MODULAR_SESSION_SERVICE=true/,
    'USE_MODULAR_SESSION_SERVICE=false'
  );
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment configuration rolled back');
}

console.log('✅ Rollback completed successfully');
console.log('ℹ️  Restart your application to use the monolithic service');
