// A101 Kapıda-specific parser
class A101Parser extends BaseParser {
  constructor() {
    super();
    this.marketName = 'A101';
  }

  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // A101 product detail pages: /kapida/category/product-name_p-{id}
    // Must have _p-{id} pattern to be a product detail page
    if (pathname.includes('/kapida/') && pathname.includes('_p-')) {
      return 'product-detail';
    } else if (pathname.includes('/arama') || url.includes('?q=') || url.includes('search=')) {
      return 'search-results';
    } else if (pathname.includes('/kategori/') || pathname.includes('/category/') || (pathname.includes('/kapida/') && !pathname.includes('_p-'))) {
      return 'category';
    } else if (pathname === '/' || pathname === '/anasayfa' || pathname === '') {
      return 'homepage';
    }
    return 'unknown';
  }

  getProductCards() {
    const pageType = this.detectPageType();
    
    
    // A101 Kapıda uses grid layout with product containers
    // Collect ALL products from different sections (not just first match)
    // But filter to only include containers that actually have product elements
    const allProducts = new Set();
    
    // Helper function to check if an element looks like a product card
    const isProductCard = (el) => {
      // Must have at least one of: product link, title, or price
      const hasLink = el.querySelector('a[href*="/kapida/"][href*="_p-"]');
      const hasTitle = el.querySelector('h3.line-clamp-3, div.line-clamp-3, h3[class*="line-clamp"], div[class*="line-clamp"]');
      const hasPrice = el.querySelector('div.text-md, div[class*="text-md"], div[class*="text-base"]');
      return hasLink || hasTitle || hasPrice;
    };
    
    // 1. Main grid products (div.w-full.h-full inside grid)
    // These are the main product listings
    const gridProducts = document.querySelectorAll('div.w-full.h-full');
    if (gridProducts.length > 0) {
      let validCount = 0;
      gridProducts.forEach(p => {
        if (isProductCard(p)) {
          allProducts.add(p);
          validCount++;
        }
      });
      
    }
    
    // 2. Recommended items (carousel/swiper slides)
    const recommendedItems = document.querySelectorAll('.recommended-item');
    if (recommendedItems.length > 0) {
      let validCount = 0;
      recommendedItems.forEach(p => {
        if (isProductCard(p)) {
          allProducts.add(p);
          validCount++;
        }
      });
      
    }
    
    // 3. Products with data-pcid attribute
    const pcidProducts = document.querySelectorAll('[data-pcid]');
    if (pcidProducts.length > 0) {
      let validCount = 0;
      pcidProducts.forEach(p => {
        if (isProductCard(p)) {
          allProducts.add(p);
          validCount++;
        }
      });
      
    }
    
    if (allProducts.size > 0) {
      console.log(`[A101Parser] Found ${allProducts.size} product cards using selectors`);
      return Array.from(allProducts);
    }

    // Fallback: product links (A101 URLs are like /kapida/meyve-sebze/product-name_p-id)
    const links = document.querySelectorAll('a[href*="/kapida/"][href*="_p-"]');
    console.log(`[A101Parser] Fallback: Found ${links.length} product links`);
    
    return Array.from(links);
  }

  extractProductData(card) {
    // A101 Kapıda structure:
    // .w-full.h-full > .w-full > .relative > .w-full.border (product card)
    //   > a[href*="/kapida/"] (product link)
    //   > div.h-[120px] > h3.line-clamp-3 (title)
    //   > div.h-[39px] > div.text-md (price)
    
    let container = card;
    
    // If card is a link, find the parent product container
    if (card.tagName === 'A' || card.tagName === 'a') {
      container = card.closest('.w-full.h-full') || 
                  card.closest('[data-pcid]') ||
                  card.closest('.recommended-item') ||
                  card.closest('div[class*="border"]') ||
                  card.parentElement;
    }
    
    // If container is not a product container, try to find it
    // Check if container has product-related elements
    const hasProductLink = container.querySelector('a[href*="/kapida/"][href*="_p-"]');
    const hasProductTitle = container.querySelector('h3.line-clamp-3, div.line-clamp-3, h3[class*="line-clamp"], div[class*="line-clamp"]');
    const hasProductPrice = container.querySelector('div.text-md, div[class*="text-md"], div[class*="text-base"]');
    
    // If current container doesn't look like a product card, try to find the actual product container
    if (!hasProductLink && !hasProductTitle && !hasProductPrice) {
      // Try to find parent containers that might have product elements
      container = card.closest('.w-full.h-full') || 
                  card.closest('[data-pcid]') ||
                  card.closest('.recommended-item') ||
                  card.closest('div[class*="border"]') ||
                  card.parentElement ||
                  card;
      
      // Check again after finding new container
      const newHasProductLink = container.querySelector('a[href*="/kapida/"][href*="_p-"]');
      const newHasProductTitle = container.querySelector('h3.line-clamp-3, div.line-clamp-3, h3[class*="line-clamp"], div[class*="line-clamp"]');
      const newHasProductPrice = container.querySelector('div.text-md, div[class*="text-md"], div[class*="text-base"]');
      
      // If still no product elements, this might not be a product card - skip it
      if (!newHasProductLink && !newHasProductTitle && !newHasProductPrice) {
        // Last resort: try searching within the card's children
        const childLink = card.querySelector('a[href*="/kapida/"][href*="_p-"]');
        if (childLink) {
          container = childLink.closest('.w-full.h-full') || 
                      childLink.closest('[data-pcid]') ||
                      childLink.closest('.recommended-item') ||
                      childLink.parentElement ||
                      card;
        }
      }
    }
    
    // Find product URL - A101 uses URLs like /kapida/meyve-sebze/sogan-kg_p-20000796
    let productUrl = window.location.href;
    const productLink = container.querySelector('a[href*="/kapida/"][href*="_p-"]') || 
                        (card.tagName === 'A' && card.href.includes('/kapida/') && card.href.includes('_p-') ? card : null);
    if (productLink && productLink.href) {
      productUrl = productLink.href;
      // Convert relative URLs to absolute
      if (productUrl.startsWith('/')) {
        productUrl = window.location.origin + productUrl;
      }
    }
    
    // Extract title - A101 has h3.line-clamp-3 or div.line-clamp-3
    let title = '';
    
    // 1. Try h3.line-clamp-3 or div.line-clamp-3 (most reliable)
    const titleSelectors = [
      'h3.line-clamp-3',
      'div.line-clamp-3',
      'h3[class*="line-clamp"]',
      'div[class*="line-clamp"]',
      'h3',
      'h2',
      'div[class*="font-medium"]'
    ];
    
    for (const sel of titleSelectors) {
      const titleEl = container.querySelector(sel);
      if (titleEl) {
        const candidate = titleEl.innerText.trim();
        // Filter out generic text like "Sepete Ekle" or prices
        if (candidate && candidate.length >= 3 && candidate.length < 200 && 
            !candidate.match(/^(₺|TL|Sepete|Ekle|Adet|kg|g|ml|l)$/i)) {
          title = candidate;
          
          break;
        }
      }
    }
    
    // 2. Try image alt (usually product-specific)
    if (!title || title.length < 3) {
      const img = container.querySelector('img');
      if (img && img.alt) {
        const altText = img.alt.trim();
        if (altText && altText.length >= 3 && altText.length < 200) {
          title = altText;
          
        }
      }
    }
    
    // 3. Try URL slug as fallback
    if (!title && productUrl && productUrl !== window.location.href) {
      // A101 URLs are like /kapida/meyve-sebze/sogan-kg_p-20000796
      // Extract product name from URL
      try {
        const urlObj = new URL(productUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          // Remove _p-{id} suffix
          const slug = lastPart.replace(/_p-\d+$/, '').replace(/-/g, ' ').trim();
          if (slug && slug.length > 3) {
            title = slug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
          }
        }
      } catch (e) {
        // Ignore URL parsing errors
      }
    }

    if (!title || title.length < 3 || title.length >= 200) {
      
      return null;
    }

    // Extract property (weight/quantity) from title text BEFORE cleaning
    let property = null;
    if (title) {
      const tempDiv = document.createElement('div');
      tempDiv.textContent = title;
      property = this.extractProperty(tempDiv);
      if (property) {
        
      }
    }
    
    // Fallback: try container if title extraction failed
    if (!property) {
      property = this.extractProperty(container);
      if (property) {
        
      }
    }

    // Clean weight/unit information from title
    const titleBeforeClean = title;
    title = this.cleanPropertyFromTitle(title);
    if (titleBeforeClean !== title) {
      
    }

    // Find prices - A101 has div.text-md with price like "₺12,75"
    let priceMatch = null;
    
    // Try multiple price selectors
    const priceSelectors = [
      'div.text-md',
      'div[class*="text-md"]',
      'div[class*="text-base"]',
      'div[class*="font-medium"]',
      'span[class*="text-md"]',
      'span[class*="text-base"]',
      'div.price',
      'span.price'
    ];
    
    for (const sel of priceSelectors) {
      const priceEl = container.querySelector(sel);
      if (priceEl) {
        const priceText = priceEl.innerText || priceEl.textContent || '';
        priceMatch = this.findPrice(priceText);
        if (priceMatch) {
          
          break;
        }
      }
    }
    
    // Fallback: search in container text (but exclude title text)
    if (!priceMatch) {
      const text = container.innerText || container.textContent || '';
      // Remove title from text to avoid false matches
      const textWithoutTitle = text.replace(title, '').trim();
      priceMatch = this.findPrice(textWithoutTitle);
      if (priceMatch) {
        
      }
    }

    if (!priceMatch) {
      
      return null;
    }

    const parsedPrice = this.parseCurrency(priceMatch);
    if (!parsedPrice || parsedPrice <= 0) {
      return null;
    }

    // Find image
    let imgSrc = null;
    const img = container.querySelector('img');
    if (img) {
      imgSrc = img.src || 
               img.getAttribute('data-src') || 
               img.getAttribute('data-lazy-src') || 
               img.getAttribute('data-original');
    }
    
    if (!imgSrc) {
      const { src } = this.findImage(container);
      imgSrc = src;
    }
    
    const finalImageUrl = imgSrc || 'https://via.placeholder.com/200x200?text=No+Image';

    return {
      title: title,
      price: parsedPrice,
      image_url: finalImageUrl,
      product_url: productUrl,
      market: this.marketName,
      currency: 'TRY',
      property: property,
      scanned_at: new Date().toISOString()
    };
  }
}

// Make A101Parser available globally
window.A101Parser = A101Parser;

