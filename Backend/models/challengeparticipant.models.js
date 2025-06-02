import mongoose from "mongoose";

const challengeParticipantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Challenge",
    required: true,
  },
  joinedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  reduction: {
    type: Number, // ✅ Use Number to support float values
    required: true,
    default: 0,
  },
}, { timestamps: true });

// ✅ Rename the model to avoid conflict
export const ChallengeParticipant = mongoose.model("ChallengeParticipant", challengeParticipantSchema);
