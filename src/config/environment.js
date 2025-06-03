/**
 * Environment Configuration for Frontend (Vite)
 * Uses import.meta.env instead of process.env for Vite compatibility
 */

// Environment variables with fallbacks
export const env = {
  // AWS Cognito Configuration
  AWS_COGNITO_USER_POOL_ID: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || 'ap-south-1_nwNfcTkOR',
  AWS_COGNITO_CLIENT_ID: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || '2e0ucpfonal3s7e564di3k16pu',
  
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001',
  
  // Environment
  NODE_ENV: import.meta.env.VITE_NODE_ENV || import.meta.env.MODE || 'development',
  
  // Development flags
  IS_DEVELOPMENT: import.meta.env.MODE === 'development',
  IS_PRODUCTION: import.meta.env.MODE === 'production',
};

// Validation function to ensure required environment variables are set
export const validateEnvironment = () => {
  const required = [
    'AWS_COGNITO_USER_POOL_ID',
    'AWS_COGNITO_CLIENT_ID'
  ];
  
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ Environment configuration validated successfully');
  
  if (env.IS_DEVELOPMENT) {
    console.log('🔧 Development mode environment:', {
      API_BASE_URL: env.API_BASE_URL,
      WEBSOCKET_URL: env.WEBSOCKET_URL,
      NODE_ENV: env.NODE_ENV
    });
  }
};

export default env;
