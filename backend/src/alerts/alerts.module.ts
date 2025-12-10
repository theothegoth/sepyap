import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { Watchlist } from '../entities/Watchlist.entity';
import { Alert } from '../entities/Alert.entity';
import { MarketProduct } from '../entities/MarketProduct.entity';
import { Product } from '../entities/Product.entity';
import { PriceHistoryModule } from '../price-history/price-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Watchlist, Alert, MarketProduct, Product]),
    PriceHistoryModule,
  ],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}

