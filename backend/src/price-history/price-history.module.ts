import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceHistoryService } from './price-history.service';
import { PriceHistoryController } from './price-history.controller';
import { PriceHistory } from '../entities/PriceHistory.entity';
import { MarketProduct } from '../entities/MarketProduct.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceHistory, MarketProduct]),
  ],
  providers: [PriceHistoryService],
  controllers: [PriceHistoryController],
  exports: [PriceHistoryService],
})
export class PriceHistoryModule {}

