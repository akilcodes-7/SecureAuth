const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not set in .env");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error(
      "Fix: set a valid MONGO_URI in .env (MongoDB Atlas or local mongodb://localhost:27017/securedb)"
    );
    process.exit(1);
  }
};

module.exports = connectDB;
