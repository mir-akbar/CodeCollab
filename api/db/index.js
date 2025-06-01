const { connectDB } = require('../config/database');

// Initialize database connection
connectDB()
    .then(() => {
        console.log("MongoDB connection successful to 'code_colab' database");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
    });