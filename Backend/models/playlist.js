import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    playlistId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    spotifyPlaylistId: { type: String, required: true },
    name: { type: String, required: true },
    mood: {
      type: String,
      required: true,
      enum: ['happy', 'sad', 'angry', 'stressed', 'calm', 'neutral'],
    },
    timestamp: { type: Date, required: true, default: Date.now },
    saved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

playlistSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('Playlist', playlistSchema);