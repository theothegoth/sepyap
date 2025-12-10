import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Increase body size limit to 50MB to handle large product batches
  app.use(json({ limit: '50mb' }));
  
  // Enable CORS for all origins (Extension needs this)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });

  // Listen on 0.0.0.0 to allow Docker port mapping to work
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
