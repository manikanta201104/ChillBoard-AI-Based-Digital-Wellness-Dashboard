import mongoose from 'mongoose';

const ContextEventSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // removed duplicate index:true
  date: { type: String, index: true, required: true }, // YYYY-MM-DD
  hostname: { type: String, required: true },
  category: { type: String, index: true, required: true },
  seconds: { type: Number, default: 0, min: 0 },
  source: { type: String, default: 'extension' },
  titleHash: { type: String, default: null },
  sentiment: { type: String, enum: ['neg', 'neu', 'pos'], default: null },
}, { timestamps: true });

// Compound index for fast lookups
ContextEventSchema.index({ userId: 1, date: 1, category: 1, hostname: 1 });

export default mongoose.model('ContextEvent', ContextEventSchema);
