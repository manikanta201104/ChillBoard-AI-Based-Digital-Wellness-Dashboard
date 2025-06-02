import mongoose from "mongoose";

const triggerLinkSchema = new mongoose.Schema({
    fromSource: {
        type: String,
        required: true,
        enum: ['mood', 'recommendation', 'challenge', 'screenTime'],
    },
    recommendationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recommendation",
        required: true,
    },
    timestamp: {
        type: Date,
        required: true,
    },
    note: {
        type: String,
        required: true,
    }
}, { timestamps: true });

export const TriggerLink = mongoose.model("TriggerLink", triggerLinkSchema);
