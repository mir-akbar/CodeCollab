// Shared database configuration for all scripts and services
// Uses environment variables to avoid exposing credentials

const mongoose = require('mongoose');

// Load MongoDB URI from environment variable or use local fallback
const getMongoUri = () => {
    // First try to load from environment
    if (process.env.MONGODB_URI) {
        return process.env.MONGODB_URI;
    }
    
    // Fallback to local MongoDB for development
    console.warn('⚠️  MONGODB_URI not found in environment variables. Using local MongoDB fallback.');
    return 'mongodb://localhost:27017/code_colab';
};

// Connect to MongoDB with proper error handling
const connectDB = async (options = {}) => {
    try {
        const uri = getMongoUri();
        
        // Default connection options
        const defaultOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            ...options
        };
        
        console.log('🔗 Connecting to MongoDB...');
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
    getMongoUri
};