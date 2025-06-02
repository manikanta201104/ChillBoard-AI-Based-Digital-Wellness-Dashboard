import mongoose from 'mongoose';

const spotifyTokenSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { _id: false }); // No separate _id for subdocument

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    maxlength: 128,
    match: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
  },
  profilePicture: {
    type: String,
    required: false,
    default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    match: /^https?:\/\/.*\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i,
  },
  spotifyToken: {
    type: spotifyTokenSchema,
    required: false,
  },
  preferences: {
    type: mongoose.Schema.Types.Mixed, // Allows any structure for preferences
    default: {},
  },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

