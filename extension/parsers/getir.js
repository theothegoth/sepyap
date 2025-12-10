// Getir-specific parser
class GetirParser extends BaseParser {
  constructor() {
    super();
    this.marketName = 'Getir';
  }

  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // Getir product detail pages: /urun/category/product-name
    // Must have at least 3 path segments (urun/category/product)
    if (pathname.includes('/urun/') && pathname.split('/').filter(p => p).length >= 3) {
      // Additional check: ensure it's not just /urun/ (category listing)
      const pathParts = pathname.split('/').filter(p => p);
      if (pathParts.length >= 3 && pathParts[0] === 'urun') {
        return 'product-detail';
      }
    }
    
    if (pathname.includes('/arama') || url.includes('?q=')) {
      return 'search-results';
    } else if (pathname.includes('/kategori/')) {
      return 'category';
    } else if (pathname === '/' || pathname === '/anasayfa' || pathname === '') {
      return 'homepage';
    }
    return 'unknown';
  }

  getProductCards() {
    const pageType = this.detectPageType();
    
    
    // Getir uses product links with /urun/ in the URL
    const selectors = [
      '[data-testid="product-card"]',
      '[data-testid*="product"]',
      'a[href*="/urun/"]',
      'a[href*="/product/"]',
      '.product-item',
      '[class*="ProductCard"]',
      '[class*="product-card"]'
    ];

    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) {
        
        return Array.from(nodes);
      }
    }

    // Fallback: all product links
    const links = document.querySelectorAll('a[href*="/urun/"]');
    
    return Array.from(links);
  }

  extractProductData(card) {
    let container = card;
    
    // If card is a link, find its closest product container
    // Look for common product container patterns first
    if (card.tagName === 'A' || card.tagName === 'a') {
      // First, try to find a known product container class/attribute
      let closestContainer = card.closest('[data-testid*="product"], [class*="product"], [class*="Product"], [class*="item"], [class*="card"]');
      
      if (closestContainer) {
        // Make sure it's a reasonable size (not the whole page)
        if (closestContainer.offsetWidth > 30 && closestContainer.offsetWidth < 800 && 
            closestContainer.offsetHeight > 30 && closestContainer.offsetHeight < 1200) {
          container = closestContainer;
          
        }
      }
      
      // If no good container found, search up the DOM tree more carefully
      if (container === card) {
        let parent = card.parentElement;
        let depth = 0;
        let bestContainer = null;
        let bestScore = 0;
        
        while (parent && depth < 5) { // Reduced depth to avoid going too far up
          const width = parent.offsetWidth;
          const height = parent.offsetHeight;
          
          // Score containers: prefer ones that are product-card sized
          // and contain only one product link (to avoid picking up containers with multiple products)
          const linkCount = parent.querySelectorAll('a[href*="/urun/"]').length;
          const score = (width > 30 && width < 600 && height > 30 && height < 800) ? 
                       (linkCount === 1 ? 10 : 5) : 0; // Prefer containers with single link
          
          if (score > bestScore) {
            bestScore = score;
            bestContainer = parent;
          }
          
          parent = parent.parentElement;
          depth++;
        }
        
        if (bestContainer && bestScore > 0) {
          container = bestContainer;
          
        } else if (card.parentElement) {
          container = card.parentElement;
          
        }
      }
    }

    // More lenient size filter - allow links with small dimensions
    const isLink = card.tagName === 'A' || card.tagName === 'a';
    if (!isLink) {
      // For non-links, apply stricter size filter
      if (container.offsetWidth > 1000 || container.offsetHeight > 1200 ||
          container.offsetWidth < 20 || container.offsetHeight < 20) {
        return null;
      }
    }
    // For links, skip size check (they might be 0x0 but still valid)

    // Get text from container and also check siblings/parents for price
    let text = container.innerText || container.textContent || '';
    
    // If container text is empty, try parent immediately
    if (!text || text.trim().length === 0) {
      
      if (container.parentElement) {
        container = container.parentElement;
        text = container.innerText || container.textContent || '';
        
      }
    }
    
    // Getir has two price spans: original (first, usually crossed out) and discounted (second, actual price)
    // We need to find both and use the discounted price as the actual price
    // IMPORTANT: Filter out per-unit prices (like "106,65 TL/kg") - we only want the actual product price
    let originalPriceMatch = null;
    let discountedPriceMatch = null;
    
    // Helper function to check if a price text contains per-unit info (should be filtered out)
    const isPerUnitPrice = (priceText) => {
      if (!priceText) return false;
      const lowerText = priceText.toLowerCase();
      // Check if it contains per-unit indicators
      return /\/kg|\/g|\/l|\/ml|\/adet|per\s*kg|per\s*g|per\s*l|per\s*ml/i.test(lowerText) ||
             /\(.*\d+.*tl.*\/.*kg.*\)/i.test(priceText) || // Matches "(106,65 TL/kg)"
             /\(.*\d+.*tl.*\/.*g.*\)/i.test(priceText) ||   // Matches "(106,65 TL/g)"
             /kg.*\d+.*tl|g.*\d+.*tl/i.test(lowerText);     // Matches "kg 106,65 TL" or "g 106,65 TL"
    };
    
    // Helper function to check if a price value appears to be a per-kg price
    // Per-kg prices are usually higher than the actual product price for small packages
    // But we can't rely on this alone - we need context
    const getPriceContext = (priceValue, fullText) => {
      const priceIndex = fullText.indexOf(priceValue);
      if (priceIndex < 0) return null;
      
      // Get wider context (50 chars before and after)
      const contextStart = Math.max(0, priceIndex - 50);
      const contextEnd = Math.min(fullText.length, priceIndex + priceValue.length + 50);
      return fullText.substring(contextStart, contextEnd);
    };
    
    // Helper to check if an element has strikethrough (line-through) styling
    const hasStrikethrough = (element) => {
      const style = window.getComputedStyle(element);
      return style.textDecoration.includes('line-through') || 
             style.textDecorationLine === 'line-through' ||
             element.style.textDecoration === 'line-through' ||
             element.style.textDecorationLine === 'line-through' ||
             element.classList.toString().toLowerCase().includes('line-through') ||
             element.classList.toString().toLowerCase().includes('strikethrough') ||
             element.classList.toString().toLowerCase().includes('crossed');
    };
    
    // Helper to check if text is inside parentheses in the DOM
    const isInParentheses = (element, fullText) => {
      const elementText = element.innerText || element.textContent || '';
      const index = fullText.indexOf(elementText);
      if (index < 0) return false;
      
      // Check 10 chars before and after
      const before = fullText.substring(Math.max(0, index - 10), index);
      const after = fullText.substring(index + elementText.length, Math.min(fullText.length, index + elementText.length + 10));
      
      // Check if it's in parentheses
      if (before.includes('(') && after.includes(')')) {
        return true;
      }
      
      // Also check parent element's text for parentheses
      if (element.parentElement) {
        const parentText = element.parentElement.innerText || element.parentElement.textContent || '';
        const parentIndex = parentText.indexOf(elementText);
        if (parentIndex >= 0) {
          const parentBefore = parentText.substring(Math.max(0, parentIndex - 10), parentIndex);
          const parentAfter = parentText.substring(parentIndex + elementText.length, Math.min(parentText.length, parentIndex + elementText.length + 10));
          if (parentBefore.includes('(') && parentAfter.includes(')')) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    // Look for price spans with data-testid="text" - Getir uses these for prices
    // The structure is: <span>462,00 TL</span><span>392,99 TL</span>
    // First span is original (strikethrough), second is discounted (actual listing price)
    const priceSpans = container.querySelectorAll('span[data-testid="text"]');
    const priceTexts = [];
    
    
    
    for (const span of priceSpans) {
      const spanText = span.innerText || span.textContent || '';
      
      // Skip if strikethrough (original/crossed-out price)
      if (hasStrikethrough(span)) {
        
        continue;
      }
      
      // Skip if in parentheses (usually per-kg or additional info)
      if (isInParentheses(span, text)) {
        
        continue;
      }
      
      // Check the parent context too - sometimes "/kg" is in a sibling element
      const parentContext = span.parentElement ? (span.parentElement.innerText || span.parentElement.textContent || '') : '';
      const fullContext = spanText + ' ' + parentContext;
      
      // Skip per-unit prices
      if (isPerUnitPrice(spanText) || isPerUnitPrice(fullContext)) {
        
        continue;
      }
      
      const price = this.findPrice(spanText);
      if (price) {
        priceTexts.push({ price, text: spanText, isStrikethrough: false, isInParens: false });
        
      }
    }
    
    if (priceTexts.length >= 2) {
      // If we have 2 prices, prefer the one that's NOT strikethrough
      // Usually the first is original (strikethrough), second is discounted (actual listing price)
      // But we've already filtered out strikethrough, so both should be valid
      // Use the second one as it's typically the discounted/actual price
      originalPriceMatch = priceTexts[0].price;
      discountedPriceMatch = priceTexts[1].price;
      
    } else if (priceTexts.length === 1) {
      // Only one price found (should be the listing price, not strikethrough)
      discountedPriceMatch = priceTexts[0].price;
      
    } else {
      // Fallback: search in text content for all prices, but filter out per-unit prices
      
      const allPrices = this.findAllPrices(text);
      
      // First, explicitly find and exclude per-kg prices from the text
      // Pattern 1: "165,00 TL/kg" or "165,00 TL / kg"
      const perKgPricePattern1 = /(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\s*TL\s*\/\s*kg/gi;
      // Pattern 2: "(165,00 TL/kg)" - prices in parentheses with /kg
      const perKgPricePattern2 = /\([^)]*(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\s*TL\s*\/\s*kg[^)]*\)/gi;
      // Pattern 3: Any price followed by "/kg" within 10 characters
      const perKgPricePattern3 = /(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\s*TL[^)]{0,10}\/kg/gi;
      
      const perKgMatches = [];
      let match;
      
      // Find all per-kg price patterns
      while ((match = perKgPricePattern1.exec(text)) !== null) {
        perKgMatches.push(match[1]);
      }
      while ((match = perKgPricePattern2.exec(text)) !== null) {
        perKgMatches.push(match[1]);
      }
      while ((match = perKgPricePattern3.exec(text)) !== null) {
        perKgMatches.push(match[1]);
      }
      
      
      
      const priceCandidates = [];
      
      // Collect all prices with their context, excluding per-kg prices
      // NOTE: We don't try to detect strikethrough from text alone - we can only do that from DOM elements
      // Instead, we'll filter by parentheses, per-kg patterns, and prefer lower prices
      for (const price of allPrices) {
        // Skip if this price is a known per-kg price
        if (perKgMatches.includes(price)) {
          
          continue;
        }
        
        const priceIndex = text.indexOf(price);
        
        // Skip if price is in parentheses (user requirement: ignore prices in parentheses)
        if (priceIndex >= 0) {
          const before = text.substring(Math.max(0, priceIndex - 15), priceIndex);
          const after = text.substring(priceIndex + price.length, Math.min(text.length, priceIndex + price.length + 15));
          if ((before.includes('(') && after.includes(')')) || 
              (before.match(/\([^)]*$/) && after.match(/^[^(]*\)/))) {
            
            continue;
          }
        }
        
        const context = getPriceContext(price, text);
        const isPerUnit = context ? isPerUnitPrice(context) : false;
        
        // Also check if price appears near "/kg" text (within 15 chars)
        if (priceIndex >= 0) {
          const nearbyText = text.substring(
            Math.max(0, priceIndex - 15),
            Math.min(text.length, priceIndex + price.length + 15)
          );
          if (/\/kg|\/g|per\s*kg|per\s*g/i.test(nearbyText)) {
            
            continue;
          }
        }
        
        if (!isPerUnit) {
          priceCandidates.push({ price, context, isPerUnit: false });
        } else {
          
        }
      }
      
      // If we have multiple prices, prioritize:
      // 1. Prices that are NOT in parentheses (parentheses often contain per-kg info)
      // 2. Prices that appear earlier in the text (usually the main price)
      // 3. Lower prices (actual product price is usually lower than per-kg)
      if (priceCandidates.length > 0) {
        // FIRST: Filter out ALL prices in parentheses (user requirement: ignore prices in parentheses)
        const notInParens = priceCandidates.filter(p => {
          const pos = text.indexOf(p.price);
          if (pos < 0) return false;
          const before = text.substring(Math.max(0, pos - 15), pos);
          const after = text.substring(pos + p.price.length, Math.min(text.length, pos + p.price.length + 15));
          const inParens = (before.includes('(') && after.includes(')')) || 
                          (before.match(/\([^)]*$/) && after.match(/^[^(]*\)/));
          if (inParens) {
            
          }
          return !inParens;
        });
        
        // If no prices left after filtering parentheses, we have no choice but to use what we have
        let finalCandidates = notInParens.length > 0 ? notInParens : priceCandidates;
        
        // Sort by position in text (earlier = better)
        finalCandidates.sort((a, b) => {
          const posA = text.indexOf(a.price);
          const posB = text.indexOf(b.price);
          return posA - posB;
        });
        
        // If we still have multiple candidates, prioritize:
        // 1. Lower prices (listing price is usually lower than per-kg price for small packages)
        // 2. Prices that appear earlier in text
        if (finalCandidates.length > 1) {
          finalCandidates.sort((a, b) => {
            const priceA = this.parseCurrency(a.price);
            const priceB = this.parseCurrency(b.price);
            // ALWAYS prefer lower prices first (listing price is usually lower than per-kg)
            // For example: 79,99 TL (listing) vs 106,65 TL/kg (per-kg)
            if (Math.abs(priceA - priceB) > 1) { // If difference is significant (>1 TL)
              return priceA - priceB; // Lower price first (this is usually the listing price)
            }
            // If prices are very close, prefer earlier in text
            const posA = text.indexOf(a.price);
            const posB = text.indexOf(b.price);
            return posA - posB;
          });
          
        }
        
        if (finalCandidates.length >= 2) {
          originalPriceMatch = finalCandidates[0].price;
          discountedPriceMatch = finalCandidates[1].price;
          
        } else if (finalCandidates.length === 1) {
          discountedPriceMatch = finalCandidates[0].price;
          
        }
      }
    }
    
    // If no price in container, try parent (for links)
    if (!discountedPriceMatch && (card.tagName === 'A' || card.tagName === 'a')) {
      if (container.parentElement) {
        const parentText = container.parentElement.innerText || container.parentElement.textContent || '';
        const parentPrices = this.findAllPrices(parentText);
        
        // First, explicitly find and exclude per-kg prices from parent text
        const parentPerKgPattern1 = /(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\s*TL\s*\/\s*kg/gi;
        const parentPerKgPattern2 = /\([^)]*(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\s*TL\s*\/\s*kg[^)]*\)/gi;
        const parentPerKgPattern3 = /(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\s*TL[^)]{0,10}\/kg/gi;
        
        const parentPerKgMatches = [];
        let parentMatch;
        while ((parentMatch = parentPerKgPattern1.exec(parentText)) !== null) {
          parentPerKgMatches.push(parentMatch[1]);
        }
        while ((parentMatch = parentPerKgPattern2.exec(parentText)) !== null) {
          parentPerKgMatches.push(parentMatch[1]);
        }
        while ((parentMatch = parentPerKgPattern3.exec(parentText)) !== null) {
          parentPerKgMatches.push(parentMatch[1]);
        }
        if (parentPerKgMatches.length > 0) {
          
        }
        
        // Filter out per-unit prices with better context checking
        // NOTE: We don't try to detect strikethrough from text alone - we can only do that from DOM elements
        const parentCandidates = [];
        for (const price of parentPrices) {
          // Skip if this price is a known per-kg price
          if (parentPerKgMatches.includes(price)) {
            
            continue;
          }
          
          const priceIndex = parentText.indexOf(price);
          
          // Skip if price is in parentheses (user requirement: ignore prices in parentheses)
          if (priceIndex >= 0) {
            const before = parentText.substring(Math.max(0, priceIndex - 15), priceIndex);
            const after = parentText.substring(priceIndex + price.length, Math.min(parentText.length, priceIndex + price.length + 15));
            if ((before.includes('(') && after.includes(')')) || 
                (before.match(/\([^)]*$/) && after.match(/^[^(]*\)/))) {
              
              continue;
            }
          }
          
          // Check if price appears near "/kg" text
          if (priceIndex >= 0) {
            const nearbyText = parentText.substring(
              Math.max(0, priceIndex - 15),
              Math.min(parentText.length, priceIndex + price.length + 15)
            );
            if (/\/kg|\/g|per\s*kg|per\s*g/i.test(nearbyText)) {
              
              continue;
            }
          }
          
          const context = getPriceContext(price, parentText);
          const isPerUnit = context ? isPerUnitPrice(context) : false;
          
          if (!isPerUnit) {
            parentCandidates.push({ price, context, isPerUnit: false });
          } else {
            
          }
        }
        
        // Sort by position and filter out parentheses prices
        if (parentCandidates.length > 0) {
          // Filter out ALL prices in parentheses first (user requirement: ignore prices in parentheses)
          const notInParens = parentCandidates.filter(p => {
            const pos = parentText.indexOf(p.price);
            if (pos < 0) return false;
            const before = parentText.substring(Math.max(0, pos - 15), pos);
            const after = parentText.substring(pos + p.price.length, Math.min(parentText.length, pos + p.price.length + 15));
            const inParens = (before.includes('(') && after.includes(')')) || 
                            (before.match(/\([^)]*$/) && after.match(/^[^(]*\)/));
            if (inParens) {
              
            }
            return !inParens;
          });
          
          let finalParentCandidates = notInParens.length > 0 ? notInParens : parentCandidates;
          
          // Sort by position in text (earlier = better)
          finalParentCandidates.sort((a, b) => {
            const posA = parentText.indexOf(a.price);
            const posB = parentText.indexOf(b.price);
            return posA - posB;
          });
          
          // Prioritize lower prices (listing price is usually lower than per-kg price)
          if (finalParentCandidates.length > 1) {
            finalParentCandidates.sort((a, b) => {
              const priceA = this.parseCurrency(a.price);
              const priceB = this.parseCurrency(b.price);
              // ALWAYS prefer lower prices first (listing price is usually lower than per-kg)
              if (Math.abs(priceA - priceB) > 1) { // If difference is significant (>1 TL)
                return priceA - priceB; // Lower price first
              }
              // If prices are very close, prefer earlier in text
              const posA = parentText.indexOf(a.price);
              const posB = parentText.indexOf(b.price);
              return posA - posB;
            });
            
          }
          
          if (finalParentCandidates.length >= 2) {
            originalPriceMatch = finalParentCandidates[0].price;
            discountedPriceMatch = finalParentCandidates[1].price;
          } else if (finalParentCandidates.length === 1) {
            discountedPriceMatch = finalParentCandidates[0].price;
          }
        }
        if (discountedPriceMatch) {
          container = container.parentElement;
          text = parentText;
        }
      }
    }
    
    // Use discounted price if available, otherwise use any price found
    const priceMatch = discountedPriceMatch || originalPriceMatch;
    
    if (!priceMatch) {
      return null; // No price found
    }

    // Find image - prioritize images within the product card, not shared/parent images
    let imgSrc = null;
    let imgElement = null;
    
    // First, try to find image within the card itself (most reliable)
    const { img: cardImg, src: cardSrc } = this.findImage(card);
    if (cardSrc) {
      imgSrc = cardSrc;
      imgElement = cardImg;
      
    } else {
      // Then try container
      const { img: containerImg, src: containerSrc } = this.findImage(container);
      if (containerSrc) {
        imgSrc = containerSrc;
        imgElement = containerImg;
        
      } else {
        // Last resort: try immediate parent (but be careful - might be shared)
        if (container.parentElement) {
          const { img: parentImg, src: parentSrc } = this.findImage(container.parentElement);
          if (parentSrc) {
            // Only use parent image if container is small (likely a product card)
            // Large containers might have shared images from other products
            if (container.offsetWidth < 600 && container.offsetHeight < 800) {
              imgSrc = parentSrc;
              imgElement = parentImg;
              
            } else {
              
            }
          }
        }
      }
    }
    
    const finalImageUrl = imgSrc || 'https://via.placeholder.com/200x200?text=No+Image';

    // Get product URL - prioritize the card's own href if it's a link
    let productUrl = null;
    
    // If card is a link, use its href (most reliable)
    if (card.tagName === 'A' || card.tagName === 'a') {
      productUrl = card.href || card.getAttribute('href');
      if (productUrl && productUrl.startsWith('/')) {
        productUrl = window.location.origin + productUrl;
      }
      // Only use if it's actually a product URL
      if (productUrl && !productUrl.includes('/urun/') && !productUrl.includes('/product/') && !productUrl.includes('/p/')) {
        
        productUrl = null; // Don't use non-product URLs
      }
      if (productUrl) {
        
      }
    }
    
    // If we don't have a product URL yet, search within the container
    if (!productUrl) {
      // Find ALL product links in the container and use the one closest to the card
      const productLinks = container.querySelectorAll('a[href*="/urun/"], a[href*="/product/"], a[href*="/p/"]');
      if (productLinks.length > 0) {
        // If card is a link, prefer links that match the card
        if (card.tagName === 'A' || card.tagName === 'a') {
          for (const link of productLinks) {
            if (link.href === card.href || link === card) {
              productUrl = link.href;
              break;
            }
          }
        }
        // If no match, use the first product link
        if (!productUrl && productLinks[0]) {
          productUrl = productLinks[0].href || productLinks[0].getAttribute('href');
          if (productUrl && productUrl.startsWith('/')) {
            productUrl = window.location.origin + productUrl;
          }
        }
        if (productUrl) {
          
        }
      }
    }
    
    // Fallback: if still no product URL, use the current page URL (but log a warning)
    if (!productUrl) {
      productUrl = window.location.href;
      
      
    } else if (!productUrl.includes('/urun/') && !productUrl.includes('/product/') && !productUrl.includes('/p/')) {
      
      
    }

    // Extract title - prioritize DOM text sources that preserve Turkish characters
    // URL slug is LAST RESORT (loses Turkish characters like ü->u, ş->s, ı->i)
    let title = '';
    
    // 1. FIRST: Try image alt (usually has correct Turkish characters and is product-specific)
    // BUT: Only use if the image is actually within the product card (not a shared/parent image)
    if (!title && imgElement && imgElement.alt && imgElement.alt.trim().length > 3) {
      const altText = imgElement.alt.trim();
      
      
      // Check if the image is actually within the product card container
      // If image is in a parent container but not in the current card, it might be from another product
      const imageInCard = card.contains(imgElement);
      const imageInContainer = container.contains(imgElement);
      const imageInParent = container.parentElement && container.parentElement.contains(imgElement) && !imageInContainer;
      
      // Only use image alt if image is in card or container (not in parent, which might be shared)
      const shouldUseImageAlt = imageInCard || imageInContainer;
      
      if (shouldUseImageAlt) {
        // Filter out generic category names that might appear in alt text
        // Also filter out weight/unit info
        const cleanAlt = altText.replace(/\s+\d+\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr|Adet|adet)\s*$/i, '').trim();
        if (cleanAlt.length > 3 && !cleanAlt.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i)) {
          title = cleanAlt;
          
        }
      } else {
        
        
      }
    }

    // 2. Try data attributes (preserves Turkish characters, usually product-specific)
    if (!title) {
      // Try more selectors to find product name
      const selectors = [
        '[data-testid*="name"]', 
        '[data-testid*="title"]',
        '[data-testid*="product-name"]',
        '[data-testid*="productName"]',
        'h1', 'h2', 'h3', // Headings often contain product names
        '[class*="name"]',
        '[class*="title"]',
        '[class*="product-name"]',
        '[class*="productName"]'
      ];
      for (const sel of selectors) {
        const el = container.querySelector(sel);
        if (el) {
          const t = el.innerText.trim();
          
          // Filter out prices, generic category names, quantity/unit, and other non-title text
          if (t.length > 2 && t.length < 200 && 
              !t.match(/TL|₺/i) && 
              !t.match(/^\d+([,.]\d+)?\s*(TL|₺)?$/) &&
              !t.match(/Sepete|Ekle|Add|Fiyat|Kargo/i) &&
              !t.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i) &&
              !t.match(/^\d+\s*(Adet|adet|kg|g|ml|L|litre|gram|Gr|GR)$/i) && // Filter out "1 Adet", "500 g", etc.
              !t.match(/\d+\s*(kg|g|ml|L|litre|gram|Gr|GR)\s*$/i)) { // Filter out weight at end: "İncir 500 g"
            title = t;
            
            break;
          }
        }
      }
    }

    // 3. Try link text (if card is a link, its text preserves Turkish characters)
    if (!title && (card.tagName === 'A' || card.tagName === 'a')) {
      const linkText = card.innerText.trim();
      const lines = linkText.split('\n').map(l => l.trim()).filter(l => 
        l.length > 5 && l.length < 200 &&
        !l.match(/TL|₺/i) && 
        !l.match(/Sepete|Ekle|Add|Fiyat|Kargo/i) &&
        !/^\d+([,.]\d+)?\s*(TL|₺)?$/.test(l) &&
        !l.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i) && // Filter out generic category names
        !l.match(/^\d+\s*(Adet|adet|kg|g|ml|L|litre|gram|Gr|GR)$/i) && // Filter out quantity/unit: "1 Adet", "500 g", etc.
        !l.match(/\d+\s*(kg|g|ml|L|litre|gram|Gr|GR)\s*$/i) && // Filter out weight at end: "İncir 500 g", "Product 1 kg"
        !l.match(/^\d+\s*x\s*\d+/i) // Filter out "4 x 93 g" type text
      );
      if (lines.length > 0) {
        // Filter out quantity/unit lines first
        const validLines = lines.filter(l => 
          !l.match(/^\d+\s*(Adet|adet|kg|g|ml|L|litre|gram|Gr|GR)$/i) &&
          !l.match(/\d+\s*(kg|g|ml|L|litre|gram|Gr|GR)\s*$/i) && // Filter out weight at end
          !l.match(/^\d+\s*x\s*\d+/i) // Also filter "4 x 93 g"
        );
        
        // Prefer lines that don't start with numbers (product names vs quantities)
        const productNameLines = validLines.length > 0 
          ? validLines.filter(l => !/^\d/.test(l)) // Lines that don't start with a digit
          : [];
        
        // Choose candidate: prefer product name lines, then valid lines, then any line
        let candidate;
        if (productNameLines.length > 0) {
          candidate = productNameLines.reduce((a, b) => a.length > b.length ? a : b);
        } else if (validLines.length > 0) {
          candidate = validLines.reduce((a, b) => a.length > b.length ? a : b);
        } else {
          candidate = lines.reduce((a, b) => a.length > b.length ? a : b);
        }
        
        if (candidate && !candidate.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i)) {
          title = candidate;
          
        }
      }
    }

    // 4. Try container text (preserves Turkish characters, but be restrictive to avoid category headers)
    // Try even if container is larger - we'll filter carefully
    if (!title) {
      const containerText = container.innerText || container.textContent || '';
      
      const lines = containerText.split('\n').map(l => l.trim()).filter(l => 
        l.length > 2 && l.length < 200 && // Reduced min length from 5 to 2 to catch short names like "İncir"
        !l.match(/TL|₺/i) && 
        !l.match(/Sepete|Ekle|Add|Fiyat|Kargo|Ürün|Kategori/i) &&
        !/^\d+([,.]\d+)?\s*(TL|₺)?$/.test(l) &&
        !l.match(/^\d+\s*x\s*\d+/i) && // Filter out "4 x 93 g" type text
        !l.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i) && // Filter out generic category names
        !l.match(/^\d+\s*(Adet|adet|kg|g|ml|L|litre|gram|Gr|GR)$/i) && // Filter out quantity/unit: "1 Adet", "500 g", etc.
        !l.match(/^\d+\s*(kg|g|ml|L|litre|gram|Gr|GR)\s*$/i) && // Filter out lines that are just weight
        !l.match(/\d+\s*(kg|g|ml|L|litre|gram|Gr|GR)\s*$/i) // Filter out weight at end: "İncir 500 g", "Product 1 kg"
      );
      
      if (lines.length > 0) {
        // Filter out quantity/unit lines first
        const validLines = lines.filter(l => 
          !l.match(/^\d+\s*(Adet|adet|kg|g|ml|L|litre|gram|Gr|GR)$/i) &&
          !l.match(/\d+\s*(kg|g|ml|L|litre|gram|Gr|GR)\s*$/i) && // Filter out weight at end
          !l.match(/^\d+\s*x\s*\d+/i) // Also filter "4 x 93 g"
        );
        
        // Prefer lines that don't start with numbers (product names vs quantities)
        const productNameLines = validLines.length > 0 
          ? validLines.filter(l => !/^\d/.test(l)) // Lines that don't start with a digit
          : [];
        
        // Choose candidate: prefer product name lines, then valid lines, then any line
        let candidate;
        if (productNameLines.length > 0) {
          candidate = productNameLines.reduce((a, b) => a.length > b.length ? a : b);
        } else if (validLines.length > 0) {
          candidate = validLines.reduce((a, b) => a.length > b.length ? a : b);
        } else {
          candidate = lines.reduce((a, b) => a.length > b.length ? a : b);
        }
        
        if (candidate && !candidate.match(/^(Yerli Muz|Patates File|Muz|Patates)$/i)) {
          title = candidate;
          
        }
      }
    }

    // 5. LAST RESORT: Use URL slug ONLY if no DOM text found
    // WARNING: URL slugs lose Turkish characters (ü->u, ş->s, ı->i, ğ->g, ç->c, İ->I)
    // Try to correct common Turkish words
    if (!title && productUrl && productUrl.includes('/urun/')) {
      const urlTitle = this.extractTitleFromUrl(productUrl);
      if (urlTitle && urlTitle.length > 2) {
        // Turkish character correction map for common words
        // Maps ASCII versions (from URL slugs) to correct Turkish characters
        const turkishCorrections = {
          'incir': 'İncir',
          'Incir': 'İncir', // already capitalized but wrong character
          'patlican': 'Patlıcan',
          'Patlican': 'Patlıcan', // already capitalized but wrong character
          'cikolata': 'Çikolata',
          'Cikolata': 'Çikolata',
          'cikolatali': 'Çikolatalı',
          'Cikolatali': 'Çikolatalı',
          'cikolatalı': 'Çikolatalı',
          'cilek': 'Çilek',
          'Cilek': 'Çilek',
          'domates': 'Domates',
          'muz': 'Muz',
          'patates': 'Patates',
          'sogan': 'Soğan',
          'Sogan': 'Soğan',
          'sut': 'Süt',
          'Sut': 'Süt',
          'peynir': 'Peynir',
          'ekmek': 'Ekmek',
          'tavuk': 'Tavuk',
          'et': 'Et',
          'balik': 'Balık',
          'Balik': 'Balık',
          'sebze': 'Sebze',
          'meyve': 'Meyve',
          'biber': 'Biber',
          'salatalik': 'Salatalık',
          'Salatalik': 'Salatalık',
          'havuc': 'Havuç',
          'Havuc': 'Havuç',
          'lahana': 'Lahana',
          'kabak': 'Kabak',
          'bamya': 'Bamya',
          'fasulye': 'Fasulye',
          'bezelye': 'Bezelye',
          'brokoli': 'Brokoli',
          'karnabahar': 'Karnabahar',
          'pancar': 'Pancar',
          'turp': 'Turp',
          'sogan': 'Soğan',
          'Sogan': 'Soğan'
        };
        
        // Try to correct the title - check both exact match and word-by-word
        let correctedTitle = urlTitle;
        const lowerTitle = urlTitle.toLowerCase();
        
        // First try exact match (for single words like "Incir", "Patlican")
        if (turkishCorrections[lowerTitle]) {
          correctedTitle = turkishCorrections[lowerTitle];
          
        } else if (turkishCorrections[urlTitle]) {
          // Try with original capitalization
          correctedTitle = turkishCorrections[urlTitle];
          
        } else {
          // Try word-by-word correction (for multi-word titles like "Patlican Paket")
          const words = urlTitle.split(' ');
          const correctedWords = words.map(word => {
            const lowerWord = word.toLowerCase();
            // Try lowercase first, then original capitalization
            if (turkishCorrections[lowerWord]) {
              return turkishCorrections[lowerWord];
            } else if (turkishCorrections[word]) {
              return turkishCorrections[word];
            }
            return word; // Keep original if no correction found
          });
          correctedTitle = correctedWords.join(' ');
          if (correctedTitle !== urlTitle) {
            
          }
        }
        
        title = correctedTitle;
        
        
      }
    }

    if (!title || title.length >= 200) return null;

    // Extract property (weight/quantity) from container text BEFORE cleaning title
    // Use the base class utility method
    const property = this.extractProperty(container);
    if (property) {
      
    }
    
    // Clean weight/unit information from title (e.g., "İncir 500 g" -> "İncir")
    // Use the base class utility method
    const titleBeforeClean = title;
    title = this.cleanPropertyFromTitle(title);
    
    if (titleBeforeClean !== title) {
      
    }
    
    // Turkish character correction map (apply even to DOM-extracted titles in case DOM has ASCII)
    const turkishCorrections = {
      'incir': 'İncir',
      'Incir': 'İncir',
      'patlican': 'Patlıcan',
      'Patlican': 'Patlıcan',
      'cikolata': 'Çikolata',
      'Cikolata': 'Çikolata',
      'cikolatali': 'Çikolatalı',
      'Cikolatali': 'Çikolatalı',
      'cilek': 'Çilek',
      'Cilek': 'Çilek',
      'sogan': 'Soğan',
      'Sogan': 'Soğan',
      'sut': 'Süt',
      'Sut': 'Süt',
      'balik': 'Balık',
      'Balik': 'Balık',
      'salatalik': 'Salatalık',
      'Salatalik': 'Salatalık',
      'havuc': 'Havuç',
      'Havuc': 'Havuç'
    };
    
    // Apply Turkish character correction if needed (even for DOM-extracted titles)
    const lowerTitle = title.toLowerCase();
    if (turkishCorrections[lowerTitle]) {
      const corrected = turkishCorrections[lowerTitle];
      if (corrected !== title) {
        
        title = corrected;
      }
    } else {
      // Try word-by-word correction for multi-word titles
      const words = title.split(' ');
      const correctedWords = words.map(word => {
        const lowerWord = word.toLowerCase();
        if (turkishCorrections[lowerWord]) {
          return turkishCorrections[lowerWord];
        } else if (turkishCorrections[word]) {
          return turkishCorrections[word];
        }
        return word;
      });
      const correctedTitle = correctedWords.join(' ');
      if (correctedTitle !== title) {
        
        title = correctedTitle;
      }
    }
    
    // Log final title with character codes to debug encoding issues
    
    // Turkish İ (capital I with dot) = char code 304 (0x130)
    // Regular I (capital i without dot) = char code 73 (0x49)
    // Turkish ı (lowercase dotless i) = char code 305 (0x131)
    // Regular i (lowercase i with dot) = char code 105 (0x69)
    if ((title.includes('Incir') && !title.includes('İncir')) || 
        (title.includes('Patlican') && !title.includes('Patlıcan'))) {
      
    }
    
    // If title became empty or too short after cleaning, skip
    if (!title || title.length < 2) {
      
      return null;
    }

    // Ensure we have a valid price
    const parsedPrice = this.parseCurrency(priceMatch);
    if (!parsedPrice || parsedPrice <= 0) {
      return null;
    }

    return {
      title: title,
      price: parsedPrice,
      image_url: finalImageUrl,
      product_url: productUrl,
      market: this.marketName,
      currency: 'TRY',
      property: property, // Weight, quantity, or other property info (e.g., "500 g", "1 kg", "1 Adet")
      scanned_at: new Date().toISOString()
    };
  }
}

// Make GetirParser available globally
window.GetirParser = GetirParser;

