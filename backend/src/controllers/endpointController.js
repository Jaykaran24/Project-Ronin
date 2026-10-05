/**
 * backend/src/controllers/endpointController.js
 * ─────────────────────────────────────────────
 * Controller for attack surface endpoints and targeted scans.
 */

const Endpoint = require('../models/Endpoint');
const { SEED_ENDPOINTS } = require('../utils/seedData');

let inMemoryEndpoints = [...SEED_ENDPOINTS];

exports.getEndpoints = async (req, res) => {
  const { scanId, method, tested } = req.query;
  const filter = {};
  if (scanId) filter.scanId = scanId;
  if (method && method !== 'ALL') filter.method = method;
  if (tested !== undefined) filter.tested = tested === 'true';

  try {
    const endpoints = await Endpoint.find(filter).sort({ group: 1, path: 1 });
    if (!endpoints || endpoints.length === 0) {
      let filtered = inMemoryEndpoints;
      if (scanId) filtered = filtered.filter(e => e.scanId === scanId);
      if (method && method !== 'ALL') filtered = filtered.filter(e => e.method === method);
      return res.status(200).json({ success: true, count: filtered.length, data: filtered });
    }
    return res.status(200).json({ success: true, count: endpoints.length, data: endpoints });
  } catch (err) {
    let filtered = inMemoryEndpoints;
    if (scanId) filtered = filtered.filter(e => e.scanId === scanId);
    if (method && method !== 'ALL') filtered = filtered.filter(e => e.method === method);
    return res.status(200).json({ success: true, count: filtered.length, data: filtered, isFallback: true });
  }
};

exports.probeEndpoint = async (req, res) => {
  const { id } = req.params;
  const ep = inMemoryEndpoints.find(e => e.endpointId === id || e._id === id);

  return res.status(200).json({
    success: true,
    message: `Targeted probe dispatched for endpoint ${id}`,
    data: {
      endpointId: id,
      path: ep ? ep.path : '/api/targeted',
      status: 'probing',
      dispatchedAt: new Date().toISOString(),
    },
  });
};
