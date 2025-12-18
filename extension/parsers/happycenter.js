// Happy Center-specific parser
class HappyCenterParser extends BaseParser {
  constructor() {
    super();
    this.marketName = 'Happy Center'; // Match migration seed data
  }

  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // Happy Center product detail pages: /urun/product-name or /product/product-name
    // Must have at least 2 path segments after /urun/ or /product/
    if (pathname.includes('/urun/') || pathname.includes('/product/')) {
      const pathParts = pathname.split('/').filter(p => p);
      // Check if it's a product detail (has product name after /urun/ or /product/)
      if (pathParts.length >= 2) {
        const categoryIndex = pathParts.findIndex(p => p === 'urun' || p === 'product');
        if (categoryIndex >= 0 && pathParts.length > categoryIndex + 1) {
          return 'product-detail';
        }
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
    
    
    // Happy Center uses .col-product for product containers
    const selectors = [
      '.col-product',
      '.col-product.col-md-2',
      '.col-product.col-sm-4',
      '.col-product.col-xs-4'
    ];

    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) {
        
        return Array.from(nodes);
      }
    }

    // Fallback: product links (Happy Center URLs are like /Product_Name_Format)
    const links = document.querySelectorAll('a[href^="/"]:not([href="/"]):not([href^="/Account"]):not([href^="/kurumsal"]):not([href^="/Gıda"]):not([href^="/Taze"]):not([href^="/Shop"]):not([href^="/Product/Search"])');
    
    return Array.from(links);
  }

  extractProductData(card) {
    // Happy Center structure:
    // .col-product > a > img.img-product (image)
    // .col-product > p > a (title link)
    // .col-product > p > span (price)
    
    let container = card;
    
    // If card is a link, find the parent .col-product container
    if (card.tagName === 'A' || card.tagName === 'a') {
      container = card.closest('.col-product') || card.parentElement;
    }
    
    // If container is not .col-product, try to find it
    if (!container || !container.classList.contains('col-product')) {
      container = card.closest('.col-product') || card;
    }
    
    // Find product URL - Happy Center uses URLs like /Nutella_Kr__750_Gr_Kakaolu_Findik_Kremasi
    let productUrl = window.location.href;
    const productLink = container.querySelector('p > a, a[href^="/"]:not([href="/"])');
    if (productLink && productLink.href) {
      productUrl = productLink.href;
      // Convert relative URLs to absolute
      if (productUrl.startsWith('/')) {
        productUrl = window.location.origin + productUrl;
      }
    }
    
    // Extract title - Happy Center has p > a with title text
    let title = '';
    
    // 1. Try p > a (title link)
    const titleLink = container.querySelector('p > a');
    if (titleLink) {
      const candidate = titleLink.innerText.trim();
      if (candidate && candidate.length >= 3 && candidate.length < 200) {
        title = candidate;
        
      }
    }
    
    // 2. Try image alt (usually product-specific)
    if (!title || title.length < 3) {
      const img = container.querySelector('img.img-product');
      if (img && img.alt) {
        const altText = img.alt.trim();
        if (altText && altText.length >= 3 && altText.length < 200) {
          title = altText;
          
        }
      }
    }
    
    // 3. Try URL slug as fallback
    if (!title && productUrl) {
      // Happy Center URLs are like /Nutella_Kr__750_Gr_Kakaolu_Findik_Kremasi
      // Extract from URL path
      try {
        const urlObj = new URL(productUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
          const slug = pathParts[pathParts.length - 1];
          // Replace underscores with spaces and capitalize
          const urlTitle = slug.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
          if (urlTitle && urlTitle.length > 5) {
            title = urlTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
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

    // Find prices - Happy Center has p > span with price text like "302,45 TL"
    let priceMatch = null;
    
    // Try p > span (price span)
    const priceSpan = container.querySelector('p > span');
    if (priceSpan) {
      const priceText = priceSpan.innerText || priceSpan.textContent || '';
      priceMatch = this.findPrice(priceText);
      if (priceMatch) {
        
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

    // Find image - Happy Center has img.img-product inside a tag
    let imgSrc = null;
    const img = container.querySelector('img.img-product');
    if (img) {
      imgSrc = img.src || 
               img.getAttribute('data-src') || 
               img.getAttribute('data-lazy-src') || 
               img.getAttribute('data-original');
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

// Make HappyCenterParser available globally
window.HappyCenterParser = HappyCenterParser;

