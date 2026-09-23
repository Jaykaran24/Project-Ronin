/**
 * backend/src/models/User.js
 * ──────────────────────────
 * Mongoose User schema with bcrypt password hashing hooks.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type:     String,
      required: [true, 'Full name is required'],
      trim:     true,
      maxlength: [100, 'Full name must be at most 100 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select:    false, // never returned in queries by default
    },
    role: {
      type:    String,
      enum:    ['operator', 'admin'],
      default: 'operator',
    },
    is_active: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Pre-save hook: hash password before storing ──────────────────────────────
UserSchema.pre('save', async function (next) {
  // Only hash when password has been modified (or is new)
  if (!this.isModified('password')) return next();
  const salt   = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare candidate password against stored hash ──────────
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
