/**
 * backend/src/middleware/errorHandler.js
 * ────────────────────────────────────────
 * Centralised Express error handler.
 * Always returns a consistent JSON error envelope.
 */

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message    = err.message || 'Internal server error';

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 404;
    message    = 'Resource not found.';
  }

  // Mongoose duplicate key (email already registered)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message    = `An account with this ${field} already exists.`;
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message    = Object.values(err.errors).map((e) => e.message).join(' ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Session expired — please sign in again.';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${statusCode} — ${message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
