import mongoose from 'mongoose';

// Define tabsSchema if you are embedding an array of tab objects
const tabsSchema = new mongoose.Schema({
  url: String,
  title: String,
  timeSpent: Number,
}, { _id: false });

const screenTimeSchema = new mongoose.Schema(
  {
    screenTimeId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
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

screenTimeSchema.index({ screenTimeId: 1 });
screenTimeSchema.index({ userId: 1, date: 1 });

export default mongoose.model('ScreenTime', screenTimeSchema);
