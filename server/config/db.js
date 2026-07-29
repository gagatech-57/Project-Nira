const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  const onlineURI = process.env.MONGODB_URI;
  const localURI = 'mongodb://127.0.0.1:27017/realtime_chat_db';

  if (onlineURI) {
    try {
      console.log('⏳ Connecting to MongoDB Atlas Online Database...');
      const conn = await mongoose.connect(onlineURI, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
      return true;
    } catch (onlineError) {
      console.warn(`⚠️ Online MongoDB Atlas connection failed: ${onlineError.message}`);
      console.log('🔄 Attempting fallback to local MongoDB...');
    }
  }

  try {
    const conn = await mongoose.connect(localURI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ Local MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (localError) {
    console.warn(`⚠️ Local MongoDB connection warning: ${localError.message}`);
    console.warn('💡 The server will start with in-memory persistence.');
    return false;
  }
};

module.exports = connectDB;
