import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Watchlist } from '../entities/Watchlist.entity';
import { Alert } from '../entities/Alert.entity';
import { MarketProduct } from '../entities/MarketProduct.entity';
import { Product } from '../entities/Product.entity';
import { PriceHistoryService } from '../price-history/price-history.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly DEFAULT_DROP_THRESHOLD = 5; // 5% price drop triggers alert

  constructor(
    @InjectRepository(Watchlist)
    private watchlistRepo: Repository<Watchlist>,
    @InjectRepository(Alert)
    private alertRepo: Repository<Alert>,
    @InjectRepository(MarketProduct)
    private marketProductRepo: Repository<MarketProduct>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private priceHistoryService: PriceHistoryService,
  ) { }

  /**
   * Add a product to user's watchlist
   */
  async addToWatchlist(userId: string, productId: number, targetPrice?: number, targetPercent?: number): Promise<Watchlist> {
    // Check if already in watchlist
    let watchlist = await this.watchlistRepo.findOne({
      where: { user_id: userId, product_id: productId }
    });

    if (watchlist) {
      // Update existing watchlist entry
      watchlist.target_price = targetPrice || null;
      watchlist.target_percent = targetPercent || null;
      watchlist.is_active = true;
      watchlist.updated_at = new Date();
      return this.watchlistRepo.save(watchlist);
    }

    // Create new watchlist entry
    watchlist = this.watchlistRepo.create({
      user_id: userId,
      product_id: productId,
      target_price: targetPrice || null,
      target_percent: targetPercent || null,
      is_active: true
    });

    return this.watchlistRepo.save(watchlist);
  }

  /**
   * Remove product from watchlist
   */
  async removeFromWatchlist(userId: string, productId: number): Promise<void> {
    await this.watchlistRepo.delete({
      user_id: userId,
      product_id: productId
    });
  }

  /**
   * Get user's watchlist
   */
  async getWatchlist(userId: string): Promise<Watchlist[]> {
    return this.watchlistRepo.find({
      where: { user_id: userId, is_active: true },
      relations: ['product']
    });
  }

  /**
   * Check for price drops and create alerts
   * This should be called when a price change is detected
   */
  async checkPriceDrops(marketProductId: number, oldPrice: number, newPrice: number): Promise<void> {
    const marketProduct = await this.marketProductRepo.findOne({
      where: { id: marketProductId },
      relations: ['product']
    });

    if (!marketProduct || !marketProduct.product_master_id) {
      return; // No product linked, skip
    }

    const priceChange = oldPrice - newPrice; // Positive if price dropped
    const priceChangePercent = (priceChange / oldPrice) * 100;

    // Only alert on price drops (not increases)
    if (priceChange <= 0) {
      return;
    }

    // Get all watchlist entries for this product
    const watchlistEntries = await this.watchlistRepo.find({
      where: { product_id: marketProduct.product_master_id, is_active: true }
    });

    for (const entry of watchlistEntries) {
      let shouldAlert = false;

      // Check target price threshold
      if (entry.target_price && newPrice <= entry.target_price) {
        shouldAlert = true;
        this.logger.log(`[Alert] Price dropped to ${newPrice} TL (target: ${entry.target_price} TL) for Product ${entry.product_id}`);
      }

      // Check target percent threshold
      if (entry.target_percent && priceChangePercent >= entry.target_percent) {
        shouldAlert = true;
        this.logger.log(`[Alert] Price dropped ${priceChangePercent.toFixed(1)}% (target: ${entry.target_percent}%) for Product ${entry.product_id}`);
      }

      // Default: Alert on any 5%+ drop
      if (!entry.target_price && !entry.target_percent && priceChangePercent >= this.DEFAULT_DROP_THRESHOLD) {
        shouldAlert = true;
        this.logger.log(`[Alert] Price dropped ${priceChangePercent.toFixed(1)}% (default threshold) for Product ${entry.product_id}`);
      }

      if (shouldAlert) {
        // Check if alert already exists for this price drop (avoid duplicates)
        const existingAlert = await this.alertRepo.findOne({
          where: {
            watchlist_id: entry.id,
            market_product_id: marketProductId,
            new_price: newPrice,
            is_dismissed: false
          }
        });

        if (!existingAlert) {
          const alert = this.alertRepo.create({
            user_id: entry.user_id,
            watchlist_id: entry.id,
            market_product_id: marketProductId,
            old_price: oldPrice,
            new_price: newPrice,
            price_change: priceChange,
            price_change_percent: priceChangePercent,
            is_read: false,
            is_dismissed: false
          });

          await this.alertRepo.save(alert);
          this.logger.log(`[Alert] Created alert for user ${entry.user_id}, Product ${entry.product_id}, MarketProduct ${marketProductId}`);
        }
      }
    }
  }

  /**
   * Get user's alerts
   */
  async getUserAlerts(userId: string, unreadOnly: boolean = false): Promise<Alert[]> {
    const query = this.alertRepo.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.marketProduct', 'marketProduct')
      .leftJoinAndSelect('marketProduct.market', 'market')
      .leftJoinAndSelect('alert.watchlist', 'watchlist')
      .leftJoinAndSelect('watchlist.product', 'product')
      .where('alert.user_id = :userId', { userId })
      .andWhere('alert.is_dismissed = false')
      .orderBy('alert.created_at', 'DESC');

    if (unreadOnly) {
      query.andWhere('alert.is_read = false');
    }

    return query.getMany();
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: number, userId: string): Promise<void> {
    await this.alertRepo.update(
      { id: alertId, user_id: userId },
      { is_read: true }
    );
  }

  /**
   * Dismiss alert
   */
  async dismissAlert(alertId: number, userId: string): Promise<void> {
    await this.alertRepo.update(
      { id: alertId, user_id: userId },
      { is_dismissed: true }
    );
  }

  async getAlertStats(userId: string): Promise<{
    total: number;
    unread: number;
    dismissed: number;
  }> {
    const total = await this.alertRepo.count({
      where: { user_id: userId, is_dismissed: false }
    });

    const unread = await this.alertRepo.count({
      where: { user_id: userId, is_read: false, is_dismissed: false }
    });

    const dismissed = await this.alertRepo.count({
      where: { user_id: userId, is_dismissed: true }
    });

    return { total, unread, dismissed };
  }

  /**
   * Mark all alerts as read for user
   */
  async markAllAlertsAsRead(userId: string): Promise<void> {
    await this.alertRepo.update(
      { user_id: userId, is_dismissed: false },
      { is_read: true }
    );
  }

  /**
   * Dismiss all alerts for user
   */
  async dismissAllAlerts(userId: string): Promise<void> {
    await this.alertRepo.update(
      { user_id: userId },
      { is_dismissed: true }
    );
  }
}

