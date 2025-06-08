/**
 * Environment Configuration for Backend (Node.js/Express)
 * Handles environment variable loading with fallbacks and validation
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
const loadEnvironmentVariables = () => {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('📁 Loading environment variables from .env file');
    require('dotenv').config({ path: envPath });
  } else {
    console.log('⚠️  .env file not found, using system environment variables only');
  }
};

// Initialize environment loading
loadEnvironmentVariables();

// Environment configuration with fallbacks
const config = {
  // MongoDB Configuration - Enhanced with Atlas + Local support
  MONGODB_ATLAS_URI: process.env.MONGODB_ATLAS_URI,
  MONGODB_LOCAL_URI: process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/code_colab',
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/code_colab',
  DB_NAME: process.env.DB_NAME || 'code_colab',
  
  // Server Configuration
  PORT: parseInt(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Security Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-in-production',
  JWT_ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
  JWT_REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  
  // Session Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'development-session-secret-change-in-production',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || 'localhost',
  COOKIE_SECURE: process.env.NODE_ENV === 'production',
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || 'lax',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // AWS Cognito Configuration (CodeCollab-enhanced)
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  COGNITO_REGION: process.env.COGNITO_REGION || 'ap-south-1',
  
  // Development flags
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

// Validation function for required environment variables
const validateEnvironment = () => {
  // At least one MongoDB URI should be available (local fallback always exists)
  const hasConnection = config.MONGODB_ATLAS_URI || config.MONGODB_LOCAL_URI;
  
  if (!hasConnection) {
    console.error('❌ No MongoDB connection available');
    throw new Error('No MongoDB connection URI available');
  }
  
  console.log('✅ Backend environment configuration validated successfully');
  
  if (config.IS_DEVELOPMENT) {
    console.log('🔧 Development mode configuration:', {
      PORT: config.PORT,
      DB_NAME: config.DB_NAME,
      NODE_ENV: config.NODE_ENV,
      HAS_ATLAS: !!config.MONGODB_ATLAS_URI,
      HAS_LOCAL: !!config.MONGODB_LOCAL_URI,
      FALLBACK_STRATEGY: 'Atlas → Local'
    });
  }
  
  return true;
};

// Export configuration
module.exports = {
  config,
  validateEnvironment,
  loadEnvironmentVariables
};
