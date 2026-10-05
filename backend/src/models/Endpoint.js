/**
 * backend/src/models/Endpoint.js
 * ──────────────────────────────
 * Mongoose schema for discovered API endpoints and attack surface routes.
 */

const mongoose = require('mongoose');

const ParameterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    in: {
      type: String,
      enum: ['query', 'path', 'body', 'header'],
      required: true,
    },
    paramType: { type: String, default: 'string' },
    required: { type: Boolean, default: false },
    desc: { type: String, default: '' },
  },
  { _id: false }
);

const EndpointSchema = new mongoose.Schema(
  {
    endpointId: {
      type: String,
      required: true,
      trim: true,
    },
    scanId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      required: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    group: {
      type: String,
      default: '/',
      trim: true,
    },
    auth: {
      type: String,
      default: 'Bearer',
      trim: true,
    },
    tested: {
      type: Boolean,
      default: false,
    },
    findings: {
      type: Number,
      default: 0,
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    parameters: [ParameterSchema],
  },
  {
    timestamps: true,
  }
);

EndpointSchema.index({ scanId: 1, method: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('Endpoint', EndpointSchema);
