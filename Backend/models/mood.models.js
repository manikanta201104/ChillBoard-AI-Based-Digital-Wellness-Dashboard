import mongoose from 'mongoose';

const moodSchema = new mongoose.Schema (
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      required: true,
    },
    mood: {
      type: String,
      required: true,
      enum: ['happy', 'sad', 'angry', 'neutral', 'excited', 'bored'],
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {timestamps: true}
);

export const Mood = mongoose.model ('Mood', moodSchema);
