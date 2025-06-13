import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    recommendationId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    type: {
      type: String,
      required: true,
      enum: ['break', 'exercise', 'playlist', 'challenge', 'notification', 'message'], // Added 'message'
    },
    details: { type: String, required: true },
    trigger: { type: String, required: true },
    accepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

recommendationSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('Recommendation', recommendationSchema);