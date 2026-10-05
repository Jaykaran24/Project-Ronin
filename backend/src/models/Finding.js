/**
 * backend/src/models/Finding.js
 * ─────────────────────────────
 * Mongoose schema for validated vulnerability findings.
 */

const mongoose = require('mongoose');

const FindingSchema = new mongoose.Schema(
  {
    findingId: {
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    owasp: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
      index: true,
    },
    cvss: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    cvssVector: {
      type: String,
      default: null,
    },
    cvssMetrics: {
      av: { type: String, default: null },
      ac: { type: String, default: null },
      pr: { type: String, default: null },
      ui: { type: String, default: null },
      scope: { type: String, default: null },
      c: { type: String, default: null },
      i: { type: String, default: null },
      a: { type: String, default: null },
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    method: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['unverified', 'verified', 'rejected'],
      default: 'verified',
    },
    discoveredAt: {
      type: String,
      default: () => new Date().toISOString().slice(0, 16).replace('T', ' '),
    },
    description: {
      type: String,
      required: true,
    },
    narrative: {
      type: String,
      default: '',
    },
    rawRequest: {
      type: String,
      default: '',
    },
    rawResponse: {
      type: String,
      default: '',
    },
    poc: {
      type: String,
      required: true,
    },
    pythonPoc: {
      type: String,
      default: '',
    },
    remediation: {
      type: String,
      required: true,
    },
    remediationCode: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Finding', FindingSchema);
