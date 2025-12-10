import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MarketProduct } from '../entities/MarketProduct.entity';
import { Market } from '../entities/Market.entity';
import { Product } from '../entities/Product.entity';
import { MatchingService } from '../matching/matching.service';

export interface CartItem {
  query?: string; // Product name search query (e.g., "Süt")
  productId?: number; // Product ID (preferred, more accurate)
  quantity: number;
}

export interface OptimizedResult {
  totalPrice: number;
  breakdown: {
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
  }[];
}

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);

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
   */
  async findCheapestCart(
    cartItems: CartItem[],
    includeBrands: string[] = [],
    excludeBrands: string[] = []
  ): Promise<OptimizedResult> {
    const candidatesMap = new Map<string | number, MarketProduct[]>();

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
        
        this.logger.debug(`[Optimization] Found ${candidates.length} MarketProducts for Product ID ${item.productId}`);
      }
      
      // Strategy 2: Use query string to find Product, then get all MarketProducts
      if (candidates.length === 0 && item.query) {
        // Search for products matching the query
        const products = await this.matchingService.searchProducts(item.query, 5);
        
        if (products.length > 0) {
          // Get all MarketProducts for matched products
          const productIds = products.map(p => p.id);
          candidates = await this.marketProductRepo
            .createQueryBuilder('mp')
            .leftJoinAndSelect('mp.market', 'market')
            .leftJoinAndSelect('mp.product', 'product')
            .where('mp.product_master_id IN (:...productIds)', { productIds })
            .andWhere('mp.in_stock = true')
            .getMany();
          
          this.logger.debug(`[Optimization] Found ${candidates.length} MarketProducts for query "${item.query}"`);
        }
        
        // Fallback: Direct title search (backward compatibility) - case-insensitive
        if (candidates.length === 0) {
          candidates = await this.marketProductRepo
            .createQueryBuilder('mp')
            .leftJoinAndSelect('mp.market', 'market')
            .where('LOWER(TRIM(mp.title)) LIKE LOWER(:query)', { query: `%${item.query.trim()}%` })
            .andWhere('mp.in_stock = true')
            .getMany();
        }
      }

      // Apply brand filters
      if (includeBrands.length > 0 || excludeBrands.length > 0) {
        candidates = this.applyBrandFilters(candidates, includeBrands, excludeBrands);
      }

      // Sort by efficiency (price per unit) first, then by total price
      // This ensures we get the most efficient option (e.g., 1L for 20 TL vs 200ML for 10 TL)
      candidates.sort((a, b) => {
        const priceA = a.price_card ? parseFloat(a.price_card.toString()) : parseFloat(a.price.toString());
        const priceB = b.price_card ? parseFloat(b.price_card.toString()) : parseFloat(b.price.toString());
        
        // Calculate price per unit (efficiency)
        const efficiencyA = this.calculateEfficiency(priceA, a.property);
        const efficiencyB = this.calculateEfficiency(priceB, b.property);
        
        // If both have valid efficiency, sort by efficiency (lower is better)
        if (efficiencyA !== null && efficiencyB !== null) {
          return efficiencyA - efficiencyB;
        }
        
        // If only one has efficiency, prefer the one with efficiency
        if (efficiencyA !== null && efficiencyB === null) return -1;
        if (efficiencyA === null && efficiencyB !== null) return 1;
        
        // If neither has efficiency, sort by total price
        return priceA - priceB;
      });
      
      const key = item.productId || item.query || 'unknown';
      candidatesMap.set(key, candidates.slice(0, 10)); // Take top 10 most efficient for better optimization
    }

    const chosenItems: { itemKey: string | number; product: MarketProduct; quantity: number }[] = [];

    for (const item of cartItems) {
      const key = item.productId || item.query || 'unknown';
      const candidates = candidatesMap.get(key) || [];
      if (candidates.length === 0) {
        this.logger.warn(`No products found for: ${item.productId ? `Product ID ${item.productId}` : `query "${item.query}"`}`);
        continue;
      }
      chosenItems.push({
        itemKey: key,
        product: candidates[0], // Take most efficient (best price per unit)
        quantity: item.quantity
      });
    }

    const marketBaskets = new Map<string, any>();

    for (const selection of chosenItems) {
      const marketName = selection.product.market.name;
      if (!marketBaskets.has(marketName)) {
        marketBaskets.set(marketName, {
          marketName,
          items: [],
          subtotal: 0,
          deliveryFee: 0 
        });
      }
      
      const basket = marketBaskets.get(marketName);
      // Use card price if available (cheaper), otherwise use regular price
      const effectivePrice = selection.product.price_card || selection.product.price;
      const productPrice = Number(effectivePrice);
      const lineTotal = productPrice * selection.quantity;
      
      basket.items.push({
        name: selection.product.title,
        price: productPrice,
        quantity: selection.quantity,
        total: lineTotal,
        product: selection.product
      });
      basket.subtotal += lineTotal;
    }

    const breakdown = [];
    let grandTotal = 0;

    for (const basket of marketBaskets.values()) {
      // Calculate delivery for informational purposes only (not included in optimization)
      const market = basket.items[0]?.product?.market;
      const deliveryFee = this.calculateDeliveryFee(basket.subtotal, market);
      basket.deliveryFee = deliveryFee;
      
      // Total is products only (delivery excluded from calculation)
      basket.total = basket.subtotal;
      
      grandTotal += basket.total;
      breakdown.push(basket);
    }

    // Sort breakdown by product prices only (cheapest first, excluding delivery)
    breakdown.sort((a, b) => a.total - b.total);

    return {
      totalPrice: grandTotal, // Products total only (delivery excluded)
      breakdown
    };
  }

  /**
   * Calculate price per unit (efficiency) from property string
   * Examples:
   * - "200 ML" with price 10 TL -> 10 / 0.2 = 50 TL per liter
   * - "1 L" with price 20 TL -> 20 / 1 = 20 TL per liter
   * - "500 G" with price 15 TL -> 15 / 0.5 = 30 TL per kg
   * - "1 Adet" -> null (can't calculate efficiency for count-based items)
   * 
   * Returns: Price per base unit (TL per liter/kg) or null if can't calculate
   */
  private calculateEfficiency(price: number, property: string | null): number | null {
    if (!property) return null;
    
    const normalized = property.toLowerCase().trim();
    
    // Extract numeric value and unit
    // Patterns: "200 ML", "1 L", "500 G", "1 KG", "2-2.5 KG", "3 x 210 G"
    
    // Handle multi-packs: "3 x 210 G" -> 3 * 210 = 630 G
    const multiPackMatch = normalized.match(/(\d+)\s*x\s*(\d+)\s*(g|kg|ml|l|gr|lt)/);
    if (multiPackMatch) {
      const count = parseFloat(multiPackMatch[1]);
      const amount = parseFloat(multiPackMatch[2]);
      const unit = multiPackMatch[3];
      const totalAmount = count * amount;
      return this.calculatePricePerBaseUnit(price, totalAmount, unit);
    }
    
    // Handle ranges: "2-2.5 KG" -> use average (2.25 KG)
    const rangeMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|gr|lt)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1].replace(',', '.'));
      const max = parseFloat(rangeMatch[2].replace(',', '.'));
      const unit = rangeMatch[3];
      const avg = (min + max) / 2;
      return this.calculatePricePerBaseUnit(price, avg, unit);
    }
    
    // Handle simple amounts: "200 ML", "1 L", "500 G"
    const simpleMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|gr|lt|adet)/);
    if (simpleMatch) {
      const amount = parseFloat(simpleMatch[1].replace(',', '.'));
      const unit = simpleMatch[2];
      
      // Skip count-based items (adet = piece)
      if (unit === 'adet') return null;
      
      return this.calculatePricePerBaseUnit(price, amount, unit);
    }
    
    return null; // Can't parse property
  }
  
  /**
   * Calculate price per base unit (TL per liter or TL per kg)
   * Converts all units to base units (L for liquids, KG for weights)
   */
  private calculatePricePerBaseUnit(price: number, amount: number, unit: string): number | null {
    const normalizedUnit = unit.toLowerCase();
    let baseAmount: number;
    
    // Convert to base units
    if (normalizedUnit === 'l' || normalizedUnit === 'lt') {
      baseAmount = amount; // Already in liters
    } else if (normalizedUnit === 'ml') {
      baseAmount = amount / 1000; // Convert ml to liters
    } else if (normalizedUnit === 'kg') {
      baseAmount = amount; // Already in kg
    } else if (normalizedUnit === 'g' || normalizedUnit === 'gr') {
      baseAmount = amount / 1000; // Convert g to kg
    } else {
      return null; // Unknown unit
    }
    
    if (baseAmount <= 0) return null;
    
    // Return price per base unit (TL per liter or TL per kg)
    return price / baseAmount;
  }

  /**
   * Apply brand filters to market products
   * Checks if brand name appears in product title
   */
  private applyBrandFilters(
    products: MarketProduct[],
    includeBrands: string[],
    excludeBrands: string[]
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

    return products.filter(product => {
      const normalizedTitle = normalizeString(product.title);
      
      // Exclude brands
      if (excludeBrands.length > 0) {
        const isExcluded = excludeBrands.some(excludeBrand => {
          const normalizedExclude = normalizeString(excludeBrand);
          return normalizedTitle.includes(normalizedExclude);
        });
        if (isExcluded) return false;
      }
      
      // Include brands
      if (includeBrands.length > 0) {
        const isIncluded = includeBrands.some(includeBrand => {
          const normalizedInclude = normalizeString(includeBrand);
          return normalizedTitle.includes(normalizedInclude);
        });
        if (!isIncluded) return false;
      }
      
      return true;
    });
  }

  /**
   * Calculate delivery fee dynamically based on order value and market rules
   * Returns calculated delivery cost (not a fixed amount)
   * Formula: Based on order value and market-specific thresholds
   */
  private calculateDeliveryFee(subtotal: number, market?: Market): number {
    if (!market) {
      // Default calculation: Free if subtotal > 200 TL, otherwise 20 TL
      return subtotal > 200 ? 0 : 20;
    }

    // Check if market has minimum order amount requirement
    const minOrder = market.min_order_amount ? parseFloat(market.min_order_amount.toString()) : 0;
    if (minOrder > 0 && subtotal < minOrder) {
      // Order doesn't meet minimum - return high fee (indicates can't order)
      return 999;
    }

    // Calculate delivery based on free_delivery_threshold
    const freeThreshold = market.free_delivery_threshold ? parseFloat(market.free_delivery_threshold.toString()) : null;

    if (freeThreshold !== null) {
      // If order meets free delivery threshold, delivery is free
      if (subtotal >= freeThreshold) {
        return 0; // Free delivery
      }
      
      // Calculate delivery based on order value
      // Default: 20 TL if below threshold
      // Can be customized per market if needed
      return 20;
    }

    // Fallback: Calculate based on order value
    // Free delivery if order > 200 TL, otherwise 20 TL
    return subtotal > 200 ? 0 : 20;
  }

  /**
   * Compare prices for a Product across all markets
   */
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
      effectivePrice: number; // Card price if available, otherwise regular price
    }[];
    cheapest: {
      marketName: string;
      price: number;
    } | null;
  }> {
    const product = await this.productRepo.findOne({
      where: { id: productId }
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Get all MarketProducts for this Product
    const marketProducts = await this.marketProductRepo.find({
      where: { product_master_id: productId, in_stock: true },
      relations: ['market']
    });

    const markets = marketProducts.map(mp => {
      const effectivePrice = mp.price_card ? parseFloat(mp.price_card.toString()) : parseFloat(mp.price.toString());
      return {
        marketName: mp.market.name,
        title: mp.title,
        price: parseFloat(mp.price.toString()),
        priceCard: mp.price_card ? parseFloat(mp.price_card.toString()) : null,
        property: mp.property,
        url: mp.url,
        imageUrl: mp.image_url,
        effectivePrice
      };
    });

    // Sort by effective price
    markets.sort((a, b) => a.effectivePrice - b.effectivePrice);

    const cheapest = markets.length > 0 ? {
      marketName: markets[0].marketName,
      price: markets[0].effectivePrice
    } : null;

    return {
      productId: product.id,
      productTitle: product.canonical_title,
      markets,
      cheapest
    };
  }
}
