/**
 * backend/src/controllers/scanController.js
 * ─────────────────────────────────────────
 * Controller for scan lifecycle, status, and telemetry.
 */

const Scan = require('../models/Scan');
const { SEED_SCANS } = require('../utils/seedData');

// In-memory fallback if MongoDB is not connected in dev
let inMemoryScans = [...SEED_SCANS];

exports.getScans = async (req, res) => {
  try {
    const scans = await Scan.find().sort({ startedAt: -1 });
    if (!scans || scans.length === 0) {
      return res.status(200).json({ success: true, count: inMemoryScans.length, data: inMemoryScans });
    }
    return res.status(200).json({ success: true, count: scans.length, data: scans });
  } catch (err) {
    // Graceful fallback to in-memory seed
    return res.status(200).json({ success: true, count: inMemoryScans.length, data: inMemoryScans, isFallback: true });
  }
};

exports.getActiveScan = async (req, res) => {
  try {
    let scan = await Scan.findOne({ status: 'running' }).sort({ startedAt: -1 });
    if (!scan) {
      scan = await Scan.findOne().sort({ startedAt: -1 });
    }
    if (!scan) {
      const activeSeed = inMemoryScans.find(s => s.status === 'running') || inMemoryScans[0];
      return res.status(200).json({ success: true, data: activeSeed });
    }
    return res.status(200).json({ success: true, data: scan });
  } catch (err) {
    const activeSeed = inMemoryScans.find(s => s.status === 'running') || inMemoryScans[0];
    return res.status(200).json({ success: true, data: activeSeed, isFallback: true });
  }
};

exports.getScanById = async (req, res) => {
  const { id } = req.params;
  try {
    const scan = await Scan.findOne({ scanId: id });
    if (!scan) {
      const mem = inMemoryScans.find(s => s.scanId === id);
      if (mem) return res.status(200).json({ success: true, data: mem });
      return res.status(404).json({ success: false, message: `Scan ${id} not found` });
    }
    return res.status(200).json({ success: true, data: scan });
  } catch (err) {
    const mem = inMemoryScans.find(s => s.scanId === id);
    if (mem) return res.status(200).json({ success: true, data: mem, isFallback: true });
    return res.status(404).json({ success: false, message: `Scan ${id} not found` });
  }
};

exports.createScan = async (req, res) => {
  const { target, name, inputMode } = req.body;
  if (!target) {
    return res.status(422).json({ success: false, message: 'Target URL is required' });
  }

  const newScanId = `SCAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
  const scanObj = {
    scanId: newScanId,
    name: name || `Scan ${target.replace(/https?:\/\//, '')}`,
    target,
    status: 'running',
    phase: 'Recon',
    progress: 5,
    endpointsTested: 0,
    endpointsTotal: 0,
    currentActivity: `Discovered attack surface on ${target} (${inputMode || 'discovery'})`,
    startedAt: new Date(),
    operatorId: req.user ? req.user._id : null,
  };

  try {
    const scan = await Scan.create(scanObj);
    inMemoryScans.unshift(scan);
    return res.status(201).json({ success: true, data: scan });
  } catch (err) {
    inMemoryScans.unshift(scanObj);
    return res.status(201).json({ success: true, data: scanObj, isFallback: true });
  }
};

exports.updateScanStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['running', 'paused', 'aborted', 'completed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid scan status' });
  }

  try {
    const scan = await Scan.findOneAndUpdate({ scanId: id }, { status }, { new: true });
    if (!scan) {
      const idx = inMemoryScans.findIndex(s => s.scanId === id);
      if (idx !== -1) {
        inMemoryScans[idx].status = status;
        return res.status(200).json({ success: true, data: inMemoryScans[idx] });
      }
      return res.status(404).json({ success: false, message: 'Scan not found' });
    }
    return res.status(200).json({ success: true, data: scan });
  } catch (err) {
    const idx = inMemoryScans.findIndex(s => s.scanId === id);
    if (idx !== -1) {
      inMemoryScans[idx].status = status;
      return res.status(200).json({ success: true, data: inMemoryScans[idx] });
    }
    return res.status(404).json({ success: false, message: 'Scan not found' });
  }
};

exports.getScanReport = async (req, res) => {
  const { id } = req.params;
  const { download } = req.query;

  try {
    const scan = await Scan.findOne({ scanId: id });
    if (!scan) {
      const mem = inMemoryScans.find(s => s.scanId === id);
      if (!mem) return res.status(404).json({ success: false, message: `Scan ${id} not found` });

      const report = mem.reportMarkdown || `# Ronin Security Report\n\nNo report generated yet for scan ${id}.`;
      if (download === 'true') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="ronin_report_${id}.md"`);
        return res.send(report);
      }
      return res.status(200).json({ success: true, scanId: id, report });
    }

    if (!scan.reportMarkdown) {
      return res.status(404).json({ success: false, message: `No report available for scan ${id}` });
    }

    if (download === 'true') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ronin_report_${id}.md"`);
      return res.send(scan.reportMarkdown);
    }

    return res.status(200).json({
      success: true,
      scanId: scan.scanId,
      target: scan.target,
      report: scan.reportMarkdown,
      generatedAt: scan.reportGeneratedAt || scan.completedAt,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
