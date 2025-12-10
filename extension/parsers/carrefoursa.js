// CarrefourSA-specific parser
class CarrefourSAParser extends BaseParser {
  constructor() {
    super();
    this.marketName = 'CarrefourSA';
  }

  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // CarrefourSA product detail pages: /urun/product-name-p-{id} or /p-{id}
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
    
    
    // CarrefourSA uses .product-wrapper or .product-card
    const selectors = [
      '.product-wrapper',
      '.product-card',
      '.item.product-wrapper',
      '.item.product-card'
    ];

    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) {
        
        return Array.from(nodes);
      }
    }

    // Fallback: product links
    const links = document.querySelectorAll('a.product-return, a[href*="/p-"]');
    
    return Array.from(links);
  }

  extractProductData(card) {
    // CarrefourSA structure:
    // .product-wrapper > .product-card > .pl-inner > .hover-box > .product_click > a.product-return
    // Title: h3.item-name
    // Price: .item-price.js-variant-discounted-price (discounted) or .js-variant-price (original)
    // Image: img inside .thumb or a.product-return
    // URL: a.product-return href
    
    let container = card;
    
    // If card is a link, find the parent product-wrapper
    if (card.tagName === 'A' || card.tagName === 'a') {
      container = card.closest('.product-wrapper') || card.closest('.product-card') || card.parentElement;
    }
    
    // If container is not product-wrapper, try to find it
    if (!container || !container.classList.contains('product-wrapper')) {
      container = card.closest('.product-wrapper') || card.closest('.product-card') || card;
    }

    // Find product URL - CarrefourSA uses relative URLs like /product-name-p-30098665
    let productUrl = window.location.href;
    const productLink = container.querySelector('a.product-return');
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
    
    // 1. Try specific title element (CarrefourSA has h3.item-name - very specific, unlikely to be category header)
    if (!title) {
      const titleEl = container.querySelector('h3.item-name');
      if (titleEl) {
        const candidate = titleEl.innerText.trim();
        // Filter out generic category names as a safeguard
        if (candidate && candidate.length >= 3 && 
            !candidate.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i)) {
          title = candidate;
          
        }
      }
    }
    
    // 2. Fallback: try image alt (usually product-specific)
    if (!title || title.length < 3) {
      const img = container.querySelector('img');
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
    // CarrefourSA includes property in the title itself (e.g., "Purina One Adult Sığır Etli Kuru Kedi Maması 800 Gr")
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

    // Find prices - CarrefourSA has:
    // 1. Regular price: .js-variant-price (original, crossed out) - this is the STANDARD price
    // 2. Card price: .item-price.js-variant-discounted-price (CarrefourSA Card price, usually cheaper)
    let regularPriceMatch = null;
    let cardPriceMatch = null;
    
    const priceContainer = container.querySelector('.price-cont, .item-price-contain');
    if (priceContainer) {
      // Extract regular price FIRST (original price, usually crossed out with class "priceLineThrough")
      // This is the price WITHOUT card discount - look for the crossed-out price
      const regularPriceEl = priceContainer.querySelector('.priceLineThrough.js-variant-price, .js-variant-price.priceLineThrough, .priceLineThrough');
      if (regularPriceEl) {
        const priceText = regularPriceEl.innerText || regularPriceEl.textContent || '';
        regularPriceMatch = this.findPrice(priceText);
        if (regularPriceMatch) {
          
        }
      }
      
      // Extract card price (discounted price for CarrefourSA Card holders)
      // This is the price WITH card discount (usually cheaper) - NOT crossed out
      // Look for .item-price.js-variant-discounted-price which does NOT have priceLineThrough class
      const cardPriceEl = priceContainer.querySelector('.item-price.js-variant-discounted-price');
      if (cardPriceEl && !cardPriceEl.classList.contains('priceLineThrough')) {
        const priceText = cardPriceEl.innerText || cardPriceEl.textContent || '';
        cardPriceMatch = this.findPrice(priceText);
        if (cardPriceMatch) {
          
        }
      }
      
      // Also check content attribute - this is usually the card price
      // Only use it if we don't already have a card price from the element
      if (!cardPriceMatch) {
        const priceEl = priceContainer.querySelector('[itemprop="price"]');
        if (priceEl && priceEl.getAttribute('content')) {
          const contentValue = priceEl.getAttribute('content');
          // Parse the content value (it's usually a number like "69.9")
          cardPriceMatch = contentValue;
          
        }
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
    // If we have both, use regular as primary and card as discount
    if (cardPriceMatch && !regularPriceMatch) {
      regularPriceMatch = cardPriceMatch; // Card price becomes the regular price
      cardPriceMatch = null; // No separate card discount
    }

    // Find image - CarrefourSA has img inside .thumb or a.product-return
    let imgSrc = null;
    const thumbEl = container.querySelector('.thumb');
    if (thumbEl) {
      const imgEl = thumbEl.querySelector('img');
      if (imgEl) {
        imgSrc = imgEl.src || 
                 imgEl.getAttribute('data-src') || 
                 imgEl.getAttribute('data-lazy-src') || 
                 imgEl.getAttribute('data-original');
      }
    }
    
    // Fallback: find any img in container
    if (!imgSrc) {
      const imgEl = container.querySelector('img');
      if (imgEl) {
        imgSrc = imgEl.src || 
                 imgEl.getAttribute('data-src') || 
                 imgEl.getAttribute('data-lazy-src') || 
                 imgEl.getAttribute('data-original');
      }
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

    // Validate: card price should be cheaper than regular price (if both exist)
    // If they're the same, don't set card price (no discount available)
    let finalCardPrice = parsedCardPrice;
    if (parsedCardPrice && parsedRegularPrice && parsedCardPrice >= parsedRegularPrice) {
      
      finalCardPrice = null; // Don't set card price if it's not actually cheaper
    }

    

    return {
      title: title, // Clean title without property (e.g., "Domates" instead of "Domates 500g")
      price: parsedRegularPrice, // ALWAYS the regular/standard price
      price_card: finalCardPrice, // Card/membership price (if available and cheaper)
      image_url: finalImageUrl,
      product_url: productUrl,
      market: this.marketName,
      currency: 'TRY',
      property: property, // Weight, quantity, or other property info (e.g., "500 g", "1 kg", "1 Adet")
      scanned_at: new Date().toISOString()
    };
  }
}

// Make CarrefourSAParser available globally
window.CarrefourSAParser = CarrefourSAParser;

