import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      default: () => `user_${Date.now()}`,
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
      accessToken: { type: String },
      refreshToken: { type: String },
      expiresIn: { type: Number },
      obtainedAt: { type: Date },
    },
    preferences: {
      type: Object,
      default: {},
    },
    // NEW: role-based access for admin features
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // NEW: allow admin to deactivate a user account
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);