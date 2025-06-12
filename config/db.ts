const mongoose = require("mongoose");
require("dotenv").config()
const mongodbUrl=process.env.MONGODB_URI
const connectDB = async () => {
  try {
    await mongoose.connect(mongodbUrl);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

export default connectDB;
