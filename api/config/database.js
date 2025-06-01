// Shared database configuration for all scripts and services
// Uses environment variables to avoid exposing credentials

const mongoose = require('mongoose');
const { config } = require('./environment');

// Connect to MongoDB with proper error handling
const connectDB = async (options = {}) => {
    try {
        const uri = config.MONGODB_URI;
        
        // Modern connection options (removed deprecated options)
        const defaultOptions = {
            dbName: config.DB_NAME,
            ...options
        };
        
        console.log('🔗 Connecting to MongoDB...');
        console.log(`📍 Database: ${config.DB_NAME}`);
        
        await mongoose.connect(uri, defaultOptions);
        console.log('✅ MongoDB connection successful');
        
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
};

// Disconnect from MongoDB
const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
};

module.exports = {
    connectDB,
    disconnectDB,
    getMongoUri: () => config.MONGODB_URI
};