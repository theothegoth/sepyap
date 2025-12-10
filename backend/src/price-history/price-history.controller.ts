import { Controller, Get, Param, Query } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service';

@Controller('api/price-history')
export class PriceHistoryController {
  constructor(private readonly priceHistoryService: PriceHistoryService) {}

  @Get('market-product/:marketProductId')
  async getMarketProductHistory(
    @Param('marketProductId') marketProductId: number,
    @Query('days') days?: string
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const history = await this.priceHistoryService.getPriceHistory(marketProductId, daysNum);
    return {
      marketProductId,
      days: daysNum,
      history: history.map(h => ({
        price: parseFloat(h.price.toString()),
        priceCard: h.price_card ? parseFloat(h.price_card.toString()) : null,
        recordedAt: h.recorded_at
      }))
    };
  }

  @Get('product/:productId')
  async getProductHistory(
    @Param('productId') productId: number,
    @Query('days') days?: string
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const history = await this.priceHistoryService.getProductPriceHistory(productId, daysNum);
    return {
      productId,
      days: daysNum,
      markets: history
    };
  }

  @Get('trends/:marketProductId')
  async getPriceTrends(
    @Param('marketProductId') marketProductId: number,
    @Query('days') days?: string
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const trends = await this.priceHistoryService.getPriceTrends(marketProductId, daysNum);
    return {
      marketProductId,
      days: daysNum,
      ...trends
    };
  }
}

