import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ScreenTime from './models/screenTime.js';

dotenv.config(); // Load .env variables

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const clearData = async () => {
  try {
    await ScreenTime.deleteMany({});
    console.log('✅ All ScreenTime data has been cleared');
  } catch (error) {
    console.error('❌ Error clearing ScreenTime data:', error);
  } finally {
    mongoose.connection.close();
  }
};

clearData();
