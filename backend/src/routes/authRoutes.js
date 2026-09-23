/**
 * backend/src/routes/authRoutes.js
 * ─────────────────────────────────
 * Authentication router — mounts under /api/auth
 */

const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();

const { signup, login, getMe } = require('../controllers/authController');
const { protect }               = require('../middleware/auth');

// ── Validation rule sets ─────────────────────────────────────────────────────
const signupValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ max: 100 }).withMessage('Full name must be at most 100 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/signup  — Gap 1 fix: was /register
router.post('/signup', signupValidation, signup);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// GET  /api/auth/me  (JWT protected)
router.get('/me', protect, getMe);

module.exports = router;
