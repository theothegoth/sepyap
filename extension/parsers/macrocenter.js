// Macrocenter-specific parser
class MacrocenterParser extends BaseParser {
  constructor() {
    super();
    this.marketName = 'Macrocenter';
  }

  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // Macrocenter product detail pages: /product-name-p-{id}
    // Must have /p- pattern with product ID
    if (pathname.includes('/p-') && pathname.split('/').filter(p => p).length >= 2) {
      const pathParts = pathname.split('/').filter(p => p);
      const lastPart = pathParts[pathParts.length - 1];
      // Check if last part is a product ID (p-{id} format)
      if (lastPart.startsWith('p-') && lastPart.length > 5) {
        return 'product-detail';
      }
    }
    
    if (pathname.includes('/arama') || url.includes('?q=') || url.includes('search=')) {
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
    
    
    // Macrocenter uses Angular components: fe-product-card
    const selectors = [
      'fe-product-card',
      'fe-product-card[fegtm]'
    ];

    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) {
        
        return Array.from(nodes);
      }
    }

    // Fallback: product links
    const links = document.querySelectorAll('a.product-link, a#product-image-link');
    
    return Array.from(links);
  }

  extractProductData(card) {
    // Macrocenter structure:
    // fe-product-card > fe-product-name > h1 > a (title link)
    // fe-product-card > fe-product-image > a.product-link > img.product-image
    // fe-product-card > fe-product-price > .price > span (price)
    
    let container = card;
    
    // If card is a link, find the parent fe-product-card
    if (card.tagName === 'A' || card.tagName === 'a') {
      container = card.closest('fe-product-card') || card.parentElement;
    }
    
    // If container is not fe-product-card, try to find it
    if (!container || container.tagName !== 'FE-PRODUCT-CARD') {
      container = card.closest('fe-product-card') || card;
    }
    
    // Find product URL - Macrocenter uses relative URLs like /hiyar-badem-kg-p-1ad55bf
    let productUrl = window.location.href;
    const productLink = container.querySelector('a.product-link, a#product-image-link');
    if (productLink && productLink.href) {
      productUrl = productLink.href;
      // Convert relative URLs to absolute
      if (productUrl.startsWith('/')) {
        productUrl = window.location.origin + productUrl;
      }
    }
    
    // Extract title - Macrocenter has fe-product-name > h1 > a
    let title = '';
    
    // 1. Try fe-product-name > h1 > a (most reliable)
    const titleEl = container.querySelector('fe-product-name h1 a');
    if (titleEl) {
      const candidate = titleEl.innerText.trim();
      if (candidate && candidate.length >= 3 && candidate.length < 200) {
        title = candidate;
        
      }
    }
    
    // 2. Try image alt (usually product-specific)
    if (!title || title.length < 3) {
      const img = container.querySelector('img.product-image');
      if (img && img.alt) {
        const altText = img.alt.trim();
        if (altText && altText.length >= 3 && altText.length < 200) {
          title = altText;
          
        }
      }
    }
    
    // 3. Try URL slug as fallback
    if (!title && productUrl) {
      const urlTitle = this.extractTitleFromUrl(productUrl);
      if (urlTitle && urlTitle.length > 5) {
        title = urlTitle;
        
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

    // Find prices - Macrocenter has fe-product-price > .price > span
    let priceMatch = null;
    
    // Try fe-product-price > .price > span (main price)
    const priceEl = container.querySelector('fe-product-price .price span');
    if (priceEl) {
      const priceText = priceEl.innerText || priceEl.textContent || '';
      priceMatch = this.findPrice(priceText);
      if (priceMatch) {
        
      }
    }
    
    // Fallback: try .sale-price (discounted price with Money)
    if (!priceMatch) {
      const salePriceEl = container.querySelector('.sale-price');
      if (salePriceEl) {
        const priceText = salePriceEl.innerText || salePriceEl.textContent || '';
        priceMatch = this.findPrice(priceText);
        if (priceMatch) {
          
        }
      }
    }
    
    // Fallback: search in container text
    if (!priceMatch) {
      const text = container.innerText || container.textContent || '';
      priceMatch = this.findPrice(text);
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

    // Find image - Macrocenter has fe-product-image > a > img.product-image
    let imgSrc = null;
    const img = container.querySelector('img.product-image');
    if (img) {
      imgSrc = img.src || 
               img.getAttribute('data-src') || 
               img.getAttribute('data-lazy-src') || 
               img.getAttribute('data-original');
    }
    
    // Fallback: find any img in fe-product-image
    if (!imgSrc) {
      const productImageEl = container.querySelector('fe-product-image img');
      if (productImageEl) {
        imgSrc = productImageEl.src || 
                 productImageEl.getAttribute('data-src') || 
                 productImageEl.getAttribute('data-lazy-src') || 
                 productImageEl.getAttribute('data-original');
      }
    }
    
    // Final fallback: use findImage method
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

// Make MacrocenterParser available globally
window.MacrocenterParser = MacrocenterParser;

