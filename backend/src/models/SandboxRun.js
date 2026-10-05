/**
 * backend/src/models/SandboxRun.js
 * ────────────────────────────────
 * Mongoose schema for container sandbox PoC execution runs and validation logs.
 */

const mongoose = require('mongoose');

const SandboxRunSchema = new mongoose.Schema(
  {
    pocId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    scanId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    finding: {
      type: String,
      required: true,
      trim: true,
    },
    result: {
      type: String,
      enum: ['verified', 'rejected', 'error'],
      required: true,
      index: true,
    },
    duration: {
      type: String,
      default: '0ms',
    },
    containerImage: {
      type: String,
      default: 'alpine:3.18',
    },
    isolationMode: {
      type: String,
      default: 'chroot+cgroups',
    },
    stdout: {
      type: String,
      default: '',
    },
    stderr: {
      type: String,
      default: '',
    },
    exitCode: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SandboxRun', SandboxRunSchema);
