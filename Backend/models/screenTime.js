
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
        unique: true, // This creates an index
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

  // Removed duplicate index since unique: true already creates one
  screenTimeSchema.index({ userId: 1, date: 1 });

  export default mongoose.model('ScreenTime', screenTimeSchema);
  