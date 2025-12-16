import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { IngestModule } from './ingest/ingest.module';
import { OptimizationModule } from './optimization/optimization.module';
import { MatchingModule } from './matching/matching.module';
import { PriceHistoryModule } from './price-history/price-history.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      username: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'sepyap',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      // Connection pooling for better performance
      extra: {
        max: 20, // Maximum pool size
        min: 5,  // Minimum pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
      logging: false,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // Time window in milliseconds (60 seconds)
      limit: 100, // Max requests per window
    }]),
    IngestModule,
    OptimizationModule,
    MatchingModule,
    PriceHistoryModule,
    AlertsModule,
  ],
})
export class AppModule {}

