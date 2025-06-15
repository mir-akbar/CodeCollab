/**
 * Unified Environment Configuration for Frontend
 * Consolidates all environment variables and constants in one place
 */

// Environment variables - no hardcoded fallbacks for security in production
export const env = {
  // AWS Cognito Configuration - REQUIRED
  AWS_COGNITO_USER_POOL_ID: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID,
  AWS_COGNITO_CLIENT_ID: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID,
  AWS_REGION: import.meta.env.VITE_AWS_REGION,
  
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  WEBSOCKET_URL: import.meta.env.VITE_WS_URL || import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001',
  
  // TURN Server Configuration (Optional - for video calling)
  TURN_SERVER_URL: import.meta.env.VITE_TURN_SERVER_URL,
  TURN_SERVER_URL_BACKUP: import.meta.env.VITE_TURN_SERVER_URL_BACKUP,
  TURN_USERNAME: import.meta.env.VITE_TURN_USERNAME,
  TURN_PASSWORD: import.meta.env.VITE_TURN_PASSWORD,
  
  // Environment
  NODE_ENV: import.meta.env.VITE_NODE_ENV || import.meta.env.MODE || 'development',
  
  // Development flags
  IS_DEVELOPMENT: import.meta.env.MODE === 'development',
  IS_PRODUCTION: import.meta.env.MODE === 'production',
};

// Named exports for convenience
export const API_URL = env.API_BASE_URL;
export const WEB_SOCKET_API_URL = env.WEBSOCKET_URL;

// Validation function to ensure required environment variables are set
export const validateEnvironment = () => {
  const required = [
    { key: 'AWS_COGNITO_USER_POOL_ID', envVar: 'VITE_AWS_COGNITO_USER_POOL_ID' },
    { key: 'AWS_COGNITO_CLIENT_ID', envVar: 'VITE_AWS_COGNITO_CLIENT_ID' },
    { key: 'AWS_REGION', envVar: 'VITE_AWS_REGION' }
  ];
  
  const missing = required.filter(({ key }) => !env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(({ key, envVar }) => {
      console.error(`  - ${envVar} (accessed as env.${key})`);
    });
    console.error('💡 Make sure your .env file contains these variables with proper values');
    throw new Error(`Missing required environment variables: ${missing.map(m => m.envVar).join(', ')}`);
  }
  
  console.log('✅ Environment configuration validated successfully');
  
  if (env.IS_DEVELOPMENT) {
    console.log('🔧 Development mode environment:', {
      API_BASE_URL: env.API_BASE_URL,
      WEBSOCKET_URL: env.WEBSOCKET_URL,
      NODE_ENV: env.NODE_ENV,
      COGNITO_CONFIGURED: !!env.AWS_COGNITO_USER_POOL_ID && !!env.AWS_COGNITO_CLIENT_ID
    });
  }
};

export default env;
