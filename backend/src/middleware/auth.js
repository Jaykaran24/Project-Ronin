/**
 * backend/src/middleware/auth.js
 * ───────────────────────────────
 * JWT verification middleware — protects authenticated routes.
 * Attaches the decoded user payload to req.user.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Accept token from Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach the live user document (without password) to the request
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user no longer exists.',
      });
    }

    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expired — please sign in again.'
        : 'Not authorized — invalid token.';

    return res.status(401).json({ success: false, message });
  }
};

module.exports = { protect };
