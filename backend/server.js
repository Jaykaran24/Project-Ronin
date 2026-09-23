/**
 * backend/server.js
 * ──────────────────
 * Entry point — loads environment, connects to MongoDB, starts HTTP server.
 */

require('dotenv').config();

const app       = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[SERVER] Ronin API running in ${process.env.NODE_ENV} mode → http://localhost:${PORT}`);
    console.log(`[SERVER] Health check → http://localhost:${PORT}/api/health`);
  });
});
