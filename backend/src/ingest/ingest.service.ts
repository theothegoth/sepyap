import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketProduct } from '../entities/MarketProduct.entity';
import { Product } from '../entities/Product.entity';
import { Market } from '../entities/Market.entity';
import { MatchingService } from '../matching/matching.service';
import { PriceHistoryService } from '../price-history/price-history.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  
  // Cache for market lookups (reduces database queries)
  private marketCache: Map<string, Market> = new Map();
  private marketCacheExpiry: Map<string, number> = new Map();
  private readonly MARKET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(MarketProduct)
    private marketProductRepo: Repository<MarketProduct>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Market)
    private marketRepo: Repository<Market>,
    private matchingService: MatchingService,
    private priceHistoryService: PriceHistoryService,
    private alertsService: AlertsService,
  ) {}

  async processIngestedProducts(items: any[]): Promise<any> {
    let savedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errors = 0;

    this.logger.log(`Processing ${items.length} products...`);
    
    // Log first item to debug property field
    if (items.length > 0) {
      this.logger.debug(`Sample item fields: ${Object.keys(items[0]).join(', ')}`);
      if (items[0].property) {
        this.logger.debug(`Sample item property: "${items[0].property}"`);
      }
    }

    // Batch processing: Process products in batches of 50 for better performance
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    this.logger.log(`Processing in ${batches.length} batches of ${BATCH_SIZE}...`);

    for (const batch of batches) {
      // Process batch in a transaction for better performance
      const priceHistoryQueue: Array<{marketProductId: number, price: number, priceCard?: number | null}> = [];
      
      await this.marketProductRepo.manager.transaction(async (transactionalEntityManager) => {
        for (const item of batch) {
          try {
            const result = await this.saveProduct(item, transactionalEntityManager);
            if (result.created) createdCount++;
            else updatedCount++;
            savedCount++;
            
            // Queue price history to record after transaction commits
            if (result.priceHistoryInfo) {
              priceHistoryQueue.push(result.priceHistoryInfo);
            }
          } catch (err) {
            this.logger.error(`Failed to save product ${item.title}: ${err.message}`);
            errors++;
          }
        }
      });
      
      // Record price history after transaction commits (to avoid foreign key constraint errors)
      for (const phInfo of priceHistoryQueue) {
        try {
          const oldPrice = await this.priceHistoryService.recordPriceChange(
            phInfo.marketProductId,
            phInfo.price,
            phInfo.priceCard
          );
          
          // Check for price drop alerts if price decreased
          if (oldPrice !== null && oldPrice > phInfo.price) {
            try {
              await this.alertsService.checkPriceDrops(phInfo.marketProductId, oldPrice, phInfo.price);
            } catch (error) {
              this.logger.error(`[Alerts] Error checking price drops: ${error.message}`);
              // Don't fail if alerts fail
            }
          }
        } catch (error) {
          this.logger.error(`[PriceHistory] Error recording price change: ${error.message}`);
          // Don't fail if price history fails
        }
      }
    }

    this.logger.log(`Summary: ${createdCount} created, ${updatedCount} updated, ${errors} errors`);
    return { savedCount, createdCount, updatedCount, errors };
  }

  // Get or create market with caching
  private async getOrCreateMarket(marketName: string, transactionalEntityManager?: any): Promise<Market> {
    const cacheKey = marketName.toLowerCase();
    const now = Date.now();
    
    // Check cache
    if (this.marketCache.has(cacheKey)) {
      const expiry = this.marketCacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        return this.marketCache.get(cacheKey)!;
      }
    }

    // Query database
    const repo = transactionalEntityManager?.getRepository(Market) || this.marketRepo;
    let market = await repo
      .createQueryBuilder('market')
      .where('LOWER(market.name) = LOWER(:name)', { name: marketName })
      .getOne();
    
    if (!market) {
      // Create new market
      market = repo.create({
        name: marketName,
        base_url: '', // Will be updated if product_url is available
        delivery_regions: ['TR'],
        min_order_amount: 0
      });
      market = await repo.save(market);
    }

    // Update cache
    this.marketCache.set(cacheKey, market);
    this.marketCacheExpiry.set(cacheKey, now + this.MARKET_CACHE_TTL);
    
    return market;
  }

  private async saveProduct(rawItem: any, transactionalEntityManager?: any) {
    // Get or create market (with caching)
    const market = await this.getOrCreateMarket(rawItem.market, transactionalEntityManager);
    
    // Update market base_url if we have a product URL
    if (rawItem.product_url && !market.base_url) {
      try {
        market.base_url = new URL(rawItem.product_url).origin;
        const repo = transactionalEntityManager?.getRepository(Market) || this.marketRepo;
        await repo.save(market);
      } catch (e) {
        // Ignore URL parsing errors
      }
    }

    const price = typeof rawItem.price === 'string' ? parseFloat(rawItem.price) : rawItem.price;
    const priceCard = rawItem.price_card ? (typeof rawItem.price_card === 'string' ? parseFloat(rawItem.price_card) : rawItem.price_card) : null;

    // Use repository from transaction if available
    const repo = transactionalEntityManager?.getRepository(MarketProduct) || this.marketProductRepo;

    let marketProduct;
    let created = false;

    // Priority 1: Match by URL if it's a unique product URL (most reliable)
    // This prevents products with same title but different URLs from being merged
    if (rawItem.product_url) {
      // Check if it's a product detail URL (not a category page)
      const urlLower = rawItem.product_url.toLowerCase();
      const urlParts = rawItem.product_url.split('/').filter(p => p);
      
      // Happy Center specific check: Product URLs are like /Product_Name_Slug or /Category/Product_Name_Slug
      // Category pages have query params like ?page= or are listing pages
      const isHappyCenterProduct = urlLower.includes('happycenter.com.tr') &&
                                   !urlLower.includes('?page=') &&
                                   !urlLower.includes('?q=') &&
                                   !urlLower.includes('search=') &&
                                   !urlLower.includes('/arama') &&
                                   // Product URLs typically have product name in the last segment (not category names)
                                   urlParts.length > 0 &&
                                   // Last segment should be a product slug (contains underscores, not just category name)
                                   urlParts[urlParts.length - 1].includes('_');
      
      const isProductUrl = urlLower.includes('/urun/') || 
                          urlLower.includes('/product/') ||
                          urlLower.includes('/p/') ||
                          urlLower.includes('/aktuel-urunler/') ||
                          urlLower.includes('-p-') ||
                          urlLower.includes('/kapida/') ||
                          isHappyCenterProduct;
      
      if (isProductUrl) {
        // Clean URL (remove query params and fragments for better matching)
        const cleanUrl = rawItem.product_url.split('?')[0].split('#')[0];
        marketProduct = await repo
          .createQueryBuilder('mp')
          .where('mp.url LIKE :urlPattern', { urlPattern: `${cleanUrl}%` })
          .andWhere('mp.market_id = :marketId', { marketId: market.id })
          .getOne();
        
        if (marketProduct) {
          this.logger.debug(`[Dedup] Matched by URL: ${cleanUrl.substring(0, 60)}`);
        }
      }
    }

    // Priority 2: Match by title + price (for category pages where URL is not unique)
    // Products with same title but different prices are DIFFERENT products
    // This prevents "Yerli Muz 29.99 TL" and "Yerli Muz 139.99 TL" from being merged
    if (!marketProduct && rawItem.title) {
      // Check if URL is a category page (not a unique product URL)
      const urlLower = rawItem.product_url?.toLowerCase() || '';
      const urlParts = rawItem.product_url?.split('/').filter(p => p) || [];
      
      // Happy Center specific check: Product URLs have product slug pattern (underscores in last segment)
      const isHappyCenterProductUrl = urlLower.includes('happycenter.com.tr') &&
                                      !urlLower.includes('?page=') &&
                                      !urlLower.includes('?q=') &&
                                      !urlLower.includes('search=') &&
                                      !urlLower.includes('/arama') &&
                                      urlParts.length > 0 &&
                                      urlParts[urlParts.length - 1].includes('_');
      
      // Happy Center specific check: Category pages have query params or don't have product slug pattern
      const isHappyCenterCategory = urlLower.includes('happycenter.com.tr') &&
                                    (urlLower.includes('?page=') ||
                                     urlLower.includes('?q=') ||
                                     urlLower.includes('search=') ||
                                     urlLower.includes('/arama') ||
                                     urlParts.length === 0 ||
                                     !urlParts[urlParts.length - 1].includes('_'));
      
      const isCategoryPage = !rawItem.product_url || 
                            (!urlLower.includes('/urun/') && 
                             !urlLower.includes('/product/') &&
                             !urlLower.includes('/p/') &&
                             !urlLower.includes('/aktuel-urunler/') &&
                             !urlLower.includes('-p-') &&
                             !urlLower.includes('/kapida/') &&
                             !isHappyCenterProductUrl) ||
                            isHappyCenterCategory;
      
      if (isCategoryPage) {
        // On category pages, match by title + price (same product = same title + same price)
        // This is crucial: same title + same price = same product (should be updated, not duplicated)
        // Different title + same price = different product (should be created)
        // Same title + different price = different product (should be created)
        marketProduct = await repo
          .createQueryBuilder('mp')
          .where('LOWER(TRIM(mp.title)) = LOWER(TRIM(:title))', { title: rawItem.title })
          .andWhere('mp.market_id = :marketId', { marketId: market.id })
          .andWhere('ABS(mp.price - :price) < 0.01', { price }) // Match exact price (within 0.01 TL tolerance)
          .getOne();
        
        if (marketProduct) {
          this.logger.debug(`[Dedup] Matched by Title+Price (category page): "${rawItem.title}" @ ${price} TL`);
        }
      } else {
        // If we have a unique product URL but didn't match by URL alone, try matching by title + URL
        const cleanUrl = rawItem.product_url.split('?')[0].split('#')[0];
        marketProduct = await repo
          .createQueryBuilder('mp')
          .where('LOWER(TRIM(mp.title)) = LOWER(TRIM(:title))', { title: rawItem.title })
          .andWhere('mp.market_id = :marketId', { marketId: market.id })
          .andWhere('mp.url LIKE :urlPattern', { urlPattern: `${cleanUrl}%` })
          .getOne();
        
        if (marketProduct) {
          this.logger.debug(`[Dedup] Matched by Title+URL: "${rawItem.title}" @ ${cleanUrl.substring(0, 60)}`);
        }
      }
    }

    // Priority 4: If we have weight but no match, and there's an existing product with same title but no weight,
    // we should still create a new record (they're different products)

    if (marketProduct) {
      // UPDATE EXISTING
      this.logger.log(`[UPDATE] Existing product: "${marketProduct.title}" (ID: ${marketProduct.id})`);
      this.logger.log(`  Existing: price=${marketProduct.price} TL, URL: ${marketProduct.url?.substring(0, 80) || 'N/A'}`);
      this.logger.log(`  Incoming: title="${rawItem.title?.substring(0, 50)}", price=${price} TL, URL: ${rawItem.product_url?.substring(0, 80) || 'N/A'}`);
      
      // Check if this is actually a duplicate (same title, same price, same URL pattern)
      const existingPrice = parseFloat(marketProduct.price.toString());
      const priceDiff = Math.abs(existingPrice - price);
      const isDuplicate = priceDiff < 0.01 && 
                         rawItem.title?.toLowerCase().trim() === marketProduct.title?.toLowerCase().trim();
      
      if (isDuplicate) {
        this.logger.debug(`  ✓ Confirmed duplicate (same title + price), updating last_seen`);
      } else {
        this.logger.warn(`  ⚠ Price or title mismatch - existing: ${existingPrice} TL, incoming: ${price} TL`);
      }
      
      // Track if anything actually changed
      let hasChanges = false;
      let priceChanged = false;
      const existingPriceCard = marketProduct.price_card ? parseFloat(marketProduct.price_card.toString()) : null;
      const priceCardDiff = priceCard !== null && existingPriceCard !== null 
        ? Math.abs(existingPriceCard - priceCard) 
        : (priceCard !== existingPriceCard ? 1 : 0);
      
      // Check if price changed
      if (priceDiff >= 0.01) {
        hasChanges = true;
        priceChanged = true;
        this.logger.debug(`  Price changed: ${existingPrice} TL -> ${price} TL`);
      }
      
      // Check if card price changed
      if (priceCardDiff >= 0.01) {
        hasChanges = true;
        priceChanged = true;
        this.logger.debug(`  Card price changed: ${existingPriceCard} TL -> ${priceCard} TL`);
      }
      
      // Check if title changed
      if (rawItem.title && rawItem.title.trim() !== marketProduct.title?.trim()) {
        hasChanges = true;
        this.logger.debug(`  Title changed: "${marketProduct.title}" -> "${rawItem.title}"`);
      }
      
      // Check if URL changed
      if (rawItem.product_url && rawItem.product_url !== marketProduct.url) {
        hasChanges = true;
        this.logger.debug(`  URL changed: "${marketProduct.url}" -> "${rawItem.product_url}"`);
      }
      
      // Check if image URL changed
      if (rawItem.image_url && rawItem.image_url !== marketProduct.image_url) {
        hasChanges = true;
        this.logger.debug(`  Image URL changed`);
      }
      
      // Check if property (weight/quantity) changed
      const newProperty = rawItem.property || null;
      const existingProperty = marketProduct.property || null;
      if (newProperty !== existingProperty) {
        hasChanges = true;
        this.logger.debug(`  Property changed: "${existingProperty}" -> "${newProperty}"`);
      }
      
      // Update fields
      marketProduct.price = price;
      // Update card price if provided (can be null if not available)
      if (priceCard !== null) {
        marketProduct.price_card = priceCard;
        this.logger.debug(`  Card price: ${priceCard} TL`);
      }
      
      const now = new Date();
      marketProduct.last_seen = now; // Always update last_seen (when product was last seen/scraped)
      
      // Only update last_updated if something actually changed
      if (hasChanges) {
        marketProduct.last_updated = now;
        this.logger.debug(`  ✓ Data changed, updating last_updated`);
      } else {
        this.logger.debug(`  ✓ No changes detected, keeping last_updated unchanged`);
      }
      
      marketProduct.in_stock = true;
      
      // Update title if changed (using same comparison logic as change detection)
      if (rawItem.title && rawItem.title.trim() !== marketProduct.title?.trim()) {
        marketProduct.title = rawItem.title;
      }
      
      // Update URL if changed
      if (rawItem.product_url && rawItem.product_url !== marketProduct.url) {
        marketProduct.url = rawItem.product_url;
      }
      
      // Update image URL if changed
      if (rawItem.image_url && rawItem.image_url !== marketProduct.image_url) {
        marketProduct.image_url = rawItem.image_url;
      }
      
      // Update property (weight/quantity) if changed
      marketProduct.property = newProperty;

      await repo.save(marketProduct);
      
      // Return price history info to record after transaction commits
      // (Foreign key constraint requires transaction to be committed first)
      const priceHistoryInfo = priceChanged ? {
        marketProductId: marketProduct.id,
        price,
        priceCard
      } : null;
      
      // Match product after saving (link to Product master)
      try {
        const matchedProduct = await this.matchingService.matchProduct(marketProduct);
        if (matchedProduct && marketProduct.product_master_id !== matchedProduct.id) {
          marketProduct.product_master_id = matchedProduct.id;
          await repo.save(marketProduct);
          this.logger.debug(`[Matching] Linked MarketProduct ${marketProduct.id} to Product ${matchedProduct.id}`);
        }
      } catch (error) {
        this.logger.error(`[Matching] Error matching product: ${error.message}`, error.stack);
        // Don't fail the save if matching fails
      }
      
      return { created: false, priceHistoryInfo };
    } else {
      // CREATE NEW
      this.logger.log(`[CREATE] New product: "${rawItem.title?.substring(0, 50)}" (${price} TL)`);
      this.logger.log(`  URL: ${rawItem.product_url?.substring(0, 80) || 'N/A'}`);
      this.logger.log(`  Market: ${market.name}`);
      if (rawItem.property) {
        this.logger.log(`  Property: "${rawItem.property}"`);
      }
      
      marketProduct = repo.create({
        market: market,
        title: rawItem.title,
        price: price,
        price_card: priceCard, // Can be null if card price not available
        currency: rawItem.currency || 'TRY',
        url: rawItem.product_url || null,
        image_url: rawItem.image_url,
        market_sku: rawItem.id || 'unknown',
        property: rawItem.property || null, // Weight, quantity, or other property (e.g., "500 g", "1 kg", "1 Adet")
        last_seen: new Date(),
        last_updated: new Date()
      });
      await repo.save(marketProduct);
      
      // Return price history info to record after transaction commits
      // (Foreign key constraint requires transaction to be committed first)
      const priceHistoryInfo = {
        marketProductId: marketProduct.id,
        price,
        priceCard
      };
      
      // Match product after saving (link to Product master)
      try {
        const matchedProduct = await this.matchingService.matchProduct(marketProduct);
        if (matchedProduct) {
          marketProduct.product_master_id = matchedProduct.id;
          await repo.save(marketProduct);
          this.logger.debug(`[Matching] Linked new MarketProduct ${marketProduct.id} to Product ${matchedProduct.id}`);
        }
      } catch (error) {
        this.logger.error(`[Matching] Error matching new product: ${error.message}`, error.stack);
        // Don't fail the save if matching fails
      }
      
      return { created: true, priceHistoryInfo };
    }
  }

  async getRecentProducts(limit: number = 5000, marketName?: string) {
    const query = this.marketProductRepo.createQueryBuilder('mp')
      .leftJoinAndSelect('mp.market', 'market')
      .orderBy('mp.last_seen', 'DESC')
      .take(limit);
    
    if (marketName) {
      query.where('market.name = :marketName', { marketName });
    }
    
    return query.getMany();
  }


  async getProductStats() {
    const total = await this.marketProductRepo.count();
    const byMarket = await this.marketProductRepo
      .createQueryBuilder('mp')
      .leftJoin('mp.market', 'market')
      .select('market.name', 'marketName')
      .addSelect('COUNT(mp.id)', 'count')
      .groupBy('market.name')
      .getRawMany();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recent = await this.marketProductRepo
      .createQueryBuilder('mp')
      .where('mp.last_seen >= :yesterday', { yesterday })
      .getCount();
    
    return {
      total,
      byMarket,
      recent24h: recent
    };
  }
}
