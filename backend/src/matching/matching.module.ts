import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { Product } from '../entities/Product.entity';
import { MarketProduct } from '../entities/MarketProduct.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, MarketProduct]),
  ],
  providers: [MatchingService],
  controllers: [MatchingController],
  exports: [MatchingService],
})
export class MatchingModule {}

