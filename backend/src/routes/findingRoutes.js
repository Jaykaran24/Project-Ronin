/**
 * backend/src/routes/findingRoutes.js
 * ───────────────────────────────────
 * Router for Findings — mounts under /api/findings
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getFindings, getFindingById, createFinding } = require('../controllers/findingController');

// All findings endpoints require authenticated user session
router.use(protect);

// GET /api/findings — list user's verified findings with optional ?scanId= & ?severity=
router.get('/', getFindings);

// GET /api/findings/:id — get finding detail and PoC
router.get('/:id', getFindingById);

// POST /api/findings — register finding from scanner
router.post('/', createFinding);

module.exports = router;
