import mongoose from 'mongoose';
import ScreenTime from './models/screenTime.js';

const MONGO_URI = 'mongodb+srv://manikanta201104:lf5OpWqAsKl653Ng@chill.0mfpczw.mongodb.net/?retryWrites=true&w=majority&appName=Chill';

const data = [
  {
    screenTimeId: "st_1747660800000",
    userId: "6858c6eba064f00ab3c98108",
    date: new Date(1747660800000), // June 25, 2025
    totalTime: 21600,
    tabs: [
      { url: "grok.com", timeSpent: 7200 },
      { url: "www.youtube.com", timeSpent: 7200 },
      { url: "www.reddit.com", timeSpent: 7200 }
    ],
    createdAt: new Date(1747660800000),
    updatedAt: new Date(1747660800000),
    __v: 0
  },
  {
    screenTimeId: "st_1747747200000",
    userId: "6858c6eba064f00ab3c98108",
    date: new Date(1747747200000), // June 26, 2025
    totalTime: 21600,
    tabs: [
      { url: "grok.com", timeSpent: 7200 },
      { url: "www.youtube.com", timeSpent: 7200 },
      { url: "www.reddit.com", timeSpent: 7200 }
    ],
    createdAt: new Date(1747747200000),
    updatedAt: new Date(1747747200000),
    __v: 0
  },
  {
    screenTimeId: "st_1747833600000",
    userId: "6858c6eba064f00ab3c98108",
    date: new Date(1747833600000), // June 27, 2025
    totalTime: 21600,
    tabs: [
      { url: "grok.com", timeSpent: 7200 },
      { url: "www.youtube.com", timeSpent: 7200 },
      { url: "www.reddit.com", timeSpent: 7200 }
    ],
    createdAt: new Date(1747833600000),
    updatedAt: new Date(1747833600000),
    __v: 0
  },
  {
    screenTimeId: "st_1747920000000",
    userId: "6858c6eba064f00ab3c98108",
    date: new Date(1747920000000), // June 28, 2025
    totalTime: 21600,
    tabs: [
      { url: "grok.com", timeSpent: 7200 },
      { url: "www.youtube.com", timeSpent: 7200 },
      { url: "www.reddit.com", timeSpent: 7200 }
    ],
    createdAt: new Date(1747920000000),
    updatedAt: new Date(1747920000000),
    __v: 0
  },
  {
    screenTimeId: "st_1748006400000",
    userId: "6858c6eba064f00ab3c98108",
    date: new Date(1748006400000), // June 29, 2025
    totalTime: 21600,
    tabs: [
      { url: "grok.com", timeSpent: 7200 },
      { url: "www.youtube.com", timeSpent: 7200 },
      { url: "www.reddit.com", timeSpent: 7200 }
    ],
    createdAt: new Date(1748006400000),
    updatedAt: new Date(1748006400000),
    __v: 0
  },
  {
    screenTimeId: "st_1748092800000",
    userId: "6858c6eba064f00ab3c98108",
    date: new Date(1748092800000), // June 30, 2025
    totalTime: 21600,
    tabs: [
      { url: "grok.com", timeSpent: 7200 },
      { url: "www.youtube.com", timeSpent: 7200 },
      { url: "www.reddit.com", timeSpent: 7200 }
    ],
    createdAt: new Date(1748092800000),
    updatedAt: new Date(1748092800000),
    __v: 0
  },
  {
    screenTimeId: "st_1748179200000",
    userId: "6858c6eba064f00ab3c98108",
    date: new Date(1748179200000), // July 01, 2025
    totalTime: 21600,
    tabs: [
      { url: "grok.com", timeSpent: 7200 },
      { url: "www.youtube.com", timeSpent: 7200 },
      { url: "www.reddit.com", timeSpent: 7200 }
    ],
    createdAt: new Date(1748179200000),
    updatedAt: new Date(1748179200000),
    __v: 0
  },
  {
    screenTimeId: "st_1748265600000",
    userId: "6858c6eba064f00ab3c98108",
    date: new Date(1748265600000), // July 03, 2025
    totalTime: 18000,
    tabs: [
      { url: "grok.com", timeSpent: 6000 },
      { url: "www.youtube.com", timeSpent: 6000 },
      { url: "www.reddit.com", timeSpent: 6000 }
    ],
    createdAt: new Date(1748265600000),
    updatedAt: new Date(1748265600000),
    __v: 0
  }
];

async function insertData() {
  try {
    // Drop existing collection to avoid duplicates
    await mongoose.connection.db.dropCollection('screentimes').catch(err => {
      if (err.codeName !== 'NamespaceNotFound') console.error("❌ Error dropping collection:", err.message);
    });
    console.log("📌 Dropping collection (if exists) completed");

    // Insert data
    const result = await ScreenTime.insertMany(data, { ordered: false });
    console.log("✅ ScreenTime data inserted successfully. Inserted count:", result.length);

    // Verify data
    const count = await ScreenTime.countDocuments({ userId: "6858c6eba064f00ab3c98108" });
    console.log(`✅ Total documents for userId: ${count}`);

    // Fetch and log inserted documents
    const insertedData = await ScreenTime.find({ userId: "6858c6eba064f00ab3c98108" }).lean();
    console.log("📌 Inserted documents:", JSON.stringify(insertedData, null, 2));
  } catch (err) {
    console.error("❌ Error inserting data:", err.message, err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("📌 Disconnected from MongoDB");
  }
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    insertData();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message, err.stack);
  });