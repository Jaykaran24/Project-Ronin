/**
 * backend/src/routes/scanRoutes.js
 * ────────────────────────────────
 * Router for Scan operations — mounts under /api/scans
 */

const express = require('express');
const router = express.Router();
const { getScans, getActiveScan, getScanById, createScan, updateScanStatus, getScanReport } = require('../controllers/scanController');

// GET /api/scans — list all scans
router.get('/', getScans);

// GET /api/scans/active — get current active running scan
router.get('/active', getActiveScan);

// GET /api/scans/:id/report — get or download markdown report for scan
router.get('/:id/report', getScanReport);

// GET /api/scans/:id — get scan details by ID
router.get('/:id', getScanById);

// POST /api/scans — launch a new scan
router.post('/', createScan);

// PATCH /api/scans/:id/status — update status (pause, abort, complete)
router.patch('/:id/status', updateScanStatus);

module.exports = router;
