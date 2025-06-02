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
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
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
