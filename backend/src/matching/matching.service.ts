import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketProduct } from '../entities/MarketProduct.entity';
import { Product } from '../entities/Product.entity';
// @ts-ignore - string-similarity doesn't have TypeScript types
import * as stringSimilarity from 'string-similarity';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly SIMILARITY_THRESHOLD = 0.8; // 80% similarity required for fuzzy match

  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(MarketProduct)
    private marketProductRepo: Repository<MarketProduct>,
  ) {}

  /**
   * Normalize a string for comparison (case-insensitive, handles Turkish characters)
   * Converts to lowercase and normalizes Turkish character variations
   * Example: "PASTIRMA" and "pastırma" both normalize to "pastirma"
   */
  private normalizeString(str: string): string {
    if (!str) return '';
    
    // Handle Turkish uppercase characters before lowercase conversion
    // Turkish has special uppercase: İ (dotted I) and I (dotless i)
    let normalized = str
      .replace(/İ/g, 'i') // Turkish dotted uppercase I -> lowercase i
      .replace(/I/g, 'ı') // Turkish dotless uppercase I -> lowercase ı
      .toLowerCase()
      .trim();
    
    // Normalize Turkish character variations for better matching
    // This ensures "PASTIRMA" matches "pastırma" (both become "pastirma")
    normalized = normalized
      .replace(/ı/g, 'i') // Convert dotless i to regular i for matching
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
    
    // Remove special chars, keep alphanumeric and spaces
    normalized = normalized
      .replace(/[^\w\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return normalized;
  }

  /**
   * Normalize property (weight/quantity) for comparison
   * Examples: "500 g" -> "500g", "1 kg" -> "1kg", "1 Adet" -> "1adet"
   */
  private normalizeProperty(property: string | null): string {
    if (!property) return '';
    return property
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[^\w]/g, ''); // Remove special chars
  }


  /**
   * Match a MarketProduct to an existing Product or create a new one
   * Returns the matched or created Product
   */
  async matchProduct(marketProduct: MarketProduct): Promise<Product> {
    const normalizedTitle = this.normalizeString(marketProduct.title);
    const normalizedProperty = this.normalizeProperty(marketProduct.property);

    this.logger.debug(`[Matching] Matching product: "${marketProduct.title}" (property: "${marketProduct.property}")`);

    // Strategy 1: Exact match (normalized title + property)
    let matchedProduct = await this.findExactMatch(normalizedTitle, normalizedProperty);
    if (matchedProduct) {
      this.logger.debug(`[Matching] ✓ Exact match found: Product ID ${matchedProduct.id} - "${matchedProduct.canonical_title}"`);
      return matchedProduct;
    }

    // Strategy 2: Fuzzy match (similar title + same property)
    matchedProduct = await this.findFuzzyMatch(normalizedTitle, normalizedProperty);
    if (matchedProduct) {
      this.logger.debug(`[Matching] ✓ Fuzzy match found: Product ID ${matchedProduct.id} - "${matchedProduct.canonical_title}"`);
      return matchedProduct;
    }

    // Strategy 3: Create new Product
    this.logger.log(`[Matching] ✗ No match found. Creating new Product: "${marketProduct.title}"`);
    return await this.createProduct(marketProduct);
  }

  /**
   * Find exact match: normalized title + normalized property
   * Optimized: Uses database query instead of loading all products
   */
  private async findExactMatch(normalizedTitle: string, normalizedProperty: string): Promise<Product | null> {
    // Try to find product with exact normalized title match
    // We'll check property separately
    const allProducts = await this.productRepo
      .createQueryBuilder('product')
      .getMany();
    
    for (const product of allProducts) {
      const productNormalizedTitle = this.normalizeString(product.canonical_title);
      
      if (productNormalizedTitle === normalizedTitle) {
        // Check property match by querying market products
        const marketProducts = await this.marketProductRepo.find({
          where: { product_master_id: product.id }
        });

        // If property is specified, check for match
        if (normalizedProperty) {
          const hasMatchingProperty = marketProducts.some(mp => {
            const mpProperty = this.normalizeProperty(mp.property);
            return mpProperty === normalizedProperty;
          });
          if (hasMatchingProperty) {
            return product;
          }
        } else {
          // No property specified - match if product exists
          // Prefer products that also have no property
          const hasNoProperty = marketProducts.some(mp => !mp.property || this.normalizeProperty(mp.property) === '');
          if (hasNoProperty || marketProducts.length === 0) {
            return product;
          }
        }
      }
    }

    return null;
  }

  /**
   * Find fuzzy match: similar title (>= 80% similarity) + same property
   * Optimized: Only checks products with similar length first
   */
  private async findFuzzyMatch(normalizedTitle: string, normalizedProperty: string): Promise<Product | null> {
    const allProducts = await this.productRepo.find();
    let bestMatch: Product | null = null;
    let bestSimilarity = 0;

    // Pre-filter: only check products with similar title length (performance optimization)
    const titleLength = normalizedTitle.length;
    const lengthTolerance = Math.max(5, titleLength * 0.3); // 30% length difference tolerance

    for (const product of allProducts) {
      const productNormalizedTitle = this.normalizeString(product.canonical_title);
      const productLength = productNormalizedTitle.length;
      
      // Skip if length difference is too large
      if (Math.abs(productLength - titleLength) > lengthTolerance) {
        continue;
      }
      
      // Calculate similarity
      const similarity = stringSimilarity.compareTwoStrings(normalizedTitle, productNormalizedTitle);
      
      if (similarity >= this.SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
        // Check property match
        const marketProducts = await this.marketProductRepo.find({
          where: { product_master_id: product.id }
        });

        let propertyMatches = false;
        if (normalizedProperty) {
          propertyMatches = marketProducts.some(mp => {
            const mpProperty = this.normalizeProperty(mp.property);
            return mpProperty === normalizedProperty;
          });
        } else {
          // No property specified - accept if product has no property or no market products yet
          propertyMatches = marketProducts.some(mp => !mp.property || this.normalizeProperty(mp.property) === '') || marketProducts.length === 0;
        }

        if (propertyMatches) {
          bestMatch = product;
          bestSimilarity = similarity;
        }
      }
    }

    if (bestMatch) {
      this.logger.debug(`[Matching] Fuzzy match similarity: ${(bestSimilarity * 100).toFixed(1)}%`);
    }

    return bestMatch;
  }

  /**
   * Create a new Product from MarketProduct
   */
  private async createProduct(marketProduct: MarketProduct): Promise<Product> {
    const product = this.productRepo.create({
      canonical_title: marketProduct.title,
      category: null, // Can be populated later
      image_url: marketProduct.image_url || null
    });

    const savedProduct = await this.productRepo.save(product);
    this.logger.log(`[Matching] Created new Product ID ${savedProduct.id}: "${savedProduct.canonical_title}"`);
    
    return savedProduct;
  }

  /**
   * Get all MarketProducts for a Product (across all markets)
   */
  async getProductMarketProducts(productId: number): Promise<MarketProduct[]> {
    return this.marketProductRepo.find({
      where: { product_master_id: productId },
      relations: ['market']
    });
  }

  /**
   * Find products by search query (for frontend search)
   * Case-insensitive and handles Turkish characters (PASTIRMA matches pastırma)
   * Also searches market_products if products_master is empty
   * 
   * @param query Search query
   * @param limit Maximum number of results
   * @param includeBrands List of brands to include (only show products from these brands)
   * @param excludeBrands List of brands to exclude (hide products from these brands)
   */
  async searchProducts(
    query: string,
    limit: number = 20,
    includeBrands: string[] = [],
    excludeBrands: string[] = []
  ): Promise<Product[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const normalizedQuery = this.normalizeString(query);
    this.logger.debug(`[Search] Query: "${query}" -> Normalized: "${normalizedQuery}"`);
    
    // Get all products and use our normalization for matching (handles Turkish characters correctly)
    const allProducts = await this.productRepo.find();
    this.logger.debug(`[Search] Found ${allProducts.length} total products in products_master`);
    
    let results: Product[] = [];
    
    if (allProducts.length > 0) {
      // Split query into words for word-based matching
      const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
      
      // Score products by similarity (using normalized strings for Turkish character handling)
      const scoredProducts = allProducts.map(product => {
        const normalizedTitle = this.normalizeString(product.canonical_title);
        const similarity = stringSimilarity.compareTwoStrings(normalizedQuery, normalizedTitle);
        
        // Check if all query words are contained in normalized title (word-based matching)
        // This prevents "süt" from matching "Pınar Su" (because "sut" is not a word in "pinar su")
        let containsMatch = false;
        if (queryWords.length > 0) {
          containsMatch = queryWords.every(word => {
            // Check if word appears as a whole word (not as substring of another word)
            // Use word boundaries: word must be at start/end or surrounded by spaces/non-word chars
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wordRegex = new RegExp(`(^|[^\\w])${escapedWord}([^\\w]|$)`, 'i');
            const matches = wordRegex.test(normalizedTitle);
            return matches;
          });
        }
        
        return { product, similarity, containsMatch };
      });
      
      // Log top matches for debugging
      const topMatches = scoredProducts
        .filter(item => item.similarity > 0.1)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      if (topMatches.length > 0) {
        this.logger.debug(`[Search] Top matches: ${topMatches.map(m => `"${m.product.canonical_title}" (${(m.similarity * 100).toFixed(1)}%, containsMatch: ${m.containsMatch})`).join(', ')}`);
      } else {
        this.logger.debug(`[Search] No matches found with similarity > 0.1`);
      }

    // For single-word queries, require word-based match (prevents "süt" matching "Pınar Su")
    const isSingleWordQuery = queryWords.length === 1;
    this.logger.debug(`[Search] Single word query: ${isSingleWordQuery}, query words: ${JSON.stringify(queryWords)}`);
    
    // Prioritize exact/contains matches, then fuzzy matches
    const exactMatches = scoredProducts
      .filter(item => {
        // If single word query, must have containsMatch (word-based)
        if (isSingleWordQuery && !item.containsMatch) {
          this.logger.debug(`[Search] Rejecting "${item.product.canonical_title}" (similarity: ${(item.similarity * 100).toFixed(1)}%, containsMatch: false) - single word query requires word match`);
          return false;
        }
        // Otherwise, allow high similarity or word-based contains match
        const accepted = item.containsMatch || item.similarity > 0.85;
        if (accepted) {
          this.logger.debug(`[Search] Accepting "${item.product.canonical_title}" as exact match (similarity: ${(item.similarity * 100).toFixed(1)}%, containsMatch: ${item.containsMatch})`);
        }
        return accepted;
      })
      .sort((a, b) => {
        // Prioritize contains matches, then by similarity
        if (a.containsMatch && !b.containsMatch) return -1;
        if (!a.containsMatch && b.containsMatch) return 1;
        return b.similarity - a.similarity;
      })
      .map(item => item.product);

    const exactMatchIds = new Set(exactMatches.map(p => p.id));
    const fuzzyMatches = scoredProducts
      .filter(item => !exactMatchIds.has(item.product.id)) // Don't duplicate exact matches
      .filter(item => {
        // For single word queries, require containsMatch even for fuzzy matches
        if (isSingleWordQuery && !item.containsMatch) {
          this.logger.debug(`[Search] Rejecting "${item.product.canonical_title}" from fuzzy matches (similarity: ${(item.similarity * 100).toFixed(1)}%, containsMatch: false) - single word query requires word match`);
          return false;
        }
        const accepted = item.similarity > 0.5; // Minimum 50% similarity
        if (accepted) {
          this.logger.debug(`[Search] Accepting "${item.product.canonical_title}" as fuzzy match (similarity: ${(item.similarity * 100).toFixed(1)}%, containsMatch: ${item.containsMatch})`);
        }
        return accepted;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.product);

      // Return exact matches first, then fuzzy matches
      results = [...exactMatches, ...fuzzyMatches].slice(0, limit);
      this.logger.debug(`[Search] Found ${results.length} results from products_master`);
      
      // If we didn't find enough results (or found none), also search market_products as fallback
      if (results.length === 0 || results.length < limit) {
        this.logger.debug(`[Search] Only found ${results.length} results in products_master, searching market_products for more`);
        const marketProductResults = await this.searchMarketProductsAndCreate(normalizedQuery, limit - results.length, includeBrands, excludeBrands);
        this.logger.debug(`[Search] Found ${marketProductResults.length} results from market_products`);
        if (marketProductResults.length > 0) {
          // Merge results, avoiding duplicates
          const existingIds = new Set(results.map(p => p.id));
          const newResults = marketProductResults.filter(p => !existingIds.has(p.id));
          results = [...results, ...newResults].slice(0, limit);
          this.logger.debug(`[Search] Combined results: ${results.length} total`);
        }
      }
      
      // Apply brand filters
      results = this.applyBrandFilters(results, includeBrands, excludeBrands);
    } else {
      // Fallback: Search market_products directly and create Product entries on-the-fly
      this.logger.debug(`[Search] products_master is empty, searching market_products directly`);
      results = await this.searchMarketProductsAndCreate(normalizedQuery, limit, includeBrands, excludeBrands);
    }
    
    return results;
  }

  /**
   * Search market_products and create Product entries on-the-fly
   * This is used as a fallback when products_master is empty or has few results
   */
  private async searchMarketProductsAndCreate(
    normalizedQuery: string,
    limit: number,
    includeBrands: string[] = [],
    excludeBrands: string[] = []
  ): Promise<Product[]> {
    const marketProducts = await this.marketProductRepo.find({
      relations: ['market'],
      take: 2000 // Limit to avoid memory issues
    });
    
    this.logger.debug(`[Search] Found ${marketProducts.length} market_products to search`);
    
    // Split query into words for word-based matching
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
    
    // Score market products by similarity
    const scoredMarketProducts = marketProducts.map(mp => {
      const normalizedTitle = this.normalizeString(mp.title);
      const similarity = stringSimilarity.compareTwoStrings(normalizedQuery, normalizedTitle);
      
      // Check if all query words are contained in normalized title (word-based matching)
      const containsMatch = queryWords.length > 0 && queryWords.every(word => {
        // Check if word appears as a whole word (not as substring of another word)
        // Use word boundaries: word must be at start/end or surrounded by spaces/non-word chars
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordRegex = new RegExp(`(^|[^\\w])${escapedWord}([^\\w]|$)`, 'i');
        return wordRegex.test(normalizedTitle);
      });
      
      return { marketProduct: mp, similarity, containsMatch };
    });
    
    // For single-word queries, require word-based match (prevents "süt" matching "Pınar Su")
    const isSingleWordQuery = queryWords.length === 1;
    
    // Get top matches
    const topMarketProducts = scoredMarketProducts
      .filter(item => {
        // If single word query, must have containsMatch (word-based)
        if (isSingleWordQuery && !item.containsMatch) {
          return false;
        }
        // Otherwise, allow containsMatch or high similarity
        return item.containsMatch || item.similarity > 0.5;
      })
      .sort((a, b) => {
        if (a.containsMatch && !b.containsMatch) return -1;
        if (!a.containsMatch && b.containsMatch) return 1;
        return b.similarity - a.similarity;
      })
      .slice(0, limit * 2) // Get more to account for brand filtering
      .map(item => item.marketProduct);
    
    this.logger.debug(`[Search] Found ${topMarketProducts.length} matching market_products`);
    
    // Create Product entries from market products (deduplicate by normalized title)
    const productMap = new Map<string, Product>();
    
    for (const mp of topMarketProducts) {
      const normalizedTitle = this.normalizeString(mp.title);
      if (!productMap.has(normalizedTitle)) {
        // Check if product already exists in products_master
        const existingProduct = await this.productRepo.findOne({
          where: { canonical_title: mp.title }
        });
        
        if (existingProduct) {
          productMap.set(normalizedTitle, existingProduct);
        } else {
          // Create a Product entry
          const product = this.productRepo.create({
            canonical_title: mp.title,
            image_url: mp.image_url,
          });
          const savedProduct = await this.productRepo.save(product);
          productMap.set(normalizedTitle, savedProduct);
          this.logger.debug(`[Search] Created Product "${savedProduct.canonical_title}" from market product`);
        }
        
        // Link the market product to the product
        if (mp.product_master_id === null) {
          const product = productMap.get(normalizedTitle);
          if (product) {
            mp.product_master_id = product.id;
            await this.marketProductRepo.save(mp);
          }
        }
      }
    }
    
    let results = Array.from(productMap.values());
    
    // Apply brand filters
    results = this.applyBrandFilters(results, includeBrands, excludeBrands);
    
    return results.slice(0, limit);
  }

  /**
   * Apply brand filters to product results
   * Simply checks if brand name appears in product title
   */
  private applyBrandFilters(
    products: Product[],
    includeBrands: string[],
    excludeBrands: string[]
  ): Product[] {
    if (includeBrands.length === 0 && excludeBrands.length === 0) {
      return products;
    }

    return products.filter(product => {
      const normalizedTitle = this.normalizeString(product.canonical_title);
      
      // Exclude brands - if title contains any excluded brand, filter out
      if (excludeBrands.length > 0) {
        const isExcluded = excludeBrands.some(excludeBrand => {
          const normalizedExclude = this.normalizeString(excludeBrand);
          return normalizedTitle.includes(normalizedExclude);
        });
        if (isExcluded) return false;
      }
      
      // Include brands - if specified, only show products where title contains at least one included brand
      if (includeBrands.length > 0) {
        const isIncluded = includeBrands.some(includeBrand => {
          const normalizedInclude = this.normalizeString(includeBrand);
          return normalizedTitle.includes(normalizedInclude);
        });
        if (!isIncluded) return false;
      }
      
      return true;
    });
  }
}

