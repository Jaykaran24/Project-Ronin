/**
 * backend/src/config/swagger.js
 * ──────────────────────────────
 * swagger-jsdoc configuration.
 * Swagger UI is served at GET /api/docs by app.js.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'RONIN API',
      version:     '1.0.0',
      description: 'Autonomous API Security Platform — Backend REST API',
      contact: {
        name: 'Project Ronin',
        url:  'https://github.com/Jaykaran24/Project-Ronin',
      },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ── Signup ──────────────────────────────────────────────────────────
        SignupRequest: {
          type: 'object',
          required: ['fullName', 'email', 'password'],
          properties: {
            fullName: { type: 'string', example: 'Alex Morgan',         maxLength: 100 },
            email:    { type: 'string', example: 'user@example.com',    format: 'email' },
            password: { type: 'string', example: 'StrongPassword123!',  minLength: 8 },
          },
        },
        SignupSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string',  example: 'Account created successfully.' },
            user: {
              type: 'object',
              properties: {
                id:       { type: 'string', example: '64a1f3c2e4b0a12345678901' },
                fullName: { type: 'string', example: 'Alex Morgan' },
                email:    { type: 'string', example: 'user@example.com' },
              },
            },
          },
        },
        // ── Login ───────────────────────────────────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', example: 'user@example.com', format: 'email' },
            password: { type: 'string', example: 'StrongPassword123!' },
          },
        },
        LoginSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            token:   { type: 'string',  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: {
              type: 'object',
              properties: {
                id:       { type: 'string' },
                fullName: { type: 'string' },
                email:    { type: 'string' },
                role:     { type: 'string', example: 'operator' },
              },
            },
          },
        },
        // ── Errors ──────────────────────────────────────────────────────────
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'An account with this email already exists.' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'Email address is required.' },
            errors: {
              type:  'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  msg:   { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth',   description: 'Authentication endpoints' },
      { name: 'Health', description: 'API status checks' },
    ],
  },
  // Scan all route + controller files for @swagger JSDoc comments
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/app.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
