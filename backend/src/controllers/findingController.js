/**
 * backend/src/controllers/findingController.js
 * ────────────────────────────────────────────
 * Controller for retrieving and creating verified vulnerability findings.
 */

const Finding = require('../models/Finding');
const { SEED_FINDINGS } = require('../utils/seedData');

let inMemoryFindings = [...SEED_FINDINGS];

exports.getFindings = async (req, res) => {
  const { scanId, severity } = req.query;
  const filter = {};
  if (scanId) filter.scanId = scanId;
  if (severity && severity !== 'all') filter.severity = severity;

  try {
    const findings = await Finding.find(filter).sort({ cvss: -1 });
    if (!findings || findings.length === 0) {
      let filtered = inMemoryFindings;
      if (scanId) filtered = filtered.filter(f => f.scanId === scanId);
      if (severity && severity !== 'all') filtered = filtered.filter(f => f.severity === severity);
      return res.status(200).json({ success: true, count: filtered.length, data: filtered });
    }
    return res.status(200).json({ success: true, count: findings.length, data: findings });
  } catch (err) {
    let filtered = inMemoryFindings;
    if (scanId) filtered = filtered.filter(f => f.scanId === scanId);
    if (severity && severity !== 'all') filtered = filtered.filter(f => f.severity === severity);
    return res.status(200).json({ success: true, count: filtered.length, data: filtered, isFallback: true });
  }
};

exports.getFindingById = async (req, res) => {
  const { id } = req.params;
  try {
    const finding = await Finding.findOne({ findingId: id });
    if (!finding) {
      const mem = inMemoryFindings.find(f => f.findingId === id);
      if (mem) return res.status(200).json({ success: true, data: mem });
      return res.status(404).json({ success: false, message: `Finding ${id} not found` });
    }
    return res.status(200).json({ success: true, data: finding });
  } catch (err) {
    const mem = inMemoryFindings.find(f => f.findingId === id);
    if (mem) return res.status(200).json({ success: true, data: mem, isFallback: true });
    return res.status(404).json({ success: false, message: `Finding ${id} not found` });
  }
};

exports.createFinding = async (req, res) => {
  try {
    const finding = await Finding.create(req.body);
    inMemoryFindings.unshift(finding);
    return res.status(201).json({ success: true, data: finding });
  } catch (err) {
    inMemoryFindings.unshift(req.body);
    return res.status(201).json({ success: true, data: req.body, isFallback: true });
  }
};
