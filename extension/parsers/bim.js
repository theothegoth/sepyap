// BİM Online-specific parser
class BimParser extends BaseParser {
  constructor() {
    super();
    this.marketName = 'Bim';
  }

  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // BİM product detail pages: /aktuel-urunler/category/product-name/aktuel.aspx
    // Must have /aktuel.aspx at the end to be a product detail page
    if (pathname.includes('/aktuel-urunler/') && pathname.endsWith('/aktuel.aspx')) {
      return 'product-detail';
    } else if (pathname.includes('/aktuel-urunler/')) {
      return 'category';
    } else if (pathname.includes('/arama') || url.includes('?q=') || url.includes('search=')) {
      return 'search-results';
    } else if (pathname === '/' || pathname === '/anasayfa' || pathname === '') {
      return 'homepage';
    }
    return 'unknown';
  }

  getProductCards() {
    const pageType = this.detectPageType();
    
    
    // BİM structure:
    // <div class="row">
    //   <div class="col-6 ... imageArea">...</div>
    //   <div class="col-6 ... descArea">
    //     <h2 class="subTitle">DOST</h2>
    //     <h2 class="title">%0,5 YAĞLI SÜT</h2>
    //     <div class="gramajadet">• 1 L</div>
    //     <div class="priceArea">...</div>
    //   </div>
    // </div>
    
    const allProducts = new Set();
    
    // Helper function to check if an element looks like a product card
    const isProductCard = (el) => {
      // Must have product title or product link
      const hasTitle = el.querySelector('h2.title');
      const hasLink = el.querySelector('a[href*="/aktuel-urunler/"]') || el.querySelector('a[href*="aktuel.aspx"]');
      const hasPrice = el.querySelector('div.text.quantify') || el.querySelector('div.priceArea');
      return hasTitle || (hasLink && hasPrice);
    };
    
    // 1. Product rows (div.row containing product info)
    const productRows = document.querySelectorAll('div.row');
    if (productRows.length > 0) {
      let validCount = 0;
      productRows.forEach(row => {
        // Check if this row contains product elements
        if (isProductCard(row)) {
          allProducts.add(row);
          validCount++;
        }
      });
      
    }
    
    // 2. Product links (BİM URLs are like /aktuel-urunler/-0-5-yagli-sut-24-11/aktuel.aspx)
    const productLinks = document.querySelectorAll('a[href*="/aktuel-urunler/"], a[href*="aktuel.aspx"]');
    if (productLinks.length > 0) {
      let validCount = 0;
      productLinks.forEach(link => {
        // Find parent product row
        const row = link.closest('div.row');
        if (row && isProductCard(row)) {
          allProducts.add(row);
          validCount++;
        }
      });
      
    }
    
    if (allProducts.size > 0) {
      
      return Array.from(allProducts);
    }

    // Fallback: product links
    const links = document.querySelectorAll('a[href*="/aktuel-urunler/"], a[href*="aktuel.aspx"]');
    
    return Array.from(links);
  }

  extractProductData(card) {
    // BİM structure:
    // <div class="row">
    //   <div class="col-6 ... imageArea">
    //     <a href="/aktuel-urunler/-0-5-yagli-sut-24-11/aktuel.aspx">...</a>
    //   </div>
    //   <div class="col-6 ... descArea">
    //     <h2 class="subTitle">DOST</h2>
    //     <h2 class="title">%0,5 YAĞLI SÜT</h2>
    //     <div class="gramajadet">• 1 L</div>
    //     <div class="priceArea">
    //       <div class="text quantify">22,</div>
    //       <div class="kusurArea"><span class="number">50</span></div>
    //       <span class="curr">₺</span>
    //     </div>
    //   </div>
    // </div>
    
    let container = card;
    
    // If card is a link, find the parent product row
    if (card.tagName === 'A' || card.tagName === 'a') {
      container = card.closest('div.row') || card.parentElement;
    }
    
    // If container doesn't have product elements, try to find the actual product row
    const hasProductTitle = container.querySelector('h2.title');
    const hasProductLink = container.querySelector('a[href*="/aktuel-urunler/"]') || container.querySelector('a[href*="aktuel.aspx"]');
    const hasProductPrice = container.querySelector('div.text.quantify') || container.querySelector('div.priceArea');
    
    if (!hasProductTitle && !hasProductLink && !hasProductPrice) {
      // Try to find parent row
      container = card.closest('div.row') || card.parentElement || card;
    }
    
    // Find product URL - BİM uses URLs like /aktuel-urunler/-0-5-yagli-sut-24-11/aktuel.aspx
    let productUrl = window.location.href;
    const productLink = container.querySelector('a[href*="/aktuel-urunler/"]') || 
                        container.querySelector('a[href*="aktuel.aspx"]') ||
                        (card.tagName === 'A' && (card.href.includes('/aktuel-urunler/') || card.href.includes('aktuel.aspx')) ? card : null);
    if (productLink && productLink.href) {
      productUrl = productLink.href;
      // Convert relative URLs to absolute
      if (productUrl.startsWith('/')) {
        productUrl = window.location.origin + productUrl;
      }
    }

    // Extract title - BİM has h2.title (product name) and h2.subTitle (brand)
    let title = '';
    
    // 1. Try h2.title (product name) - combine with brand if available
    const titleEl = container.querySelector('h2.title');
    const brandEl = container.querySelector('h2.subTitle');
    
    if (titleEl) {
      const productName = titleEl.innerText.trim();
      const brand = brandEl ? brandEl.innerText.trim() : '';
      
      // Combine brand and product name if both exist
      if (brand && productName) {
        title = `${brand} ${productName}`.trim();
      } else if (productName) {
        title = productName;
      }
      
      if (title && title.length >= 3 && title.length < 200) {
        
      }
    }
    
    // 2. Try image alt
    if (!title || title.length < 3) {
      const img = container.querySelector('img.img-fluid, img');
      if (img && img.alt) {
        const altText = img.alt.trim();
        if (altText && altText.length >= 3 && altText.length < 200) {
          title = altText;
          
        }
      }
    }
    
    // 3. Try URL slug as fallback
    if (!title && productUrl && productUrl !== window.location.href) {
      // BİM URLs are like /aktuel-urunler/-0-5-yagli-sut-24-11/aktuel.aspx
      // Extract product name from URL
      try {
        const urlObj = new URL(productUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        // Find the part before /aktuel.aspx
        const productPart = pathParts.find(p => p.includes('aktuel.aspx')) ? 
                           pathParts[pathParts.indexOf(pathParts.find(p => p.includes('aktuel.aspx'))) - 1] :
                           pathParts[pathParts.length - 1];
        if (productPart && !productPart.includes('aktuel')) {
          const slug = productPart.replace(/\d+-\d+/g, '').replace(/-/g, ' ').trim();
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

    // Extract property (weight/quantity) - BİM has div.gramajadet (e.g., "• 1 L")
    let property = null;
    
    // 1. Try div.gramajadet (most reliable for BİM)
    const gramajEl = container.querySelector('div.gramajadet');
    if (gramajEl) {
      const gramajText = gramajEl.innerText.trim();
      // Remove bullet point if present
      const cleanedGramaj = gramajText.replace(/^[•\-\*]\s*/, '').trim();
      if (cleanedGramaj) {
        property = cleanedGramaj;
        
      }
    }
    
    // 2. Fallback: extract from title text
    if (!property && title) {
      const tempDiv = document.createElement('div');
      tempDiv.textContent = title;
      property = this.extractProperty(tempDiv);
      if (property) {
        
      }
    }
    
    // 3. Fallback: try container if title extraction failed
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

    // Find prices - BİM has split price: div.text.quantify (e.g., "22,") + div.kusurArea span.number (e.g., "50") + span.curr (e.g., "₺")
    // Combined: "22,50₺"
    let priceMatch = null;
    
    // 1. Try to combine split price elements
    const quantifyEl = container.querySelector('div.text.quantify');
    const kusurEl = container.querySelector('div.kusurArea span.number');
    const currEl = container.querySelector('span.curr');
    
    if (quantifyEl && kusurEl) {
      const quantifyText = quantifyEl.innerText.trim();
      const kusurText = kusurEl.innerText.trim();
      // Combine: "22," + "50" = "22,50"
      const combinedPrice = `${quantifyText}${kusurText}`;
      priceMatch = this.findPrice(combinedPrice);
      if (priceMatch) {
        
      }
    }
    
    // 2. Fallback: try priceArea container
    if (!priceMatch) {
      const priceArea = container.querySelector('div.priceArea');
      if (priceArea) {
        const priceText = priceArea.innerText || priceArea.textContent || '';
        priceMatch = this.findPrice(priceText);
        if (priceMatch) {
          
        }
      }
    }
    
    // 3. Fallback: search in container text (but exclude title text)
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

    // Find image - BİM has img.img-fluid inside div.image
    let imgSrc = null;
    const img = container.querySelector('img.img-fluid, div.image img, img');
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

// Make BimParser available globally
window.BimParser = BimParser;

