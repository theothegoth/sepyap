// Base parser class that all market parsers should extend
class BaseParser {
  constructor() {
    this.marketName = 'Unknown';
  }

  // Override in subclasses
  getProductCards() {
    throw new Error('getProductCards() must be implemented by subclass');
  }

  // Override in subclasses
  extractProductData(card) {
    throw new Error('extractProductData() must be implemented by subclass');
  }

  // Common utility methods
  parseCurrency(priceStr) {
    if (!priceStr) return 0;
    let clean = priceStr.replace(/[^\d,.]/g, '');
    if (clean.includes(',') && clean.lastIndexOf(',') > clean.length - 4) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
    return parseFloat(clean) || 0;
  }

  extractTitleFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      // Getir format: /urun/product-name-123/
      if (pathParts.length >= 2 && pathParts[0] === 'urun') {
        const slug = pathParts[1];
        const namePart = slug.replace(/-[a-z0-9]+$/i, '').replace(/-/g, ' ');
        return namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      
      // Migros/CarrefourSA format: /product-name-p-31a14e or /product-name-p-31a14e/
      if (pathParts.length >= 1) {
        const slug = pathParts[pathParts.length - 1];
        // URLs end with -p-{id}, extract everything before -p-
        if (slug.includes('-p-')) {
          const namePart = slug.split('-p-')[0].replace(/-/g, ' ');
          return namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        // Generic slug format
        const namePart = slug.replace(/-[a-z0-9]+$/i, '').replace(/-/g, ' ');
        if (namePart.length > 3) {
          return namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
    return null;
  }

  findImage(element) {
    // Search for images in various locations
    const searchLocations = [element];
    if (element.parentElement) searchLocations.push(element.parentElement);
    if (element.parentElement?.parentElement) searchLocations.push(element.parentElement.parentElement);

    for (const location of searchLocations) {
      // Try img elements
      const img = location.querySelector('img');
      if (img) {
        const src = img.src || 
                   img.getAttribute('data-src') || 
                   img.getAttribute('data-lazy-src') || 
                   img.getAttribute('data-original');
        if (src && !src.includes('icon') && !src.includes('logo')) {
          return { img, src };
        }
      }

      // Try picture > source
      const picture = location.querySelector('picture');
      if (picture) {
        const source = picture.querySelector('source');
        if (source?.srcset) {
          const match = source.srcset.match(/([^\s,]+)/);
          if (match && !match[1].includes('icon')) {
            return { img: null, src: match[1] };
          }
        }
      }

      // Try background-image
      const style = window.getComputedStyle(location);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
        const match = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (match && match[1] && !match[1].includes('icon') && !match[1].includes('logo')) {
          return { img: null, src: match[1] };
        }
      }
    }

    return { img: null, src: null };
  }

  findPrice(text) {
    const patterns = [
      /(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\s*(?:TL|₺)/i,
      /(?:TL|₺)\s*(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})/i,
      /(\d{1,3}[,.]\d{2})\s*(?:TL|₺)/i,
      /(?:TL|₺)\s*(\d{1,3}[,.]\d{2})/i,
      /(\d+[,.]\d{2})\s*TL/i,
      /(\d+)\s*TL/i,
      /\b(\d{1,3}[,.]\d{2})\b/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[2] || match[0];
      }
    }
    return null;
  }

  // Helper to extract weight and unit from text
  extractWeightAndUnit(text) {
    if (!text) return { weight: null, unit: null };
    
    const patterns = [
      { regex: /(\d+[,.]?\d*)\s*(kg|kilogram)/i, unit: 'kg' },
      { regex: /(\d+[,.]?\d*)\s*(g|gram|gr)\b/i, unit: 'g' },
      { regex: /(\d+[,.]?\d*)\s*(L|l|litre|liter)\b/i, unit: 'L' },
      { regex: /(\d+[,.]?\d*)\s*(ml|mililitre)\b/i, unit: 'ml' },
      { regex: /(\d+)\s*x\s*(\d+)\s*(g|gram|gr|ml)\b/i, unit: null }, // e.g., "4 x 93 g"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        if (match[3] && match[1] && match[2]) {
          // Pattern like "4 x 93 g" - multiply
          const weight = parseFloat(match[1].replace(',', '.')) * parseFloat(match[2].replace(',', '.'));
          return { weight, unit: match[3].toLowerCase() };
        } else if (match[1]) {
          const weight = parseFloat(match[1].replace(',', '.'));
          return { weight, unit: pattern.unit || match[2].toLowerCase() };
        }
      }
    }
    
