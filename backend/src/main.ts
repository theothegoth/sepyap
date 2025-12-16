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
  
  // Enable CORS - more secure but still allows extension
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://127.0.0.1:3001'];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or extension)
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  // Listen on 0.0.0.0 to allow Docker port mapping to work
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
