import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { MarketProduct } from '../entities/MarketProduct.entity';
import { Product } from '../entities/Product.entity';
import { Market } from '../entities/Market.entity';
import { MatchingModule } from '../matching/matching.module';
import { PriceHistoryModule } from '../price-history/price-history.module';
import { AlertsModule } from '../alerts/alerts.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketProduct, Product, Market]),
    MatchingModule,
    PriceHistoryModule,
    AlertsModule,
    SearchModule,
  ],
  controllers: [IngestController],
  providers: [
    IngestService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [IngestService],
})
export class IngestModule { }
