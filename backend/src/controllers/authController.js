/**
 * backend/src/controllers/authController.js
 * ───────────────────────────────────────────
 * Handles user signup, login, and profile retrieval.
 */

const jwt  = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// ── Helper: sign a JWT ───────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// Gap fix: 201 response does NOT return a JWT token (per issue spec)
// ────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new RONIN dashboard account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *           example:
 *             fullName: Alex Morgan
 *             email: user@example.com
 *             password: StrongPassword123!
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignupSuccess'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.signup = async (req, res, next) => {
  try {
    // 1. Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: errors.array()[0].msg,
        errors:  errors.array(),
      });
    }

    const { fullName, email, password } = req.body;

    // 2. Check for existing account (application-level check before DB write)
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 3. Create user — password hashed via Mongoose pre-save hook
    const user = await User.create({
      fullName: fullName.trim(),
      email,
      password,
    });

    // 4. Return 201 — no JWT token in signup response (per security spec)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id:       user._id,
        fullName: user.fullName,
        email:    user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Sign in to RONIN
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: user@example.com
 *             password: StrongPassword123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccess'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: errors.array()[0].msg,
        errors:  errors.array(),
      });
    }

    const { email, password } = req.body;

    // Fetch user with password field (hidden by default via select:false)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The email or password is incorrect.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'The email or password is incorrect.',
      });
    }

    const token = signToken(user._id);
    return res.status(200).json({
      success: true,
      token,
      user: {
        id:       user._id,
        fullName: user.fullName,
        email:    user.email,
        role:     user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me   (protected)
// ────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authorized
 */
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id:        req.user._id,
      fullName:  req.user.fullName,
      email:     req.user.email,
      role:      req.user.role,
      is_active: req.user.is_active,
      createdAt: req.user.createdAt,
    },
  });
};
