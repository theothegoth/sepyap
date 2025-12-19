import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  
  // Increase body size limit to 50MB to handle large product batches (up to 2000 products)
  app.use(json({ limit: '50mb' }));
  
  // Log all requests for debugging (especially CORS issues)
  app.use((req, res, next) => {
    if (req.path === '/api/ingest') {
      console.log(`[Request] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'} - Content-Type: ${req.headers['content-type'] || 'none'}`);
    }
    next();
  });

  // Ensure CORS headers are always set on responses (especially for Chrome extensions)
  // This middleware runs AFTER CORS middleware to ensure headers are set
  app.use((req, res, next) => {
    // Override CORS headers to ensure they're always set
    const origin = req.headers.origin;
    if (origin && origin.startsWith('chrome-extension://')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // No origin or other origin - allow all for extension requests
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id, Content-Type');
    
    // Also set headers on response finish to ensure they're sent
    const originalEnd = res.end;
    res.end = function(...args) {
      res.setHeader('Access-Control-Allow-Origin', origin && origin.startsWith('chrome-extension://') ? origin : '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      originalEnd.apply(res, args);
    };
    
    next();
  });

  // Increase request timeout for ingest operations (up to 5 minutes for large batches)
  app.use((req, res, next) => {
    // Set timeout to 5 minutes for ingest endpoint
    if (req.path === '/api/ingest' && req.method === 'POST') {
      req.setTimeout(5 * 60 * 1000); // 5 minutes
      res.setTimeout(5 * 60 * 1000); // 5 minutes
    }
    next();
  });
  
  // Input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: false, // Don't throw error, just strip
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Enable CORS - allow Chrome extensions and web frontend
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://127.0.0.1:3001'];
  
  // Handle OPTIONS requests manually before CORS middleware
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      console.log(`[CORS] OPTIONS request for ${req.path} - Origin: ${req.headers.origin || 'none'}`);
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).send();
    }
    next();
  });

  app.enableCors({
    origin: (origin, callback) => {
      // Log all CORS checks for debugging
      console.log(`[CORS] Checking origin: ${origin || 'none'}`);
      
      // Always allow requests with no origin (mobile apps, Postman, curl, some extension requests)
      if (!origin) {
        console.log(`[CORS] Allowing request with no origin`);
        callback(null, true);
        return;
      }
      
      // Always allow Chrome extensions (they use chrome-extension:// protocol)
      if (origin.startsWith('chrome-extension://')) {
        console.log(`[CORS] Allowing Chrome extension: ${origin}`);
        callback(null, true);
        return;
      }
      
      // Allow configured web origins
      if (allowedOrigins.includes(origin)) {
        console.log(`[CORS] Allowing configured origin: ${origin}`);
        callback(null, true);
        return;
      }
      
      // Log rejected origins for debugging
      console.log(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Length', 'X-Request-Id', 'Content-Type'],
    credentials: true,
    maxAge: 86400, // 24 hours - cache preflight requests
    preflightContinue: false, // Let NestJS handle preflight
    optionsSuccessStatus: 204, // Return 204 for successful OPTIONS
  });

  // Listen on 0.0.0.0 to allow Docker port mapping to work
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
