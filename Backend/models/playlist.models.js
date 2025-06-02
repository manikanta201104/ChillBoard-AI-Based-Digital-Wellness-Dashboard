import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema (
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spotifyPlaylistId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      // Removed global unique constraint
    },
    mood: {
      type: String,
      required: true,
      enum: ['happy', 'sad', 'calm', 'energetic', 'focus', 'relaxed'], // optional
    },
    timestamp: {
      type: Date,
      required: true,
    },
    saved: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {timestamps: true}
);

// Optional: Add a compound unique index for (userId + name)
playlistSchema.index ({userId: 1, name: 1}, {unique: true});

export const Playlist = mongoose.model ('Playlist', playlistSchema);
