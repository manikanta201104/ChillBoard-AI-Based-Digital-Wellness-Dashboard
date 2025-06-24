import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true }, // in days
    goal: { type: Number, required: true }, // e.g., "Reduce screen time by 30%"
    startDate: { type: Date, required: true },
    participants: { type: [String], default: [] }, // Array of userIds
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Challenge', challengeSchema);