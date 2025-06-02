import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['break', 'music', 'exercise', 'reading', 'meditation', 'other'],
    default: 'other', // Default type if not specified 
  },
  details: {
    type: mongoose.Schema.Types.Mixed, 
    required: true,
  },
  trigger: {
    type: mongoose.Schema.Types.Mixed, 
    required: true,
  },
  accepted: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

export const Recommendation = mongoose.model("Recommendation", recommendationSchema);
