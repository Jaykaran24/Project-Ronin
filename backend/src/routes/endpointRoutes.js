/**
 * backend/src/routes/endpointRoutes.js
 * ────────────────────────────────────
 * Router for Endpoints & Attack Surface — mounts under /api/endpoints
 */

const express = require('express');
const router = express.Router();
const { getEndpoints, probeEndpoint } = require('../controllers/endpointController');

// GET /api/endpoints — list discovered routes with optional ?scanId= & ?method=
router.get('/', getEndpoints);

// POST /api/endpoints/:id/probe — targeted single-route probe
router.post('/:id/probe', probeEndpoint);

module.exports = router;
