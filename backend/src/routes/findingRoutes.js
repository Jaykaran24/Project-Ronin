/**
 * backend/src/routes/findingRoutes.js
 * ───────────────────────────────────
 * Router for Findings — mounts under /api/findings
 */

const express = require('express');
const router = express.Router();
const { getFindings, getFindingById, createFinding } = require('../controllers/findingController');

// GET /api/findings — list all verified findings with optional ?scanId= & ?severity=
router.get('/', getFindings);

// GET /api/findings/:id — get finding detail and PoC
router.get('/:id', getFindingById);

// POST /api/findings — register finding from scanner
router.post('/', createFinding);

module.exports = router;
