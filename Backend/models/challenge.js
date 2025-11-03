import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  reduction: { type: Number, default: 0 },
  lastUpdate: { type: Number, default: Date.now },
  joinedAt: { type: Number, default: Date.now },
});

const challengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true },
    goal: { type: Number, required: true },
    startDate: { type: Date, required: true },
    participants: [participantSchema],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Challenge', challengeSchema);