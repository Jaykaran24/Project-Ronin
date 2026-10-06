/**
 * backend/src/routes/sandboxRoutes.js
 * ───────────────────────────────────
 * Router for Sandbox & PoC Container runs — mounts under /api/sandbox
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSandboxRuns, getSandboxRunById } = require('../controllers/sandboxController');

// All sandbox routes require authenticated user session
router.use(protect);

// GET /api/sandbox — list user's container execution history
router.get('/', getSandboxRuns);

// GET /api/sandbox/:id — get raw stdout/stderr logs
router.get('/:id', getSandboxRunById);

module.exports = router;
