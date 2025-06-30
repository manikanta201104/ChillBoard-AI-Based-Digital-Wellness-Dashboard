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

// Updated index to match the aggregation date format
screenTimeSchema.index({ userId: 1, date: 1 }, { unique: true, partialFilterExpression: { date: { $exists: true } } });

export default mongoose.model('ScreenTime', screenTimeSchema);