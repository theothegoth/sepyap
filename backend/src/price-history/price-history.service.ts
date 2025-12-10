import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { PriceHistory } from '../entities/PriceHistory.entity';
import { MarketProduct } from '../entities/MarketProduct.entity';

@Injectable()
export class PriceHistoryService {
  private readonly logger = new Logger(PriceHistoryService.name);

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepo: Repository<PriceHistory>,
    @InjectRepository(MarketProduct)
    private marketProductRepo: Repository<MarketProduct>,
  ) {}

  /**
   * Record price change for a MarketProduct
   * Only records if price actually changed
   * Returns old price if changed, null otherwise
   */
  async recordPriceChange(marketProductId: number, price: number, priceCard?: number | null): Promise<number | null> {
    try {
      // Get the last recorded price
      const lastPrice = await this.priceHistoryRepo.findOne({
        where: { market_product_id: marketProductId },
        order: { recorded_at: 'DESC' }
      });

      const oldPrice = lastPrice ? parseFloat(lastPrice.price.toString()) : null;

      // Check if price changed
      const priceChanged = !lastPrice || 
        parseFloat(lastPrice.price.toString()) !== price ||
        (priceCard !== null && priceCard !== undefined && 
         (!lastPrice.price_card || parseFloat(lastPrice.price_card.toString()) !== priceCard));

      if (!priceChanged) {
        this.logger.debug(`[PriceHistory] No price change for MarketProduct ${marketProductId}, skipping record`);
        return null;
      }

      // Record new price
      const priceHistory = this.priceHistoryRepo.create({
        market_product_id: marketProductId,
        price: price,
        price_card: priceCard || null,
        recorded_at: new Date()
      });

      await this.priceHistoryRepo.save(priceHistory);
      this.logger.debug(`[PriceHistory] Recorded price change for MarketProduct ${marketProductId}: ${oldPrice} TL -> ${price} TL${priceCard ? ` (card: ${priceCard} TL)` : ''}`);

      // Return old price for alert checking
      return oldPrice;
    } catch (error) {
      this.logger.error(`[PriceHistory] Error recording price change: ${error.message}`, error.stack);
      // Don't throw - price history is not critical
      return null;
    }
  }

  /**
   * Get price history for a MarketProduct
   */
  async getPriceHistory(marketProductId: number, days: number = 30): Promise<PriceHistory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.priceHistoryRepo.find({
      where: {
        market_product_id: marketProductId,
        recorded_at: LessThan(new Date()) // All records up to now
      },
      order: { recorded_at: 'ASC' },
      take: 1000 // Limit to prevent huge results
    });
  }

  /**
   * Get price history for a Product (across all markets)
   */
  async getProductPriceHistory(productId: number, days: number = 30): Promise<any[]> {
    // Get all MarketProducts for this Product
    const marketProducts = await this.marketProductRepo.find({
      where: { product_master_id: productId },
      relations: ['market']
    });

    // Get price history for each MarketProduct
    const histories = await Promise.all(
      marketProducts.map(async (mp) => {
        const history = await this.getPriceHistory(mp.id, days);
        return {
          market: mp.market.name,
          marketProductId: mp.id,
          currentPrice: mp.price,
          currentPriceCard: mp.price_card,
          history: history.map(h => ({
            price: parseFloat(h.price.toString()),
            priceCard: h.price_card ? parseFloat(h.price_card.toString()) : null,
            recordedAt: h.recorded_at
          }))
        };
      })
    );

    return histories;
  }

  /**
   * Get price trends (price changes over time)
   */
  async getPriceTrends(marketProductId: number, days: number = 30): Promise<{
    currentPrice: number;
    previousPrice: number | null;
    priceChange: number;
    priceChangePercent: number;
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
  }> {
    const history = await this.getPriceHistory(marketProductId, days);
    const marketProduct = await this.marketProductRepo.findOne({
      where: { id: marketProductId }
    });

    if (!marketProduct) {
      throw new Error(`MarketProduct ${marketProductId} not found`);
    }

    const currentPrice = parseFloat(marketProduct.price.toString());
    const prices = history.map(h => parseFloat(h.price.toString()));
    
    const previousPrice = prices.length > 0 ? prices[prices.length - 1] : null;
    const priceChange = previousPrice ? currentPrice - previousPrice : 0;
    const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0;
    
    const allPrices = [currentPrice, ...prices];
    const lowestPrice = Math.min(...allPrices);
    const highestPrice = Math.max(...allPrices);
    const averagePrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

    return {
      currentPrice,
      previousPrice,
      priceChange,
      priceChangePercent,
      lowestPrice,
      highestPrice,
      averagePrice
    };
  }

  /**
   * Clean up old price history (archive records older than specified days)
   */
  async cleanupOldHistory(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.priceHistoryRepo.delete({
      recorded_at: LessThan(cutoffDate)
    });

    this.logger.log(`[PriceHistory] Cleaned up ${result.affected || 0} old price history records`);
    return result.affected || 0;
  }
}

