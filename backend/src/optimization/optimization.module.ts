import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptimizationController, ProductComparisonController } from './optimization.controller';
import { OptimizationService } from './optimization.service';
import { MarketProduct } from '../entities/MarketProduct.entity';
import { Market } from '../entities/Market.entity';
import { Product } from '../entities/Product.entity';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketProduct, Market, Product]),
    MatchingModule,
  ],
  controllers: [OptimizationController, ProductComparisonController],
  providers: [OptimizationService],
  exports: [OptimizationService],
})
export class OptimizationModule {}
