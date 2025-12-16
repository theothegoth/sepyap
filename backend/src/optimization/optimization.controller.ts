import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { OptimizationService } from './optimization.service';

@Controller('api/optimize')
export class OptimizationController {
  private readonly logger = new Logger(OptimizationController.name);

  constructor(private readonly optimizationService: OptimizationService) {}

  @Post()
  async optimizeCart(
    @Body()
    payload: {
      items: { query?: string; productId?: number; quantity: number }[];
      includeBrands?: string[];
      excludeBrands?: string[];
      allowedMarkets?: string[];
    },
  ) {
    this.logger.log(`Optimizing cart with ${payload.items.length} items.`);
    const includeBrands = payload.includeBrands || [];
    const excludeBrands = payload.excludeBrands || [];
    const allowedMarkets = payload.allowedMarkets || [];

    const result = await this.optimizationService.findCheapestCart(
      payload.items,
      includeBrands,
      excludeBrands,
      allowedMarkets,
    );
    return result;
  }
}

@Controller('api/products')
export class ProductComparisonController {
  private readonly logger = new Logger(ProductComparisonController.name);

  constructor(private readonly optimizationService: OptimizationService) {}

  @Get(':productId/compare')
  async compareProduct(@Param('productId') productId: number) {
    this.logger.log(`Comparing prices for Product ID ${productId}`);
    return this.optimizationService.compareProductPrices(productId);
  }
}

@Controller('api/markets')
export class MarketsController {
  private readonly logger = new Logger(MarketsController.name);

  constructor(private readonly optimizationService: OptimizationService) {}

  @Get()
  async getAll() {
    this.logger.log('Fetching all markets');
    return this.optimizationService.getAllMarkets();
  }
}