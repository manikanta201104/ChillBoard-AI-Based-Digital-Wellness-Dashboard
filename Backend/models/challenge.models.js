import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema(
  {
    // Name of the challenge (e.g., "7-Day Digital Detox")
    title: {
      type: String,
      required: true,
      unique: true,
    },

    // Description of the challenge (e.g., "Reduce 1 hour daily")
    description: {
      type: String,
      required: true,
    },

    // Duration in days
    duration: {
      type: Number,
      required: true,
      min: 1, // Minimum of 1 day
    },

    // Goal of the challenge (e.g., reduce screen time by 60 minutes/day)
    goal: {
      type: String,
      required: true,
    },

    // Start date of the challenge
    startDate: {
      type: Date,
      required: true,
    },

    // List of participants and their current progress
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reduction: {
          type: Number, // e.g., 5.6 hours reduced
          default: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

export const Challenge = mongoose.model('Challenge', challengeSchema);
