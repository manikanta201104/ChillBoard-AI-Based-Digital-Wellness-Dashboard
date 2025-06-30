import mongoose from 'mongoose';

const tabsSchema = new mongoose.Schema(
  {
    url: String,
    title: String,
    timeSpent: Number,
  },
  { _id: false }
);

const screenTimeSchema = new mongoose.Schema(
  {
    screenTimeId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalTime: {
      type: Number,
      required: true,
    },
    tabs: [tabsSchema],
  },
  { timestamps: true }
);

// Index for efficient querying and deduplication
screenTimeSchema.index({ userId: 1, date: 1 }, { unique: true }); // Updated to enforce uniqueness

export default mongoose.model('ScreenTime', screenTimeSchema);