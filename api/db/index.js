const mongoose = require("mongoose");

const url = "mongodb+srv://admin:admin@cluster91438.fvtzi.mongodb.net/code_colab?retryWrites=true&w=majority&appName=Cluster91438";

mongoose.connect(url, {
})
.then(() => {
    console.log("MongoDB connection successful to 'code_colab' database");
})
.catch((err) => {
    console.error("MongoDB connection error:", err);
});
