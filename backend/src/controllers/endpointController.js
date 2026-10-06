/**
 * backend/src/controllers/endpointController.js
 * ─────────────────────────────────────────────
 * Controller for attack surface endpoints and targeted scans.
 */

const Scan = require('../models/Scan');
const Endpoint = require('../models/Endpoint');

// Helper to get all scan IDs belonging to the authenticated operator
const getUserScanIds = async (req) => {
  const userId = req.user ? (req.user._id || req.user.id) : null;
  if (!userId) return [];
  return Scan.find({ operatorId: { $in: [userId, String(userId)] } }).distinct('scanId');
};

exports.getEndpoints = async (req, res) => {
  const { scanId, method, tested } = req.query;
  const filter = {};

  try {
    const userScanIds = await getUserScanIds(req);
    if (!userScanIds || userScanIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    if (scanId && scanId !== 'ALL') {
      if (!userScanIds.includes(scanId)) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter.scanId = scanId;
    } else {
      filter.scanId = { $in: userScanIds };
    }

    if (method && method !== 'ALL') filter.method = method;
    if (tested !== undefined) filter.tested = tested === 'true';

    const endpoints = await Endpoint.find(filter).sort({ group: 1, path: 1 });
    return res.status(200).json({ success: true, count: endpoints.length, data: endpoints });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: [] });
  }
};

exports.probeEndpoint = async (req, res) => {
  const { id } = req.params;
  try {
    const userScanIds = await getUserScanIds(req);
    const filter = { endpointId: id, scanId: { $in: userScanIds } };

    const ep = await Endpoint.findOne(filter);
    if (!ep) {
      return res.status(404).json({ success: false, message: `Endpoint ${id} not found` });
    }

    return res.status(200).json({
      success: true,
      message: `Targeted probe dispatched for endpoint ${id}`,
      data: {
        endpointId: id,
        path: ep.path,
        status: 'probing',
        dispatchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
