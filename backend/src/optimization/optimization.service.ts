import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketProduct } from '../entities/MarketProduct.entity';
import { Market } from '../entities/Market.entity';
import { Product } from '../entities/Product.entity';
import { MatchingService } from '../matching/matching.service';

export interface CartItem {
  query?: string; // Product name search query (e.g., "Süt")
  productId?: number; // Product ID (preferred, more accurate)
  productTitle?: string; // Product title (when selected from autocomplete)
  quantity: number;
}

export interface BasketBreakdown {
  marketName: string;
  items: {
    name: string;
    price: number;
    quantity: number;
    total: number;
    product: MarketProduct;
  }[];
  subtotal: number;
  deliveryFee: number;
  total?: number;
}

export interface AlternativeCart {
  id: string;
  totalPrice: number;
  breakdown: BasketBreakdown[];
  marketCount: number;
  matchedItems?: number; // Number of items found in this cart
  totalItems?: number; // Total items requested
  missingItems?: string[]; // Names of items not found
}

export interface OptimizedResult {
  totalPrice: number;
  breakdown: BasketBreakdown[];
  /**
   * Ek alternatif sepetler (ör: tek marketten sepet, farklı market kombinasyonları)
   */
  alternatives?: AlternativeCart[];
}

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);
  // Cache for getAllMarkets (markets don't change often)
  private marketsCache: { data: { id: number; name: string }[]; timestamp: number } | null = null;
  private readonly MARKETS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectRepository(MarketProduct)
    private marketProductRepo: Repository<MarketProduct>,
    @InjectRepository(Market)
    private marketRepo: Repository<Market>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private matchingService: MatchingService,
  ) { }

  private normalizeString(str: string): string {
    if (!str) return '';
    // Strict normalization: only handle case conversion, preserving Turkish characters.
    // This allows distinguishing "Süt" from "Şut".
    // "süt" -> "süt"
    // "şut" -> "şut"
    return str.toLocaleLowerCase('tr-TR').trim();
  }

  /**
   * Find cheapest cart - Enhanced version using Product matching
   * Supports both Product ID (preferred) and query string (fallback)
   * 
   * @param cartItems Items to optimize
   * @param includeBrands Brands to include (only products with these brands in title)
   * @param excludeBrands Brands to exclude (hide products with these brands in title)
   * @param allowedMarkets Optional allowed market names (filter)
   */
  async findCheapestCart(
    cartItems: CartItem[],
    includeBrands: string[] = [],
    excludeBrands: string[] = [],
    allowedMarkets: string[] = [],
  ): Promise<OptimizedResult> {
    this.logger.log(
      `[Optimization] findCheapestCart called with ${cartItems.length} items, allowedMarkets: [${allowedMarkets.join(', ')}]`,
    );
    const candidatesMap = new Map<string | number, MarketProduct[]>();
    const allMarkets = new Set<string>();

    for (const item of cartItems) {
      let candidates: MarketProduct[] = [];

      // Strategy 1: Use Product ID if provided (most accurate)
      if (item.productId) {
        candidates = await this.marketProductRepo
          .createQueryBuilder('mp')
          .leftJoinAndSelect('mp.market', 'market')
          .leftJoinAndSelect('mp.product', 'product')
          .where('mp.product_master_id = :productId', { productId: item.productId })
          .andWhere('mp.in_stock = true')
          .getMany();

        this.logger.debug(
          `[Optimization] Found ${candidates.length} MarketProducts for Product ID ${item.productId}`,
        );
      }

      // Strategy 2: Use query string to find Product, then get all MarketProducts
      if (candidates.length === 0 && item.query) {
        // Build base query builder for market filter (apply early if market filter is specified)
        const buildMarketProductQuery = () => {
          let queryBuilder = this.marketProductRepo
            .createQueryBuilder('mp')
            .leftJoinAndSelect('mp.market', 'market')
            .leftJoinAndSelect('mp.product', 'product')
            .andWhere('mp.in_stock = true');

          // Apply market filter early if specified (more efficient)
          if (allowedMarkets.length > 0) {
            const normalizedAllowed = allowedMarkets.map((m) => m.trim().toLowerCase());
            this.logger.log(
              `[Optimization] buildMarketProductQuery: Applying market filter: [${normalizedAllowed.join(', ')}]`,
            );
            queryBuilder = queryBuilder.andWhere(
              'LOWER(TRIM(market.name)) IN (:...allowedMarkets)',
              { allowedMarkets: normalizedAllowed },
            );
          } else {
            this.logger.log(
              `[Optimization] buildMarketProductQuery: No market filter (allowedMarkets.length = ${allowedMarkets.length})`,
            );
          }

          return queryBuilder;
        };

        // Always search for products matching the query first (even with market filter)
        // This allows us to find products by their canonical title or fuzzy matching,
        // which is much better than the fallback regex search (handles Turkish characters correctly)
        // matchingService.searchProducts() returns potential matching Products
        const products = await this.matchingService.searchProducts(
          item.query,
          5,
          [], // includeBrands
          [], // excludeBrands
          true // strict mode: use exact word matching (quotes)
        );

        if (products.length > 0) {
          // Get all MarketProducts for matched products
          // If market filter is active, buildMarketProductQuery() will apply it
          const productIds = products.map((p) => p.id);
          const queryBuilder = buildMarketProductQuery();
          candidates = await queryBuilder
            .andWhere('mp.product_master_id IN (:...productIds)', { productIds })
            .getMany();

          this.logger.debug(
            `[Optimization] Found ${candidates.length} MarketProducts for query "${item.query}" via Product search (Markets: ${allowedMarkets.join(', ') || 'All'})`,
          );

          // Validate candidates immediately. If we found "Pınar Su" for "Süt" (bad link), we must reject it here.
          // If we reject all, 'candidates' becomes empty, allowing the fallback search to run.
          if (candidates.length > 0 && item.query && item.query.trim()) {
            const normalizedQuery = this.normalizeString(item.query);
            const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

            const originalCount = candidates.length;
            candidates = candidates.filter(candidate => {
              const productTitle = this.normalizeString(candidate.title);
              // Simple includes check for all words
              const allMatch = queryWords.every(word => productTitle.includes(word));
              if (!allMatch) {
                this.logger.debug(`[Optimization] Early Reject: "${candidate.title}" does not match query "${item.query}"`);
              }
              return allMatch;
            });

            if (candidates.length !== originalCount) {
              this.logger.debug(`[Optimization] Filtered candidates from ${originalCount} to ${candidates.length} based on title match`);
            }
          }

          if (candidates.length > 0) {
            const sampleProducts = candidates.slice(0, 5).map(c => `"${c.title}" (${c.market?.name})`).join(', ');
            this.logger.debug(
              `[Optimization] Sample MarketProducts: ${sampleProducts}`,
            );
          }
        } else {
          this.logger.debug(
            `[Optimization] No products found in master list for "${item.query}", proceeding to fallback search`,
          );
        }

        // Fallback: Direct title search with word-based matching (prevents "süt" matching "Pınar Su")
        // If market filter is applied and no candidates found from Product search, use fallback
        // This ensures that if a specific market is selected, we search directly in that market's products
        // matchingService.searchProducts() doesn't know about market filter, so it might return products
        // that don't exist in the selected market
        if (candidates.length === 0) {
          const normalizedQuery = item.query.trim().toLowerCase();
          const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

          // Use word-based search: each query word must appear as a whole word in the title
          // This prevents "süt" from matching "Pınar Su" (because "sut" is not a word in "pinar su")
          if (queryWords.length > 0) {
            // For single word queries, use word boundary matching
            // For multi-word queries, all words must appear
            const wordConditions = queryWords.map((word) => {
              // Escape special regex characters for PostgreSQL
              const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              // Match word boundaries: word must be at start/end or surrounded by spaces/punctuation
              // PostgreSQL uses \y for word boundaries, but we'll use a simpler approach
              return `LOWER(TRIM(mp.title)) ~* '(^|[^a-z0-9])${escapedWord}([^a-z0-9]|$)'`;
            });

            const queryBuilder = buildMarketProductQuery();
            this.logger.log(
              `[Optimization] Fallback search: Searching for "${item.query}" with market filter: [${allowedMarkets.join(', ')}]`,
            );
            candidates = await queryBuilder
              .andWhere(`(${wordConditions.join(' AND ')})`, {})
              .getMany();

            this.logger.log(
              `[Optimization] Fallback search: Found ${candidates.length} MarketProducts for query "${item.query}"`,
            );
            if (candidates.length > 0) {
              const marketCounts = new Map<string, number>();
              candidates.forEach(c => {
                const marketName = c.market?.name || 'Unknown';
                marketCounts.set(marketName, (marketCounts.get(marketName) || 0) + 1);
              });
              const marketSummary = Array.from(marketCounts.entries())
                .map(([market, count]) => `${market}: ${count}`)
                .join(', ');
              this.logger.log(
                `[Optimization] Fallback search: Markets found: ${marketSummary}`,
              );
              const sampleProducts = candidates.slice(0, 5).map(c => `"${c.title}" (${c.market?.name})`).join(', ');
              this.logger.log(
                `[Optimization] Fallback search: Sample MarketProducts: ${sampleProducts}`,
              );
            }
          }
        }
      }

      // Apply brand filters
      if (includeBrands.length > 0 || excludeBrands.length > 0) {
        candidates = this.applyBrandFilters(candidates, includeBrands, excludeBrands);
      }

      // Note: Market filter is now applied early in buildMarketProductQuery() for better performance
      // No need to filter again here

      // Track markets that have at least one candidate (for alternatives)
      for (const c of candidates) {
        if (c.market?.name) {
          allMarkets.add(c.market.name);
        }
      }

      // Sort by efficiency (price per unit) first, then by total price
      candidates.sort((a, b) => {
        const priceA = a.price_card
          ? parseFloat(a.price_card.toString())
          : parseFloat(a.price.toString());
        const priceB = b.price_card
          ? parseFloat(b.price_card.toString())
          : parseFloat(b.price.toString());

        const efficiencyA = this.calculateEfficiency(priceA, a.property);
        const efficiencyB = this.calculateEfficiency(priceB, b.property);

        if (efficiencyA !== null && efficiencyB !== null) {
          return efficiencyA - efficiencyB;
        }

        if (efficiencyA !== null && efficiencyB === null) return -1;
        if (efficiencyA === null && efficiencyB !== null) return 1;

        return priceA - priceB;
      });

      const key = item.productId || item.query || 'unknown';
      candidatesMap.set(key, candidates.slice(0, 10)); // Take top 10 most efficient for better optimization
    }

    const chosenItems: { itemKey: string | number; product: MarketProduct; quantity: number }[] =
      [];

    for (const item of cartItems) {
      const key = item.productId || item.query || 'unknown';
      const candidates = candidatesMap.get(key) || [];
      if (candidates.length === 0) {
        this.logger.warn(
          `No products found for: ${item.productId ? `Product ID ${item.productId}` : `query "${item.query}"`
          }`,
        );
        continue;
      }

      // Debug: Log candidates for query-based items
      if (item.query && item.query.trim()) {
        const marketCounts = new Map<string, number>();
        candidates.forEach(c => {
          const marketName = c.market?.name || 'Unknown';
          marketCounts.set(marketName, (marketCounts.get(marketName) || 0) + 1);
        });
        const marketSummary = Array.from(marketCounts.entries())
          .map(([market, count]) => `${market}: ${count}`)
          .join(', ');
        this.logger.debug(
          `[Optimization] Found ${candidates.length} candidates for query "${item.query}". Markets: ${marketSummary}`,
        );
      }

      // If query string provided, ensure selected product title contains the query word
      let chosenProduct = candidates[0]; // Take most efficient (best price per unit)

      if (item.query && item.query.trim()) {
        const normalizedQuery = this.normalizeString(item.query);
        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
        const productTitle = this.normalizeString(chosenProduct.title);

        this.logger.debug(
          `[Optimization] FIX_VER_3: Validating query "${item.query}" (${normalizedQuery}) against "${chosenProduct.title}" (${productTitle})`,
        );

        // Check if all query words appear in the product title (using simple includes after normalization)
        // This is safer than regex for Turkish characters
        const allWordsMatch = queryWords.every(word => {
          const matches = productTitle.includes(word);
          if (!matches) {
            this.logger.debug(
              `[Optimization] Mismatch: Word "${word}" not found in title`
            );
          }
          return matches;
        });

        // If query words don't match, try next candidates
        if (!allWordsMatch) {
          this.logger.debug(
            `[Optimization] Rejecting "${chosenProduct.title}"...`,
          );

          let foundMatch = false;
          for (let i = 1; i < candidates.length; i++) {
            const candidate = candidates[i];
            const candidateTitle = this.normalizeString(candidate.title);
            const candidateWordsMatch = queryWords.every(word => candidateTitle.includes(word));

            if (candidateWordsMatch) {
              chosenProduct = candidate;
              foundMatch = true;
              this.logger.debug(
                `[Optimization] Selected alternative candidate "${chosenProduct.title}"`,
              );
              break;
            }
          }

          // If no candidate matches, skip this item (don't use first candidate)
          if (!foundMatch) {
            this.logger.warn(
              `[Optimization] FIX_VER_3: No candidate matches query "${item.query}" - skipping item.`,
            );
            continue;
          }
        }
      }

      this.logger.debug(
        `[Optimization] Selected product for "${item.query || `Product ID ${item.productId}`}": "${chosenProduct.title}" (${chosenProduct.market?.name}, ${chosenProduct.price} TL)`,
      );
      chosenItems.push({
        itemKey: key,
        product: chosenProduct,
        quantity: item.quantity,
      });
    }

    const marketBaskets = new Map<string, BasketBreakdown>();

    for (const selection of chosenItems) {
      const marketName = selection.product.market.name;
      if (!marketBaskets.has(marketName)) {
        marketBaskets.set(marketName, {
          marketName,
          items: [],
          subtotal: 0,
          deliveryFee: 0,
          total: 0,
        });
      }

      const basket = marketBaskets.get(marketName)!;
      const effectivePrice = selection.product.price_card || selection.product.price;
      const productPrice = Number(effectivePrice);
      const lineTotal = productPrice * selection.quantity;

      basket.items.push({
        name: selection.product.title,
        price: productPrice,
        quantity: selection.quantity,
        total: lineTotal,
        product: selection.product,
      });
      basket.subtotal += lineTotal;
    }

    const breakdown: BasketBreakdown[] = [];
    let grandTotal = 0;

    for (const basket of marketBaskets.values()) {
      const market = basket.items[0]?.product?.market;
      const deliveryFee = this.calculateDeliveryFee(basket.subtotal, market);
      basket.deliveryFee = deliveryFee;

      basket.total = basket.subtotal;
      grandTotal += basket.total;
      breakdown.push(basket);
    }

    breakdown.sort((a, b) => (a.total || 0) - (b.total || 0));

    const result: OptimizedResult = {
      totalPrice: grandTotal,
      breakdown,
    };

    // Alternatif sepetler: tek marketten alışveriş yapılabilecek sepetler
    const alternativeCarts: AlternativeCart[] = [];

    this.logger.log(
      `[Optimization] Starting alternative carts algorithm. allMarkets: [${Array.from(allMarkets).join(', ')}], allowedMarkets: [${allowedMarkets.join(', ')}]`,
    );

    for (const marketName of allMarkets) {
      if (allowedMarkets.length > 0) {
        const normalizedAllowed = allowedMarkets.map((m) => m.trim().toLowerCase());
        if (!normalizedAllowed.includes(marketName.trim().toLowerCase())) {
          this.logger.log(
            `[Optimization] Alternative cart: Skipping market "${marketName}" - not in allowedMarkets`,
          );
          continue;
        }
      }

      this.logger.log(
        `[Optimization] Alternative cart: Processing market "${marketName}"`,
      );

      const selectionsForMarket: {
        itemKey: string | number;
        product: MarketProduct;
        quantity: number;
      }[] = [];
      const missingItems: string[] = [];

      for (const item of cartItems) {
        const key = item.productId || item.query || 'unknown';
        const candidates = candidatesMap.get(key) || [];

        // Find candidate for this market, but validate query words if query string provided
        let candidateForMarket: MarketProduct | undefined = undefined;

        if (item.query && item.query.trim()) {
          // For query-based items, validate that candidate title contains query words
          const normalizedQuery = this.normalizeString(item.query);
          const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

          // Try to find a candidate for this market that matches query words
          for (const candidate of candidates) {
            if (candidate.market?.name === marketName) {
              const candidateTitle = this.normalizeString(candidate.title);
              const allWordsMatch = queryWords.every(word => candidateTitle.includes(word));

              if (allWordsMatch) {
                candidateForMarket = candidate;
                this.logger.log(
                  `[Optimization] Alternative cart: Found valid candidate "${candidate.title}" for query "${item.query}" in market "${marketName}"`,
                );
                break;
              } else {
                this.logger.log(
                  `[Optimization] Alternative cart: Rejecting "${candidate.title}" for query "${item.query}" in market "${marketName}" - query words don't match`,
                );
              }
            }
          }

          // If no valid candidate found, track as missing but continue
          if (!candidateForMarket) {
            this.logger.log(
              `[Optimization] Alternative cart: No valid candidate found for query "${item.query}" in market "${marketName}" - marking as missing`,
            );
            missingItems.push(item.query);
          }
        } else {
          // For productId-based items, just find first candidate for this market
          candidateForMarket = candidates.find(
            (c) => c.market?.name === marketName,
          );
        }

        if (!candidateForMarket) {
          // Track missing item - use productTitle if available, otherwise query or productId
          const itemName = item.productTitle || item.query || `Product #${item.productId}` || 'Unknown';
          if (!missingItems.includes(itemName)) {
            missingItems.push(itemName);
          }
        } else {
          selectionsForMarket.push({
            itemKey: key,
            product: candidateForMarket,
            quantity: item.quantity,
          });
        }
      }

      // Skip markets with no items found
      if (selectionsForMarket.length === 0) {
        continue;
      }

      const altBasket: BasketBreakdown = {
        marketName,
        items: [],
        subtotal: 0,
        deliveryFee: 0,
        total: 0,
      };

      for (const selection of selectionsForMarket) {
        const effectivePrice = selection.product.price_card || selection.product.price;
        const productPrice = Number(effectivePrice);
        const lineTotal = productPrice * selection.quantity;

        altBasket.items.push({
          name: selection.product.title,
          price: productPrice,
          quantity: selection.quantity,
          total: lineTotal,
          product: selection.product,
        });
        altBasket.subtotal += lineTotal;
      }

      const marketEntity = selectionsForMarket[0].product.market;
      altBasket.deliveryFee = this.calculateDeliveryFee(altBasket.subtotal, marketEntity);
      altBasket.total = altBasket.subtotal;

      alternativeCarts.push({
        id: `single-market-${marketName}`,
        totalPrice: altBasket.total!,
        breakdown: [altBasket],
        marketCount: 1,
        matchedItems: selectionsForMarket.length,
        totalItems: cartItems.length,
        missingItems: missingItems.length > 0 ? missingItems : undefined,
      });
    }

    if (alternativeCarts.length > 0) {
      alternativeCarts.sort((a, b) => a.totalPrice - b.totalPrice);
      result.alternatives = alternativeCarts.slice(0, 3);
    }

    return result;
  }

  /**
   * Calculate price per unit (efficiency) from property string
   */
  private calculateEfficiency(price: number, property: string | null): number | null {
    if (!property) return null;

    const normalized = property.toLowerCase().trim();

    // multi-pack: "3 x 210 G"
    const multiPackMatch = normalized.match(/(\d+)\s*x\s*(\d+)\s*(g|kg|ml|l|gr|lt)/);
    if (multiPackMatch) {
      const count = parseFloat(multiPackMatch[1]);
      const amount = parseFloat(multiPackMatch[2]);
      const unit = multiPackMatch[3];
      const totalAmount = count * amount;
      return this.calculatePricePerBaseUnit(price, totalAmount, unit);
    }

    // range: "2-2.5 KG"
    const rangeMatch = normalized.match(
      /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|gr|lt)/,
    );
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1].replace(',', '.'));
      const max = parseFloat(rangeMatch[2].replace(',', '.'));
      const unit = rangeMatch[3];
      const avg = (min + max) / 2;
      return this.calculatePricePerBaseUnit(price, avg, unit);
    }

    // simple: "200 ML", "1 L", "500 G"
    const simpleMatch = normalized.match(
      /(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|gr|lt|adet)/,
    );
    if (simpleMatch) {
      const amount = parseFloat(simpleMatch[1].replace(',', '.'));
      const unit = simpleMatch[2];

      if (unit === 'adet') return null;

      return this.calculatePricePerBaseUnit(price, amount, unit);
    }

    return null;
  }

  private calculatePricePerBaseUnit(
    price: number,
    amount: number,
    unit: string,
  ): number | null {
    const normalizedUnit = unit.toLowerCase();
    let baseAmount: number;

    if (normalizedUnit === 'l' || normalizedUnit === 'lt') {
      baseAmount = amount;
    } else if (normalizedUnit === 'ml') {
      baseAmount = amount / 1000;
    } else if (normalizedUnit === 'kg') {
      baseAmount = amount;
    } else if (normalizedUnit === 'g' || normalizedUnit === 'gr') {
      baseAmount = amount / 1000;
    } else {
      return null;
    }

    if (baseAmount <= 0) return null;

    return price / baseAmount;
  }

  private applyBrandFilters(
    products: MarketProduct[],
    includeBrands: string[],
    excludeBrands: string[],
  ): MarketProduct[] {
    if (includeBrands.length === 0 && excludeBrands.length === 0) {
      return products;
    }

    const normalizeString = (str: string): string => {
      if (!str) return '';
      let normalized = str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .toLowerCase()
        .trim();
      normalized = normalized
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
      return normalized;
    };

    return products.filter((product) => {
      const normalizedTitle = normalizeString(product.title);

      if (excludeBrands.length > 0) {
        const isExcluded = excludeBrands.some((excludeBrand) => {
          const normalizedExclude = normalizeString(excludeBrand);
          return normalizedTitle.includes(normalizedExclude);
        });
        if (isExcluded) return false;
      }

      if (includeBrands.length > 0) {
        const isIncluded = includeBrands.some((includeBrand) => {
          const normalizedInclude = normalizeString(includeBrand);
          return normalizedTitle.includes(normalizedInclude);
        });
        if (!isIncluded) return false;
      }

      return true;
    });
  }

  private calculateDeliveryFee(subtotal: number, market?: Market): number {
    if (!market) {
      return subtotal > 200 ? 0 : 20;
    }

    const minOrder = market.min_order_amount
      ? parseFloat(market.min_order_amount.toString())
      : 0;
    if (minOrder > 0 && subtotal < minOrder) {
      return 999;
    }

    const freeThreshold = market.free_delivery_threshold
      ? parseFloat(market.free_delivery_threshold.toString())
      : null;

    if (freeThreshold !== null) {
      if (subtotal >= freeThreshold) {
        return 0;
      }
      return 20;
    }

    return subtotal > 200 ? 0 : 20;
  }

  /**
   * Tüm marketlerin basit listesini döner (id + name)
   * Market filtreleme için kullanılır.
   * Cached for 30 minutes for better performance.
   */
  async getAllMarkets(): Promise<{ id: number; name: string }[]> {
    // Check cache
    if (
      this.marketsCache &&
      Date.now() - this.marketsCache.timestamp < this.MARKETS_CACHE_TTL
    ) {
      return this.marketsCache.data;
    }

    // Fetch from database
    const markets = await this.marketRepo.find({
      order: { name: 'ASC' },
    });

    // Filter out duplicate market names
    // - "Sok" (should be "Şok" with Turkish character)
    // - "Macrocenter" (should be "Macro Center" with space)
    // This prevents duplicate markets in the market filter
    const result = markets
      .filter((m) => m.name !== 'Sok' && m.name !== 'Macrocenter') // Remove duplicates
      .map((m) => ({
        id: m.id,
        name: m.name,
      }));

    // Update cache
    this.marketsCache = {
      data: result,
      timestamp: Date.now(),
    };

    return result;
  }

  async compareProductPrices(productId: number): Promise<{
    productId: number;
    productTitle: string;
    markets: {
      marketName: string;
      title: string;
      price: number;
      priceCard: number | null;
      property: string | null;
      url: string | null;
      imageUrl: string | null;
      effectivePrice: number;
    }[];
    cheapest: {
      marketName: string;
      price: number;
    } | null;
  }> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const marketProducts = await this.marketProductRepo.find({
      where: { product_master_id: productId, in_stock: true },
      relations: ['market'],
    });

    const markets = marketProducts.map((mp) => {
      const effectivePrice = mp.price_card
        ? parseFloat(mp.price_card.toString())
        : parseFloat(mp.price.toString());
      return {
        marketName: mp.market.name,
        title: mp.title,
        price: parseFloat(mp.price.toString()),
        priceCard: mp.price_card ? parseFloat(mp.price_card.toString()) : null,
        property: mp.property,
        url: mp.url,
        imageUrl: mp.image_url,
        effectivePrice,
      };
    });

    markets.sort((a, b) => a.effectivePrice - b.effectivePrice);

    const cheapest =
      markets.length > 0
        ? {
          marketName: markets[0].marketName,
          price: markets[0].effectivePrice,
        }
        : null;

    return {
      productId: product.id,
      productTitle: product.canonical_title,
      markets,
      cheapest,
    };
  }
}