import mongoose from 'mongoose';

const triggerLinkSchema = new mongoose.Schema (
  {
    fromSource: {
      type: String,
      required: true,
    },
    recommendationId: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      default: null,
    },
  },
  {timestamps: true}
);

triggerLinkSchema.index ({recommendationId: 1});

export default mongoose.model ('TriggerLink', triggerLinkSchema);
