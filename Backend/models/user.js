import mongoose from 'mongoose';

const userSchema = new mongoose.Schema (
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /.+\@.+\..+/,
    },
    password: {
      type: String,
      required: true,
    },
    spotifyToken: {
      type: String,
      default: null,
    },
    preferences: {
      type: Object,
      default: {},
    },
  },
  {timestamps: true}
);

userSchema.index ({userId: 1});
userSchema.index ({email: 1});

export default mongoose.model ('User', userSchema);
