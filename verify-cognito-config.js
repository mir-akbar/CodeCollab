/**
 * Cognito Configuration Verification Script
 * Verifies that all configuration files are using the correct CodeCollab-Enhanced user pool
 */

// Import configurations
import { env } from './src/config/environment.js';
import { cognitoConfig } from './src/config/cognito.js';

console.log('🔍 Verifying Cognito Configuration...\n');

// Expected values for CodeCollab-Enhanced
const EXPECTED_USER_POOL_ID = 'ap-south-1_NmX1a5CZS';
const EXPECTED_CLIENT_ID = '3qd8ond7s2rqmmbrhqruiurtc';
const EXPECTED_REGION = 'ap-south-1';

// Check frontend environment configuration
console.log('📱 Frontend Configuration:');
console.log(`   User Pool ID: ${env.AWS_COGNITO_USER_POOL_ID}`);
console.log(`   Client ID: ${env.AWS_COGNITO_CLIENT_ID}`);
console.log(`   ✅ Correct User Pool: ${env.AWS_COGNITO_USER_POOL_ID === EXPECTED_USER_POOL_ID ? 'YES' : 'NO'}`);
console.log(`   ✅ Correct Client: ${env.AWS_COGNITO_CLIENT_ID === EXPECTED_CLIENT_ID ? 'YES' : 'NO'}\n`);

// Check cognito.js configuration
console.log('⚙️  Cognito.js Configuration:');
console.log(`   User Pool ID: ${cognitoConfig.UserPoolId || 'Not set (using env vars)'}`);
console.log(`   Client ID: ${cognitoConfig.ClientId || 'Not set (using env vars)'}\n`);

// Check environment variables
console.log('🌍 Environment Variables:');
console.log(`   VITE_AWS_COGNITO_USER_POOL_ID: ${process.env.VITE_AWS_COGNITO_USER_POOL_ID || 'Not set'}`);
console.log(`   VITE_AWS_COGNITO_CLIENT_ID: ${process.env.VITE_AWS_COGNITO_CLIENT_ID || 'Not set'}\n`);

// Summary
const isConfiguredCorrectly = 
  env.AWS_COGNITO_USER_POOL_ID === EXPECTED_USER_POOL_ID &&
  env.AWS_COGNITO_CLIENT_ID === EXPECTED_CLIENT_ID;

console.log('📋 Summary:');
console.log(`   Configuration Status: ${isConfiguredCorrectly ? '✅ CORRECT' : '❌ NEEDS FIXING'}`);
console.log(`   Using: ${isConfiguredCorrectly ? 'CodeCollab-Enhanced' : 'Unknown/Incorrect'} user pool`);

if (isConfiguredCorrectly) {
  console.log('\n🎉 All configurations are properly set for CodeCollab-Enhanced user pool!');
} else {
  console.log('\n⚠️  Configuration mismatch detected. Please check your .env files.');
}
