#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Verifying Cognito Configuration...\n');

const files = [
  '.env',
  '.env.local',
  'api/.env'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`📁 ${file}:`);
    
    // Extract Cognito config
    const userPoolMatch = content.match(/(?:VITE_)?(?:AWS_)?COGNITO_USER_POOL_ID=(.+)/);
    const clientIdMatch = content.match(/(?:VITE_)?(?:AWS_)?COGNITO_CLIENT_ID=(.+)/);
    
    if (userPoolMatch) console.log(`   User Pool ID: ${userPoolMatch[1].trim()}`);
    if (clientIdMatch) console.log(`   Client ID: ${clientIdMatch[1].trim()}`);
    
    console.log('');
  }
});

// Expected values
console.log('✅ Expected Configuration (CodeCollab-Enhanced):');
console.log('   User Pool ID: ap-south-1_NmX1a5CZS');
console.log('   Client ID: 3qd8ond7s2rqmmbrhqruiurtc');