    return { weight: null, unit: null };
  }

  // Helper to find ALL prices in text (returns array)
  findAllPrices(text) {
    const prices = [];
    const patterns = [
      /(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\s*(?:TL|₺)/gi,
      /(?:TL|₺)\s*(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})/gi,
      /(\d{1,3}[,.]\d{2})\s*(?:TL|₺)/gi,
      /(?:TL|₺)\s*(\d{1,3}[,.]\d{2})/gi,
      /(\d+[,.]\d{2})\s*TL/gi,
      /(\d+)\s*TL/gi,
      /\b(\d{1,3}(?:[.,]\d{3})*[,.]\d{2})\b/g,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const price = match[1] || match[2] || match[0];
        if (price && !prices.includes(price)) {
          prices.push(price);
        }
      }
      if (prices.length > 0) break; // Use first pattern that finds prices
    }
    return prices;
  }

  // Extract property (weight/quantity) from container text
  // Returns property string like "500 g", "1 kg", "2-2,5 kg", "1 Adet", "4 x 93 g"
  // This is a common utility that can be used by all parsers
  extractProperty(container) {
    if (!container) return null;
    
    const containerText = container.innerText || container.textContent || '';
    if (!containerText) return null;
    
    let property = null;
    
    // Priority 1: Match ranges like "2-2,5 kg", "2-2.5 kg", "1-1,5 kg" (check these FIRST)
    const rangePattern = /(\d+[-–—]\d+[,.]?\d*\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr))\s*$/i;
    const rangeMatch = containerText.match(rangePattern);
    if (rangeMatch) {
      property = rangeMatch[1].trim();
      return property;
    }
    
    // Priority 2: Match multi-pack patterns like "4 x 93 g" or "3 x 210 G"
    // Match full pattern: "3 x 210 G" (not just "210 G")
    const multiPackPattern = /(\d+\s*x\s*\d+\s*(g|gram|gr|GR|Gram|Gr|ml|ML))\s*$/i;
    const multiPackMatch = containerText.match(multiPackPattern);
    if (multiPackMatch) {
      property = multiPackMatch[1].trim(); // Use captured group to get full pattern
      return property;
    }
    
    // Priority 3: Match quantity-only patterns like "2 x" (without weight)
    const quantityOnlyPattern = /\d+\s*x\s*$/i;
    const quantityOnlyMatch = containerText.match(quantityOnlyPattern);
    if (quantityOnlyMatch) {
      property = quantityOnlyMatch[0].trim();
      return property;
    }
    
    // Priority 4: Match simple patterns like "500 g", "1 kg", "1 Adet", "700G" (no space)
    const propertyPatterns = [
      // Weight before word: "700 G Cam" -> extract only "700 G" (use capture group 1)
      { pattern: /(\d+[,.]?\d*\s*(?:kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr))\s+[A-Z][a-z]+\s*$/i, useGroup: 1 },
      // Weight at end: "500 g", "1 kg", "2,5 kg" (use full match)
      { pattern: /\d+[,.]?\d*\s*(?:kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr)\s*$/i, useGroup: 0 },
      // Weight in middle, no space: "700G Cam" -> extract only "700G" (use capture group 1)
      { pattern: /(\d+(?:G|g|KG|kg|ML|ml|L))\s+[A-Z]/i, useGroup: 1 },
      // Quantity: "1 Adet" (use full match)
      { pattern: /^\d+\s*(?:Adet|adet)\s*$/i, useGroup: 0 },
      // Any unit (use full match)
      { pattern: /\d+\s*(?:kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr|Adet|adet)\s*$/i, useGroup: 0 },
      // Weight at end, no space: "700G", "560G" (use full match)
      { pattern: /\d+(?:G|g|KG|kg|ML|ml|L)\s*$/i, useGroup: 0 }
    ];
    
    for (const { pattern, useGroup } of propertyPatterns) {
      const match = containerText.match(pattern);
      if (match) {
        // Use specified capture group (0 = full match, 1+ = capture group)
        property = (useGroup === 0 ? match[0] : match[useGroup]).trim();
        return property;
      }
    }
    
    // Also try extracting from lines (weight/quantity often appears on separate lines)
    const lines = containerText.split('\n').map(l => l.trim());
    for (const line of lines) {
      // Check for ranges first
      const lineRangeMatch = line.match(/^(\d+[-–—]\d+[,.]?\d*\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr))$/i);
      if (lineRangeMatch) {
        property = lineRangeMatch[1].trim();
        return property;
      }
      // Then check for multi-pack patterns
      const lineMultiPackMatch = line.match(/^(\d+\s*x\s*\d+\s*(g|gram|gr|GR|Gram|Gr|ml|ML))$/i);
      if (lineMultiPackMatch) {
        property = lineMultiPackMatch[1].trim();
        return property;
      }
      // Then check for quantity-only patterns like "2 x"
      if (line.match(/^\d+\s*x\s*$/i)) {
        property = line;
        return property;
      }
      // Then check for simple patterns
      if (line.match(/^\d+[,.]?\d*\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr|Adet|adet)$/i)) {
        property = line;
        return property;
      }
    }
    
    return null;
  }

  // Clean weight/unit information from title
  // Removes patterns like "500 g", "1 kg", "2-2,5 kg", "4 x 93 g" from title
  cleanPropertyFromTitle(title) {
    if (!title) return title;
    
    const titleBeforeClean = title;
    
    // First remove ranges like "2-2,5 kg" or "2-2.5 kg"
    title = title.replace(/\s+\d+[-–—]\d+[,.]?\d*\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr)\s*$/i, '').trim();
    // Then remove multi-pack patterns like "3 x 210 G" or "4 x 93 g" (with weight, with spaces)
    title = title.replace(/\s+\d+\s*x\s*\d+\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr)\s*$/i, '').trim();
    // Remove multi-pack patterns without spaces like "3x200 G" or "3x200G"
    title = title.replace(/\s+\d+x\d+\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr)\s*$/i, '').trim();
    title = title.replace(/\s+\d+x\d+(kg|g|ml|L|Gram|Gr)\s*$/i, '').trim();
    // Remove multi-pack patterns without weight like "2 x" or "3 x" (just quantity)
    title = title.replace(/\s+\d+\s*x\s*$/i, '').trim();
    // Remove patterns like "700 G Cam" (weight with space before word) - remove "700 G", keep "Cam"
    title = title.replace(/\s+\d+([,.]\d+)?\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr)\s+([A-Z][a-z]+)/i, ' $3').trim();
    // Then remove simple patterns like " 500 g", " 1 kg", " 250ml", etc. from the end (with space)
    title = title.replace(/\s+\d+([,.]\d+)?\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr|Adet|adet)\s*$/i, '').trim();
    // Remove if at start
    title = title.replace(/^\d+([,.]\d+)?\s*(kg|g|ml|L|litre|liter|gram|gr|GR|Gram|Gr|Adet|adet)\s*/i, '').trim();
    // Also remove patterns like " 500G", " 1KG" (no space before unit, with space before number)
    title = title.replace(/\s+\d+(kg|g|ml|L|Gram|Gr)\s*$/i, '').trim();
    // Remove patterns like "700G" (no space, but might have text after like "700G Cam")
    // This handles cases where unit is attached to number but there's more text after
    title = title.replace(/(\d+)(G|g|KG|kg|ML|ml|L)\s+([A-Z][a-z]+)/i, '$3').trim(); // "700G Cam" -> "Cam"
    // But also handle if it's at the end: "700G" -> remove completely
    title = title.replace(/\s+\d+(G|g|KG|kg|ML|ml|L)\s*$/i, '').trim();
    // Also handle patterns in middle without space: "700G" anywhere in title
    title = title.replace(/\s+\d+(G|g|KG|kg|ML|ml|L)(\s|$)/i, '$2').trim();
    
    return title;
  }
}

// Make BaseParser available globally
window.BaseParser = BaseParser;

