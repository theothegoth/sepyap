// ŞOK Kapıda-specific parser
class SokParser extends BaseParser {
  constructor() {
    super();
    this.marketName = 'Sok';
  }

  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // ŞOK product detail pages: /product-name-p-{id}
    // Must have -p-{id} pattern to be a product detail page
    if (pathname.includes('-p-')) {
      return 'product-detail';
    } else if (pathname.includes('/arama') || url.includes('?q=') || url.includes('search=')) {
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
    
    
    // ŞOK Kapıda structure:
    // Structure: <a href="/patates-kg-p-35919">
    //   <div class="CProductCard-module_productCardWrapper__okAmT ... PLPProductListing_PLPCard__P7uaA">
    //     <h2 class="CProductCard-module_title__u8bMW">Patates Kg</h2>
    //     <span class="CPriceBox-module_price__bYk-c">13,90₺</span>
    
    const allProducts = new Set();
    
    // Helper function to check if an element looks like a product card
    const isProductCard = (el) => {
      // Must have product link with pattern -p-{id} or product card wrapper
      const hasLink = el.querySelector('a[href*="-p-"]') || (el.tagName === 'A' && el.href.includes('-p-'));
      const hasTitle = el.querySelector('h2.CProductCard-module_title__u8bMW, h2[class*="CProductCard-module_title"]');
      const hasPrice = el.querySelector('span.CPriceBox-module_price__bYk-c, span[class*="CPriceBox-module_price"]');
      return hasLink || hasTitle || hasPrice;
    };
    
    // 1. Product card wrappers (most specific)
    const cardWrappers = document.querySelectorAll('.CProductCard-module_productCardWrapper__okAmT, .PLPProductListing_PLPCard__P7uaA, [class*="CProductCard-module_productCardWrapper"], [class*="PLPProductListing_PLPCard"]');
    if (cardWrappers.length > 0) {
      let validCount = 0;
      cardWrappers.forEach(p => {
        if (isProductCard(p)) {
          allProducts.add(p);
          validCount++;
        }
      });
      
    }
    
    // 2. Product links (ŞOK URLs are like /patates-kg-p-35919)
    // Note: In ŞOK, the link contains the product card wrapper, not the other way around
    const productLinks = document.querySelectorAll('a[href*="-p-"]');
    if (productLinks.length > 0) {
      let validCount = 0;
      productLinks.forEach(link => {
        // Find product card wrapper inside the link
        const wrapper = link.querySelector('.CProductCard-module_productCardWrapper__okAmT') ||
                        link.querySelector('.PLPProductListing_PLPCard__P7uaA') ||
                        link.querySelector('[class*="CProductCard-module_productCardWrapper"]') ||
                        link.querySelector('[class*="PLPProductListing_PLPCard"]') ||
                        link; // Use link itself if no wrapper found
        if (isProductCard(wrapper)) {
          allProducts.add(wrapper);
          validCount++;
        }
      });
      
    }
    
    if (allProducts.size > 0) {
      
      return Array.from(allProducts);
    }

    // Fallback: any product links
    const links = document.querySelectorAll('a[href*="-p-"]');
    
    return Array.from(links);
  }

  extractProductData(card) {
    // ŞOK Kapıda structure:
    // <a href="/patates-kg-p-35919">
    //   <div class="CProductCard-module_productCardWrapper__okAmT ... PLPProductListing_PLPCard__P7uaA">
    //     <h2 class="CProductCard-module_title__u8bMW">Patates Kg</h2>
    //     <span class="CPriceBox-module_price__bYk-c">13,90₺</span>
    
    let container = card;
    
    // If card is a link, find the parent product card wrapper
    if (card.tagName === 'A' || card.tagName === 'a') {
      container = card.querySelector('.CProductCard-module_productCardWrapper__okAmT') ||
                  card.querySelector('.PLPProductListing_PLPCard__P7uaA') ||
                  card.querySelector('[class*="CProductCard-module_productCardWrapper"]') ||
                  card.querySelector('[class*="PLPProductListing_PLPCard"]') ||
                  card.closest('.CProductCard-module_productCardWrapper__okAmT') ||
                  card.closest('.PLPProductListing_PLPCard__P7uaA') ||
                  card.parentElement;
    }
    
    // If container doesn't have product elements, try to find the actual product card
    const hasProductLink = container.querySelector('a[href*="-p-"]') || (card.tagName === 'A' && card.href.includes('-p-'));
    const hasProductTitle = container.querySelector('h2.CProductCard-module_title__u8bMW, h2[class*="CProductCard-module_title"]');
    const hasProductPrice = container.querySelector('span.CPriceBox-module_price__bYk-c, span[class*="CPriceBox-module_price"]');
    
    if (!hasProductLink && !hasProductTitle && !hasProductPrice) {
      // Try to find parent containers
      container = card.closest('.CProductCard-module_productCardWrapper__okAmT') ||
                  card.closest('.PLPProductListing_PLPCard__P7uaA') ||
                  card.closest('[class*="CProductCard-module_productCardWrapper"]') ||
                  card.closest('[class*="PLPProductListing_PLPCard"]') ||
                  card.parentElement ||
                  card;
    }
    
    // Find product URL - ŞOK uses URLs like /patates-kg-p-35919
    let productUrl = window.location.href;
    const productLink = container.querySelector('a[href*="-p-"]') || 
                        (card.tagName === 'A' && card.href.includes('-p-') ? card : null);
    if (productLink && productLink.href) {
      productUrl = productLink.href;
      // Convert relative URLs to absolute
      if (productUrl.startsWith('/')) {
        productUrl = window.location.origin + productUrl;
      }
    }

    // Extract title - ŞOK has h2.CProductCard-module_title__u8bMW
    let title = '';
    
    // 1. Try h2.CProductCard-module_title__u8bMW (most reliable)
    const titleEl = container.querySelector('h2.CProductCard-module_title__u8bMW, h2[class*="CProductCard-module_title"]');
    if (titleEl) {
      const candidate = titleEl.innerText.trim();
      if (candidate && candidate.length >= 3 && candidate.length < 200) {
        title = candidate;
        
      }
    }
    
    // 2. Try image alt
    if (!title || title.length < 3) {
      const img = container.querySelector('img');
      if (img && img.alt) {
        const altText = img.alt.trim();
        if (altText && altText.length >= 3 && altText.length < 200 && altText !== 'product-thumb') {
          title = altText;
          
        }
      }
    }
    
    // 3. Try URL slug as fallback
    if (!title && productUrl && productUrl !== window.location.href) {
      // ŞOK URLs are like /patates-kg-p-35919
      // Extract product name from URL
      try {
        const urlObj = new URL(productUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          // Remove -p-{id} suffix
          const slug = lastPart.replace(/-p-\d+$/, '').replace(/-/g, ' ').trim();
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

    // Find prices - ŞOK has span.CPriceBox-module_price__bYk-c with price like "13,90₺"
    let priceMatch = null;
    
    // Try span.CPriceBox-module_price__bYk-c (price element)
    const priceEl = container.querySelector('span.CPriceBox-module_price__bYk-c, span[class*="CPriceBox-module_price"]');
    if (priceEl) {
      const priceText = priceEl.innerText || priceEl.textContent || '';
      priceMatch = this.findPrice(priceText);
      if (priceMatch) {
        
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

// Make SokParser available globally
window.SokParser = SokParser;

