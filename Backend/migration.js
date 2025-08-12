import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

async function migrateDates() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in .env file');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collectionName = 'screentimes';

    // Check collection
    const collections = await db.listCollections().toArray();
    const screenTimeCollection = collections.find(c => c.name === collectionName);
    if (!screenTimeCollection) {
      console.warn('⚠ ScreenTime collection not found');
      return;
    }

    // Raw update: Convert string dates to Date
    const updateResult = await db.collection(collectionName).updateMany(
      { date: { $type: "string" } },
      [
        {
          $set: {
            date: {
              $dateFromString: {
                dateString: "$date",
                format: "%Y-%m-%d",
                onError: null
              }
            }
          }
        }
      ]
    );

    console.log(`📊 Matched ${updateResult.matchedCount} documents`);
    console.log(`✅ Modified (migrated) ${updateResult.modifiedCount} documents`);

    // Verify sample
    const sample = await db.collection(collectionName).findOne({ date: { $type: "date" } });
    if (sample) {
      console.log('🔍 Sample migrated document:', { _id: sample._id, date: sample.date.toISOString() });
    } else {
      console.warn('⚠ No migrated documents found for verification');
    }

    console.log('✅ Migration completed');
  } catch (err) {
    console.error('❌ Migration error', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

migrateDates();