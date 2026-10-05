/**
 * backend/src/models/Scan.js
 * ──────────────────────────
 * Mongoose schema for Scan entities and lifecycle state.
 */

const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema(
  {
    scanId: {
      type: String,
      required: [true, 'Scan ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Scan name is required'],
      trim: true,
    },
    target: {
      type: String,
      required: [true, 'Target URL is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'paused', 'completed', 'failed', 'aborted'],
      default: 'pending',
    },
    phase: {
      type: String,
      enum: ['Recon', 'Exploit', 'Validation', 'Reporting', 'Completed'],
      default: 'Recon',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    endpointsTested: {
      type: Number,
      default: 0,
    },
    endpointsTotal: {
      type: Number,
      default: 0,
    },
    currentActivity: {
      type: String,
      default: 'Initializing attack surface mapping...',
    },
    currentEndpoint: {
      type: String,
      default: null,
    },
    criticalCount: {
      type: Number,
      default: 0,
    },
    highCount: {
      type: Number,
      default: 0,
    },
    mediumCount: {
      type: Number,
      default: 0,
    },
    lowCount: {
      type: Number,
      default: 0,
    },
    validationRate: {
      type: String,
      default: '100%',
    },
    diff: {
      newFindings: { type: Number, default: 0 },
      resolvedFindings: { type: Number, default: 0 },
      unchangedFindings: { type: Number, default: 0 },
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    reportMarkdown: {
      type: String,
      default: null,
    },
    reportGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Scan', ScanSchema);
