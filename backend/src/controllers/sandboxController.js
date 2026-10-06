/**
 * backend/src/controllers/sandboxController.js
 * ────────────────────────────────────────────
 * Controller for sandbox execution history and container telemetry.
 */

const Scan = require('../models/Scan');
const SandboxRun = require('../models/SandboxRun');

// Helper to get all scan IDs belonging to the authenticated operator
const getUserScanIds = async (req) => {
  const userId = req.user ? (req.user._id || req.user.id) : null;
  if (!userId) return [];
  return Scan.find({ operatorId: { $in: [userId, String(userId)] } }).distinct('scanId');
};

exports.getSandboxRuns = async (req, res) => {
  const { scanId } = req.query;
  const filter = {};

  try {
    const userScanIds = await getUserScanIds(req);
    if (!userScanIds || userScanIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    if (scanId) {
      if (!userScanIds.includes(scanId)) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter.scanId = scanId;
    } else {
      filter.scanId = { $in: userScanIds };
    }

    const runs = await SandboxRun.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: runs.length, data: runs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: [] });
  }
};

exports.getSandboxRunById = async (req, res) => {
  const { id } = req.params;
  try {
    const userScanIds = await getUserScanIds(req);
    const filter = { pocId: id, scanId: { $in: userScanIds } };

    const run = await SandboxRun.findOne(filter);
    if (!run) {
      return res.status(404).json({ success: false, message: `Sandbox run ${id} not found` });
    }
    return res.status(200).json({ success: true, data: run });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
