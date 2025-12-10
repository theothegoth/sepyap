// Migros-specific parser
class MigrosParser extends BaseParser {
  constructor() {
    super();
    this.marketName = 'Migros';
  }

  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // Migros product detail pages: /urun/product-name-p-{id} or /p-{id}
    // Must have /p- pattern with at least 2 path segments
    if (pathname.includes('/p-') && pathname.split('/').filter(p => p).length >= 2) {
      // Additional check: ensure it's not a category listing
      const pathParts = pathname.split('/').filter(p => p);
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.startsWith('p-') && lastPart.length > 5) {
        return 'product-detail';
      }
    } else if (pathname.includes('/urun/') && pathname.split('/').filter(p => p).length >= 3) {
      // Alternative: /urun/category/product-name format
      return 'product-detail';
    }
    
    if (pathname.includes('/arama') || url.includes('?q=')) {
      return 'search-results';
    } else if (pathname.includes('/kategori/') || pathname.includes('/category/')) {
      return 'category';
    } else if (pathname === '/' || pathname === '/anasayfa' || pathname === '') {
      return 'homepage';
    }
    return 'unknown';
  }

  getProductCards() {
    const pageType = this.detectPageType();
    
    
    // Migros uses Angular Material with custom components
    // Main container: sm-list-page-item.list-item
    // Card: mat-card inside sm-list-page-item
    const selectors = [
      'sm-list-page-item.list-item',
      'sm-list-page-item',
      'mat-card', // Fallback to mat-card directly
      '.list-item'
    ];

    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) {
        
        return Array.from(nodes);
      }
    }

    // Fallback: product links
    const links = document.querySelectorAll('a.product-link, a#product-image-link, a#product-name');
    
    return Array.from(links);
  }

  extractProductData(card) {
    // Migros structure:
    // sm-list-page-item > mat-card > fe-product-image > a.product-link > img.product-image
    // sm-list-page-item > mat-card > a#product-name (title)
    // sm-list-page-item > mat-card > fe-product-price > .price > .single-price-amount
    
    let container = card;
    
    // If card is a link, find the parent sm-list-page-item
    if (card.tagName === 'A' || card.tagName === 'a') {
      container = card.closest('sm-list-page-item') || card.closest('mat-card') || card.parentElement;
    }
    
    // If container is not sm-list-page-item, try to find it
    if (!container || container.tagName !== 'SM-LIST-PAGE-ITEM') {
      container = card.closest('sm-list-page-item') || card;
    }

    // Find product URL - Migros uses relative URLs like /product-name-p-31a14e
    let productUrl = window.location.href;
    const productLink = container.querySelector('a.product-link, a#product-image-link, a#product-name');
    if (productLink && productLink.href) {
      productUrl = productLink.href;
      // Convert relative URLs to absolute
      if (productUrl.startsWith('/')) {
        productUrl = window.location.origin + productUrl;
      }
    }

    // Extract title - prioritize URL slug (most reliable, unique per product)
    // Then try specific DOM elements, which are usually product-specific
    let title = '';
    
    // 0. FIRST: Try URL slug if we have a unique product URL (most reliable)
    if (productUrl && (productUrl.includes('/p-') || productUrl.includes('/urun/'))) {
      const urlTitle = this.extractTitleFromUrl(productUrl);
      if (urlTitle && urlTitle.length > 5) {
        title = urlTitle;
        
      }
    }
    
    // 1. Try specific title element (Migros has a#product-name - very specific, unlikely to be category header)
    if (!title) {
      const titleEl = container.querySelector('a#product-name, a.product-name');
      if (titleEl) {
        const candidate = titleEl.innerText.trim();
        // Filter out generic category names as a safeguard
        if (candidate && candidate.length >= 3 && 
            !candidate.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i)) {
          title = candidate;
          
        } else if (candidate && candidate.includes('Tamek')) {
          // Debug: log Tamek products to see what's happening
          
        }
      }
    }
    
    // 2. Fallback: try image alt (usually product-specific)
    if (!title || title.length < 3) {
      const img = container.querySelector('img.product-image');
      if (img && img.alt) {
        const altText = img.alt.trim();
        if (altText && altText.length >= 3 &&
            !altText.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i)) {
          title = altText;
          
        }
      }
    }
    
    // 3. Final fallback: extract from URL slug (if not already tried)
    if (!title && productUrl) {
      const urlTitle = this.extractTitleFromUrl(productUrl);
      if (urlTitle && urlTitle.length > 5) {
        title = urlTitle;
        
      }
    }

    if (!title || title.length < 3 || title.length >= 200) {
      return null;
    }

    // Extract property (weight/quantity) from title text BEFORE cleaning title
    // Migros includes property in the title itself (e.g., "Tat Mısır 3 x 210 G")
    // Extract from title text directly
    let property = null;
    if (title) {
      // Create a temporary element to extract property from title text
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

    // Clean weight/unit information from title (e.g., "İncir 500 g" -> "İncir")
    // Use the base class utility method
    const titleBeforeClean = title;
    title = this.cleanPropertyFromTitle(title);
    if (titleBeforeClean !== title) {
      
    }

    // Find prices - Migros has:
    // 1. Regular price: fe-product-price > .price > .single-price-amount
    // 2. Money card price: fe-money-discount-label > .sale-price (if available)
    let regularPriceMatch = null;
    let cardPriceMatch = null;
    
    const priceContainer = container.querySelector('fe-product-price, .price-container');
    if (priceContainer) {
      // Extract regular price
      const priceEl = priceContainer.querySelector('.single-price-amount, .price');
      if (priceEl) {
        const priceText = priceEl.innerText || priceEl.textContent || '';
        regularPriceMatch = this.findPrice(priceText);
      }
    }
    
    // Extract Money card price (Migros Money card discount)
    const moneyDiscountContainer = container.querySelector('fe-money-discount-label, .money-discount');
    if (moneyDiscountContainer) {
      const cardPriceEl = moneyDiscountContainer.querySelector('.sale-price, .price-content');
      if (cardPriceEl) {
        const priceText = cardPriceEl.innerText || cardPriceEl.textContent || '';
        cardPriceMatch = this.findPrice(priceText);
      }
    }
    
    // Fallback: search in container text
    if (!regularPriceMatch && !cardPriceMatch) {
      const text = container.innerText || container.textContent || '';
      const fallbackPrice = this.findPrice(text);
      if (fallbackPrice) {
        regularPriceMatch = fallbackPrice;
      }
    }

    // We need at least one price
    if (!regularPriceMatch && !cardPriceMatch) {
      return null;
    }
    
    // If we have card price but no regular price, use card price as regular (no discount available)
    if (cardPriceMatch && !regularPriceMatch) {
      regularPriceMatch = cardPriceMatch; // Card price becomes the regular price
      cardPriceMatch = null; // No separate card discount
    }

    // Find image
    let imgSrc = null;
    const imgEl = container.querySelector('img.product-image');
    if (imgEl) {
      imgSrc = imgEl.src || 
               imgEl.getAttribute('data-src') || 
               imgEl.getAttribute('data-lazy-src') || 
               imgEl.getAttribute('data-original');
    }
    
    // Fallback: use findImage method
    if (!imgSrc) {
      const { src } = this.findImage(container);
      imgSrc = src;
    }
    
    const finalImageUrl = imgSrc || 'https://via.placeholder.com/200x200?text=No+Image';

    // Parse both prices
    const parsedRegularPrice = regularPriceMatch ? this.parseCurrency(regularPriceMatch) : null;
    const parsedCardPrice = cardPriceMatch ? this.parseCurrency(cardPriceMatch) : null;

    // Ensure we have a valid regular price
    if (!parsedRegularPrice || parsedRegularPrice <= 0) {
      return null;
    }

    return {
      title: title, // Clean title without property (e.g., "Domates" instead of "Domates 500g")
      price: parsedRegularPrice, // ALWAYS the regular/standard price
      price_card: parsedCardPrice, // Card/membership price (if available, should be cheaper)
      image_url: finalImageUrl,
      product_url: productUrl,
      market: this.marketName,
      currency: 'TRY',
      property: property, // Weight, quantity, or other property info (e.g., "500 g", "1 kg", "1 Adet")
      scanned_at: new Date().toISOString()
    };
  }
}

// Make MigrosParser available globally
window.MigrosParser = MigrosParser;

