/**
 * backend/src/config/db.js
 * ─────────────────────────
 * Mongoose connection with retry logic and graceful shutdown.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[DB] MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[DB] MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[DB] Connection failed: ${err.message}`);

    if (process.env.NODE_ENV === 'development') {
      console.warn('[DB] Running in development mode — continuing without DB.');
      console.warn('[DB] Dev hardcoded credentials are active (see authController.js).');
    } else {
      process.exit(1);
    }
  }
};

// Graceful shutdown on app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[DB] MongoDB connection closed (SIGINT).');
  process.exit(0);
});

module.exports = connectDB;
