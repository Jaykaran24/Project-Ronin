/**
 * backend/src/app.js
 * ────────────────────
 * Express application configuration.
 * Separate from server.js so the app can be cleanly imported in tests.
 */

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const swaggerUi    = require('swagger-ui-express');
const swaggerSpec  = require('./config/swagger');

const authRoutes   = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
// Disable contentSecurityPolicy so Swagger UI loads its own inline scripts
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS — allow the Vite frontend origin ────────────────────────────────────
app.use(
  cors({
    origin:         process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Request logging (dev only) ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ── Rate limiting — 20 auth requests / 15 min / IP ──────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => process.env.NODE_ENV === 'test', // disable during tests
});

// ── Swagger UI — served at /api/docs ─────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'RONIN API Docs',
  swaggerOptions:  { persistAuthorization: true },
}));

// ── JSON spec endpoint (useful for tooling) ──────────────────────────────────
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:   { type: boolean, example: true }
 *                 message:   { type: string,  example: "Ronin API is operational." }
 *                 version:   { type: string,  example: "1.0.0" }
 *                 timestamp: { type: string,  format: date-time }
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success:   true,
    message:   'Ronin API is operational.',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 — Unknown routes ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Centralised error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
