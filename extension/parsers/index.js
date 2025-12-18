// Parser registry - maps market names to their parser class names
// We'll look up the actual classes lazily when needed
const parserMap = {
  'Getir': 'GetirParser',
  'Migros': 'MigrosParser',
  'CarrefourSA': 'CarrefourSAParser',
  'Happy Center': 'HappyCenterParser',
  'Macrocenter': 'MacrocenterParser',
  'A101': 'A101Parser',
  'Sok': 'SokParser',
  // Add more markets here as you implement them
};

function getMarketName() {
  const hostname = window.location.hostname;
  if (hostname.includes('migros')) return 'Migros';
  if (hostname.includes('carrefoursa')) return 'CarrefourSA';
  if (hostname.includes('getir')) return 'Getir';
  if (hostname.includes('a101')) return 'A101';
  if (hostname.includes('sokmarket')) return 'Sok';
  if (hostname.includes('happycenter')) return 'HappyCenter';
  if (hostname.includes('macrocenter')) return 'Macrocenter';
  if (hostname.includes('trendyol')) return 'Trendyol';
  if (hostname.includes('yemeksepeti')) return 'Yemeksepeti';
  return 'Unknown';
}

// Make getParser available globally
window.getParser = function() {
  const marketName = getMarketName();
  const parserClassName = parserMap[marketName];
  
  if (!parserClassName) {
    
    
    return null;
  }
  
  // Lazy lookup - get the parser class from window when needed
  const ParserClass = window[parserClassName];
  
  if (!ParserClass) {
    
    
    return null;
  }
  
  try {
    return new ParserClass();
  } catch (error) {
    console.error(`[GroceryMatcher] Error creating parser for ${marketName}:`, error);
    return null;
  }
};

