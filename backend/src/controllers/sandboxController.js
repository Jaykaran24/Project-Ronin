/**
 * backend/src/controllers/sandboxController.js
 * ────────────────────────────────────────────
 * Controller for sandbox execution history and container telemetry.
 */

const SandboxRun = require('../models/SandboxRun');
const { SEED_SANDBOX } = require('../utils/seedData');

let inMemorySandbox = [...SEED_SANDBOX];

exports.getSandboxRuns = async (req, res) => {
  const { scanId } = req.query;
  const filter = {};
  if (scanId) filter.scanId = scanId;

  try {
    const runs = await SandboxRun.find(filter).sort({ createdAt: -1 });
    if (!runs || runs.length === 0) {
      let filtered = inMemorySandbox;
      if (scanId) filtered = filtered.filter(s => s.scanId === scanId);
      return res.status(200).json({ success: true, count: filtered.length, data: filtered });
    }
    return res.status(200).json({ success: true, count: runs.length, data: runs });
  } catch (err) {
    let filtered = inMemorySandbox;
    if (scanId) filtered = filtered.filter(s => s.scanId === scanId);
    return res.status(200).json({ success: true, count: filtered.length, data: filtered, isFallback: true });
  }
};

exports.getSandboxRunById = async (req, res) => {
  const { id } = req.params;
  try {
    const run = await SandboxRun.findOne({ pocId: id });
    if (!run) {
      const mem = inMemorySandbox.find(s => s.pocId === id);
      if (mem) return res.status(200).json({ success: true, data: mem });
      return res.status(404).json({ success: false, message: `Sandbox run ${id} not found` });
    }
    return res.status(200).json({ success: true, data: run });
  } catch (err) {
    const mem = inMemorySandbox.find(s => s.pocId === id);
    if (mem) return res.status(200).json({ success: true, data: mem, isFallback: true });
    return res.status(404).json({ success: false, message: `Sandbox run ${id} not found` });
  }
};
