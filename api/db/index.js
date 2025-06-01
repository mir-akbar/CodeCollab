const mongoose = require("mongoose");

// Use Node.js built-in process.env (no dotenv needed for server-side)
const url = process.env.MONGODB_URI || "mongodb://localhost:27017/code_colab";

mongoose.connect(url, {
})
.then(() => {
    console.log("MongoDB connection successful to 'code_colab' database");
})
.catch((err) => {
    console.error("MongoDB connection error:", err);
});
