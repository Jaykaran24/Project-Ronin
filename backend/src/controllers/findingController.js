/**
 * backend/src/controllers/findingController.js
 * ────────────────────────────────────────────
 * Controller for retrieving and creating verified vulnerability findings.
 */

const Scan = require('../models/Scan');
const Finding = require('../models/Finding');

// Helper to get all scan IDs belonging to the authenticated operator
const getUserScanIds = async (req) => {
  const userId = req.user ? (req.user._id || req.user.id) : null;
  if (!userId) return [];
  return Scan.find({ operatorId: { $in: [userId, String(userId)] } }).distinct('scanId');
};

exports.getFindings = async (req, res) => {
  const { scanId, severity } = req.query;
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

    if (severity && severity !== 'all') filter.severity = severity;

    const findings = await Finding.find(filter).sort({ cvss: -1 });
    return res.status(200).json({ success: true, count: findings.length, data: findings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: [] });
  }
};

exports.getFindingById = async (req, res) => {
  const { id } = req.params;
  try {
    const userScanIds = await getUserScanIds(req);
    const filter = { findingId: id, scanId: { $in: userScanIds } };

    const finding = await Finding.findOne(filter);
    if (!finding) {
      return res.status(404).json({ success: false, message: `Finding ${id} not found` });
    }
    return res.status(200).json({ success: true, data: finding });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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
