import mongoose from "mongoose";

const screenTimeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  totalTime: {
    type: Number,
    required: true,
    default: 0,
  },
  tabs: {
    type: [{
      url: {
        type: String,
        required: true,
      },
      time: {
        type: Number,
        required: true,
        default: 0,
      }
    }],
    default: [],
  },
}, { timestamps: true });

export const ScreenTime = mongoose.model("ScreenTime", screenTimeSchema);

