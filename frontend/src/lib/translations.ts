export type Language = 'tr' | 'en';

export const translations = {
  tr: {
    // Common
    common: {
      loading: 'Yükleniyor...',
      search: 'Ara',
      add: 'Ekle',
      remove: 'Kaldır',
      clear: 'Temizle',
      save: 'Kaydet',
      cancel: 'İptal',
      back: 'Geri',
      next: 'İleri',
      close: 'Kapat',
      yes: 'Evet',
      no: 'Hayır',
      filter: 'Filtrele',
      clearAll: 'Tümünü Temizle',
      required: 'gerekli',
    },
    // Navigation
    nav: {
      home: 'Ana Sayfa',
      search: 'Ürün Ara',
      watchlist: 'İzleme Listesi',
      alerts: 'Uyarılar',
    },
    // Home page
    home: {
      title: 'SepYap 🛒',
      shoppingList: 'Alışveriş Listeniz',
      addProductPlaceholder: 'Ürün Adı (örn. Süt)',
      addProductHint: 'Ürün adıyla ekleyin veya',
      searchProducts: 'ürün ara',
      cartEmpty: 'Sepet boş.',
      findCheapestCart: 'En Ucuz Sepeti Bul ✨',
      calculating: 'Hesaplanıyor...',
      cheapestOption: 'En Ucuz Seçenek',
      productsTotal: 'Ürünler Toplamı:',
      deliveryNote: '+ Kargo (ücretler market ve sipariş tutarına göre değişebilir)',
      buildCart: 'Sepetinizi oluşturun ve optimize edin.',
      filterByBrand: 'Markaya Göre Filtrele',
      includeBrands: 'Dahil Et (sadece bu markalar):',
      excludeBrands: 'Hariç Tut (bu markaları gizle):',
      brandPlaceholder: 'Marka adı',
      recentlyScanned: 'Son Taranan Ürünler (DB Kontrolü)',
      refresh: 'Yenile',
      lastSeen: 'Son Görüldü',
      lastUpdated: 'Son Güncellendi',
      market: 'Market',
      title: 'Başlık',
      property: 'Özellik',
      price: 'Fiyat',
      saveBrandPreferences: 'Marka Tercihlerini Kaydet',
      loadBrandPreferences: 'Marka Tercihlerini Yükle',
      brandPreferences: 'Marka Tercihleri',
      saveCurrent: 'Mevcut Tercihleri Kaydet',
      preferenceName: 'Tercih Adı',
      savedPreferences: 'Kayıtlı Tercihler',
      noSavedPreferences: 'Kayıtlı tercih yok',
      load: 'Yükle',
      delete: 'Sil',
      clear: 'Temizle',
      activePreference: 'Aktif Tercih',
    },
    // Search page
    search: {
      title: 'Ürün Ara',
      subtitle: 'Tüm marketlerde fiyatları karşılaştırın',
      placeholder: 'Ürün ara (örn. Yerli Muz, Süt, Domates)...',
      searching: 'Aranıyor...',
      noResults: '"{query}" için ürün bulunamadı',
      tryDifferent: 'Farklı bir arama terimi deneyin',
      typeToSearch: 'Aramak için en az 2 karakter yazın',
      comparePrices: 'Fiyatları karşılaştır →',
    },
    // Watchlist page
    watchlist: {
      title: 'İzleme Listesi',
      subtitle: 'Fiyat düşüşlerini takip edin',
      empty: 'İzleme listeniz boş.',
      addProduct: 'Ürün eklemek için arama sayfasını kullanın.',
      product: 'Ürün',
      targetPrice: 'Hedef Fiyat',
      targetPercent: 'Hedef Yüzde',
      actions: 'İşlemler',
      remove: 'Kaldır',
      addToWatchlist: 'İzleme Listesine Ekle',
      setTargetPrice: 'Hedef Fiyat Belirle',
      setTargetPercent: 'Hedef Yüzde Belirle',
      defaultAlert: 'Herhangi bir %5+ fiyat düşüşünde uyar',
      alertWhenPriceDropsBelow: 'Fiyat şu fiyatın altına düştüğünde uyar',
      alertWhenPriceDropsBy: 'Fiyat şu yüzde düştüğünde uyar',
    },
    // Alerts page
    alerts: {
      title: 'Fiyat Düşüş Uyarıları',
      subtitle: 'İzlediğiniz ürünlerdeki fiyat düşüşlerini görün',
      empty: 'Uyarı yok.',
      unread: 'Okunmamış',
      read: 'Okundu',
      dismiss: 'Kapat',
      markRead: 'Okundu İşaretle',
      stats: 'İstatistikler',
      total: 'Toplam',
      unreadCount: 'Okunmamış',
      dismissed: 'Kapatılan',
    },
    // Product detail page
    product: {
      comparePrices: 'Fiyatları Karşılaştır',
      priceHistory: 'Fiyat Geçmişi',
      addToWatchlist: 'İzleme Listesine Ekle',
      market: 'Market',
      price: 'Fiyat',
      cardPrice: 'Kart Fiyatı',
      property: 'Özellik',
      lastSeen: 'Son Görüldü',
      viewProduct: 'Ürüne Git',
      cheapestAt: 'En ucuz',
      for: 'için',
      view: 'Görüntüle',
    },
    // Extension lock
    lock: {
      title: 'Uzantı Gerekli',
      message: 'GroceryMatcher\'ı kullanmak için Chrome uzantısını yüklemeniz gerekiyor.',
      steps: 'Kurulum Adımları:',
      step1: 'Chrome Web Mağazası\'ndan GroceryMatcher uzantısını yükleyin',
      step2: 'Sayfayı yenileyin (F5 veya Ctrl+R)',
      step3: 'Uzantı yüklendikten sonra site otomatik olarak açılacak',
      reload: 'Sayfayı Yenile',
      note: 'Uzantıyı yükledikten sonra bu sayfayı yenileyin',
    },
  },
  en: {
    // Common
    common: {
      loading: 'Loading...',
      search: 'Search',
      add: 'Add',
      remove: 'Remove',
      clear: 'Clear',
      save: 'Save',
      cancel: 'Cancel',
      back: 'Back',
      next: 'Next',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      filter: 'Filter',
      clearAll: 'Clear All',
      required: 'required',
    },
    // Navigation
    nav: {
      home: 'Home',
      search: 'Search Products',
      watchlist: 'Watchlist',
      alerts: 'Alerts',
    },
    // Home page
    home: {
      title: 'GroceryMatcher 🛒',
      shoppingList: 'Your Shopping List',
      addProductPlaceholder: 'Product Name (e.g. Milk)',
      addProductHint: 'Add products by name or',
      searchProducts: 'search for products',
      cartEmpty: 'Cart is empty.',
      findCheapestCart: 'Find Cheapest Cart ✨',
      calculating: 'Calculating...',
      cheapestOption: 'Cheapest Option',
      productsTotal: 'Products Total:',
      deliveryNote: '+ Delivery (fees may vary by market and order value)',
      buildCart: 'Build your cart and click optimize to see results.',
      filterByBrand: 'Filter by Brand',
      includeBrands: 'Include (only these brands):',
      excludeBrands: 'Exclude (hide these brands):',
      brandPlaceholder: 'Brand name',
      recentlyScanned: 'Recently Scanned Products (DB Check)',
      refresh: 'Refresh',
      lastSeen: 'Last Seen',
      lastUpdated: 'Last Updated',
      market: 'Market',
      title: 'Title',
      property: 'Property',
      price: 'Price',
      saveBrandPreferences: 'Save Brand Preferences',
      loadBrandPreferences: 'Load Brand Preferences',
      brandPreferences: 'Brand Preferences',
      saveCurrent: 'Save Current Preferences',
      preferenceName: 'Preference Name',
      savedPreferences: 'Saved Preferences',
      noSavedPreferences: 'No saved preferences',
      load: 'Load',
      delete: 'Delete',
      clear: 'Clear',
      activePreference: 'Active Preference',
    },
    // Search page
    search: {
      title: 'Search Products',
      subtitle: 'Find and compare prices across all markets',
      placeholder: 'Search for products (e.g., Yerli Muz, Süt, Domates)...',
      searching: 'Searching...',
      noResults: 'No products found for "{query}"',
      tryDifferent: 'Try a different search term',
      typeToSearch: 'Type at least 2 characters to search',
      comparePrices: 'Compare prices →',
    },
    // Watchlist page
    watchlist: {
      title: 'Watchlist',
      subtitle: 'Track price drops',
      empty: 'Your watchlist is empty.',
      addProduct: 'Use the search page to add products.',
      product: 'Product',
      targetPrice: 'Target Price',
      targetPercent: 'Target Percent',
      actions: 'Actions',
      remove: 'Remove',
      addToWatchlist: 'Add to Watchlist',
      setTargetPrice: 'Set Target Price',
      setTargetPercent: 'Set Target Percent',
      defaultAlert: 'Alert on any 5%+ price drop',
      alertWhenPriceDropsBelow: 'Alert when price drops below',
      alertWhenPriceDropsBy: 'Alert when price drops by',
    },
    // Alerts page
    alerts: {
      title: 'Price Drop Alerts',
      subtitle: 'See price drops for products you\'re watching',
      empty: 'No alerts.',
      unread: 'Unread',
      read: 'Read',
      dismiss: 'Dismiss',
      markRead: 'Mark as Read',
      stats: 'Statistics',
      total: 'Total',
      unreadCount: 'Unread',
      dismissed: 'Dismissed',
    },
    // Product detail page
    product: {
      comparePrices: 'Compare Prices',
      priceHistory: 'Price History',
      addToWatchlist: 'Add to Watchlist',
      market: 'Market',
      price: 'Price',
      cardPrice: 'Card Price',
      property: 'Property',
      lastSeen: 'Last Seen',
      viewProduct: 'View Product',
      cheapestAt: 'Cheapest at',
      for: 'for',
      view: 'View',
    },
    // Extension lock
    lock: {
      title: 'Extension Required',
      message: 'Please install the Chrome extension to use GroceryMatcher.',
      steps: 'Installation Steps:',
      step1: 'Install the GroceryMatcher extension from Chrome Web Store',
      step2: 'Reload this page (F5 or Ctrl+R)',
      step3: 'The site will unlock automatically after the extension is installed',
      reload: 'Reload Page',
      note: 'After installing the extension, please reload this page',
    },
  },
};

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to English if translation missing
      value = translations.en;
      for (const k2 of keys) {
        value = value?.[k2];
      }
      break;
    }
  }
  
  return value || key;
}

