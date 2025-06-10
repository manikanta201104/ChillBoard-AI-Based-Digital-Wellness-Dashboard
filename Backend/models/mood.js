import mongoose from 'mongoose';

const moodSchema = new mongoose.Schema (
  {
    moodId: {type: String, required: true, unique: true},
    userId: {type: String, required: true},
    timestamp: {type: Date, required: true, default: Date.now},
    mood: {
      type: String,
      required: true,
      enum: ['happy', 'sad', 'angry', 'stressed', 'calm', 'neutral'],
    },
    confidence: {type: Number, required: true, min: 0, max: 1},
  },
  {timestamps: true}
);

moodSchema.index ({userId: 1, timestamp: -1});

export default mongoose.model ('Mood', moodSchema);
