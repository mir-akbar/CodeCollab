// Shared database configuration for all scripts and services
// Uses environment variables to avoid exposing credentials

const mongoose = require('mongoose');
const { config } = require('./environment');

// Enhanced connection with Atlas fallback to Local
const connectDB = async (options = {}) => {
    const atlasUri = config.MONGODB_ATLAS_URI;
    const localUri = config.MONGODB_LOCAL_URI;
    
    // Modern connection options (removed deprecated options)
    const defaultOptions = {
        dbName: config.DB_NAME,
        serverSelectionTimeoutMS: 5000, // 5 second timeout for faster fallback
        ...options
    };
    
    // Try Atlas first if available
    if (atlasUri && atlasUri !== 'undefined') {
        try {
            console.log('🔗 Attempting MongoDB Atlas connection...');
            console.log(`📍 Database: ${config.DB_NAME}`);
            
            await mongoose.connect(atlasUri, defaultOptions);
            console.log('✅ MongoDB Atlas connection successful');
            console.log('🌍 Using MongoDB Atlas (Cloud)');
            
            return mongoose.connection;
        } catch (error) {
            console.log('⚠️  MongoDB Atlas connection failed:', error.message);
            console.log('🔄 Falling back to local MongoDB...');
        }
    }
    
    // Fallback to local MongoDB
    try {
        console.log('🔗 Connecting to local MongoDB...');
        console.log(`📍 Database: ${config.DB_NAME}`);
        
        await mongoose.connect(localUri, defaultOptions);
        console.log('✅ Local MongoDB connection successful');
        console.log('🏠 Using Local MongoDB');
        
        return mongoose.connection;
    } catch (error) {
        console.error('❌ Both Atlas and Local MongoDB connections failed');
        console.error('❌ Atlas error: Failed to connect');
        console.error('❌ Local error:', error.message);
        console.error('💡 Please ensure MongoDB is installed and running locally, or fix Atlas credentials');
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

// Get current connection info
const getConnectionInfo = () => {
    if (mongoose.connection.readyState === 1) {
        const host = mongoose.connection.host;
        const isAtlas = host && host.includes('mongodb.net');
        return {
            connected: true,
            type: isAtlas ? 'Atlas (Cloud)' : 'Local',
            host: host,
            database: mongoose.connection.name
        };
    }
    return { connected: false };
};

module.exports = {
    connectDB,
    disconnectDB,
    getConnectionInfo,
    getMongoUri: () => config.MONGODB_URI
};