'use client';

interface StructuredDataProps {
  type?: 'Organization' | 'WebSite' | 'WebPage' | 'Product' | 'BreadcrumbList';
  data?: any;
}

export default function StructuredData({ type = 'WebSite', data }: StructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  const getStructuredData = () => {
    switch (type) {
      case 'Organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'SepYap',
          url: baseUrl,
          logo: `${baseUrl}/logo.png`,
          description: 'Tüm Türk marketlerinde fiyatları karşılaştırın',
          sameAs: [
            // Add social media links when available
          ],
        };

      case 'WebSite':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'SepYap',
          url: baseUrl,
          description: 'Tüm Türk marketlerinde fiyatları karşılaştırın ve en ucuz alışveriş sepetini bulun',
          inLanguage: 'tr-TR',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${baseUrl}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        };

      case 'WebPage':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          url: data?.url || baseUrl,
          name: data?.name || 'SepYap',
          description: data?.description || 'Fiyatları karşılaştırın',
          inLanguage: 'tr-TR',
        };

      case 'Product':
        return {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data?.name,
          description: data?.description,
          image: data?.image,
          brand: {
            '@type': 'Brand',
            name: data?.brand || 'Unknown',
          },
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'TRY',
            lowPrice: data?.lowPrice,
            highPrice: data?.highPrice,
            offerCount: data?.offerCount || 1,
            availability: 'https://schema.org/InStock',
          },
        };

      case 'BreadcrumbList':
        return {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: data?.items || [],
        };

      default:
        return null;
    }
  };

  const structuredData = getStructuredData();

  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

