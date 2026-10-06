/**
 * backend/src/routes/endpointRoutes.js
 * ────────────────────────────────────
 * Router for Endpoints & Attack Surface — mounts under /api/endpoints
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getEndpoints, probeEndpoint } = require('../controllers/endpointController');

// All endpoint routes require authenticated user session
router.use(protect);

// GET /api/endpoints — list user's discovered routes with optional ?scanId= & ?method=
router.get('/', getEndpoints);

// POST /api/endpoints/:id/probe — targeted single-route probe
router.post('/:id/probe', probeEndpoint);

module.exports = router;
