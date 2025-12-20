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
  ) {}

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
        // Search for products matching the query
        const products = await this.matchingService.searchProducts(item.query, 5);

        if (products.length > 0) {
          // Get all MarketProducts for matched products
          const productIds = products.map((p) => p.id);
          candidates = await this.marketProductRepo
            .createQueryBuilder('mp')
            .leftJoinAndSelect('mp.market', 'market')
            .leftJoinAndSelect('mp.product', 'product')
            .where('mp.product_master_id IN (:...productIds)', { productIds })
            .andWhere('mp.in_stock = true')
            .getMany();

          this.logger.debug(
            `[Optimization] Found ${candidates.length} MarketProducts for query "${item.query}"`,
          );
          if (candidates.length > 0) {
            const sampleProducts = candidates.slice(0, 5).map(c => `"${c.title}" (${c.market?.name})`).join(', ');
            this.logger.debug(
              `[Optimization] Sample MarketProducts: ${sampleProducts}`,
            );
          }
        }

        // Fallback: Direct title search with word-based matching (prevents "süt" matching "Pınar Su")
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
            
            candidates = await this.marketProductRepo
              .createQueryBuilder('mp')
              .leftJoinAndSelect('mp.market', 'market')
              .where(`(${wordConditions.join(' AND ')})`, {})
              .andWhere('mp.in_stock = true')
              .getMany();
          }
        }
      }

      // Apply brand filters
      if (includeBrands.length > 0 || excludeBrands.length > 0) {
        candidates = this.applyBrandFilters(candidates, includeBrands, excludeBrands);
      }

      // Apply market filter (only keep allowed markets if provided)
      if (allowedMarkets.length > 0) {
        const normalizedAllowed = allowedMarkets.map((m) => m.trim().toLowerCase());
        candidates = candidates.filter(
          (c) =>
            c.market &&
            normalizedAllowed.includes(c.market.name.trim().toLowerCase()),
        );
      }

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
          `No products found for: ${
            item.productId ? `Product ID ${item.productId}` : `query "${item.query}"`
          }`,
        );
        continue;
      }
      // If query string provided, ensure selected product title contains the query word
      // This prevents "süt" from selecting "Pınar Su" (because "süt" is not in "Pınar Su")
      let chosenProduct = candidates[0]; // Take most efficient (best price per unit)
      
      if (item.query && item.query.trim()) {
        const queryWords = item.query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const productTitle = chosenProduct.title.toLowerCase();
        
        // Check if all query words appear as whole words in the product title
        const allWordsMatch = queryWords.every(word => {
          // Use word boundary regex: word must be at start/end or surrounded by non-word chars
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const wordRegex = new RegExp(`(^|[^a-z0-9ığüşöç])${escapedWord}([^a-z0-9ığüşöç]|$)`, 'i');
          return wordRegex.test(productTitle);
        });
        
        // If query words don't match, try next candidates
        if (!allWordsMatch) {
          this.logger.debug(
            `[Optimization] Rejecting "${chosenProduct.title}" - query "${item.query}" words don't match. Trying next candidates...`,
          );
          
          for (let i = 1; i < candidates.length; i++) {
            const candidate = candidates[i];
            const candidateTitle = candidate.title.toLowerCase();
            const candidateWordsMatch = queryWords.every(word => {
              const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const wordRegex = new RegExp(`(^|[^a-z0-9ığüşöç])${escapedWord}([^a-z0-9ığüşöç]|$)`, 'i');
              return wordRegex.test(candidateTitle);
            });
            
            if (candidateWordsMatch) {
              chosenProduct = candidate;
              this.logger.debug(
                `[Optimization] Selected alternative candidate "${chosenProduct.title}" - query words match`,
              );
              break;
            }
          }
          
          // If no candidate matches, log warning but use first candidate anyway
          const finalTitle = chosenProduct.title.toLowerCase();
          const finalWordsMatch = queryWords.every(word => {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wordRegex = new RegExp(`(^|[^a-z0-9ığüşöç])${escapedWord}([^a-z0-9ığüşöç]|$)`, 'i');
            return wordRegex.test(finalTitle);
          });
          
          if (!finalWordsMatch) {
            this.logger.warn(
              `[Optimization] No candidate matches query "${item.query}" - using first candidate "${chosenProduct.title}" anyway`,
            );
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

    for (const marketName of allMarkets) {
      if (allowedMarkets.length > 0) {
        const normalizedAllowed = allowedMarkets.map((m) => m.trim().toLowerCase());
        if (!normalizedAllowed.includes(marketName.trim().toLowerCase())) {
          continue;
        }
      }

      const selectionsForMarket: {
        itemKey: string | number;
        product: MarketProduct;
        quantity: number;
      }[] = [];
      let canServeAllItems = true;

      for (const item of cartItems) {
        const key = item.productId || item.query || 'unknown';
        const candidates = candidatesMap.get(key) || [];
        const candidateForMarket = candidates.find(
          (c) => c.market?.name === marketName,
        );
        if (!candidateForMarket) {
          canServeAllItems = false;
          break;
        }
        selectionsForMarket.push({
          itemKey: key,
          product: candidateForMarket,
          quantity: item.quantity,
        });
      }

      if (!canServeAllItems || selectionsForMarket.length === 0) {
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

    const result = markets.map((m) => ({
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