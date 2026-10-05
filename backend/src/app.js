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

const authRoutes     = require('./routes/authRoutes');
const scanRoutes     = require('./routes/scanRoutes');
const findingRoutes  = require('./routes/findingRoutes');
const endpointRoutes = require('./routes/endpointRoutes');
const sandboxRoutes  = require('./routes/sandboxRoutes');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  return allowedOrigins.includes(origin)
    || /^https?:\/\/localhost:\d+$/.test(origin)
    || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)
    || /^https?:\/\/.*\.devtunnels\.ms$/.test(origin);
};

// ── Security headers ─────────────────────────────────────────────────────────
// Disable contentSecurityPolicy so Swagger UI loads its own inline scripts
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS — allow the Vite frontend origins used for local and tunnel previews ────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/scans',     scanRoutes);
app.use('/api/findings',  findingRoutes);
app.use('/api/endpoints', endpointRoutes);
app.use('/api/sandbox',   sandboxRoutes);

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
