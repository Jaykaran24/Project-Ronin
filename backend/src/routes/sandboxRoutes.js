/**
 * backend/src/routes/sandboxRoutes.js
 * ───────────────────────────────────
 * Router for Sandbox & PoC Container runs — mounts under /api/sandbox
 */

const express = require('express');
const router = express.Router();
const { getSandboxRuns, getSandboxRunById } = require('../controllers/sandboxController');

// GET /api/sandbox — list container execution history
router.get('/', getSandboxRuns);

// GET /api/sandbox/:id — get raw stdout/stderr logs
router.get('/:id', getSandboxRunById);

module.exports = router;
