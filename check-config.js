/**
 * Simple Cognito Configuration Check
 */

import 'dotenv/config';

console.log('🔍 Checking Cognito Configuration...\n');

// Expected values for CodeCollab-Enhanced
const EXPECTED_USER_POOL_ID = 'ap-south-1_NmX1a5CZS';
const EXPECTED_CLIENT_ID = '3qd8ond7s2rqmmbrhqruiurtc';

console.log('📋 Current Configuration:');
console.log(`Frontend User Pool ID: ${process.env.VITE_AWS_COGNITO_USER_POOL_ID || 'Not set'}`);
console.log(`Frontend Client ID: ${process.env.VITE_AWS_COGNITO_CLIENT_ID || 'Not set'}`);
console.log(`Backend User Pool ID: ${process.env.COGNITO_USER_POOL_ID || 'Not set'}`);
console.log(`Backend Client ID: ${process.env.COGNITO_CLIENT_ID || 'Not set'}`);
console.log(`Backend Region: ${process.env.COGNITO_REGION || 'Not set'}\n`);

// Verification
const frontendCorrect = process.env.VITE_AWS_COGNITO_USER_POOL_ID === EXPECTED_USER_POOL_ID;
const backendCorrect = process.env.COGNITO_USER_POOL_ID === EXPECTED_USER_POOL_ID;

console.log('✅ Verification Results:');
console.log(`Frontend Configuration: ${frontendCorrect ? 'CORRECT ✅' : 'INCORRECT ❌'}`);
console.log(`Backend Configuration: ${backendCorrect ? 'CORRECT ✅' : 'INCORRECT ❌'}`);

if (frontendCorrect && backendCorrect) {
  console.log('\n🎉 SUCCESS: All configurations are using CodeCollab-Enhanced user pool!');
} else {
  console.log('\n⚠️  Some configurations may need attention.');
}
