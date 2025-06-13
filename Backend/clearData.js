import mongoose from "mongoose";
import ScreenTime from "./models/screenTime.js";

// Optional: Add mood model if needed
const moodSchema = new mongoose.Schema({}, { strict: false });
const Mood = mongoose.model("Mood", moodSchema, "moods");

// Your MongoDB URI
const MONGO_URI = 'mongodb+srv://manikanta201104:lf5OpWqAsKl653Ng@chill.0mfpczw.mongodb.net/?retryWrites=true&w=majority&appName=Chill';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    return clearData();
  })
  .catch((err) => {
    console.error("❌ Connection error:", err);
  });

const clearData = async () => {
  try {
    const stResult = await ScreenTime.deleteMany({});
    const moodsResult = await Mood.deleteMany({});

    console.log(`🧹 Deleted ${stResult.deletedCount} from 'screenTime'`);
    console.log(`🧹 Deleted ${moodsResult.deletedCount} from 'moods'`);
  } catch (err) {
    console.error("❌ Error clearing data:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Connection closed");
  }
};
