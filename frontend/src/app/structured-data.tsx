// Server component for structured data in head
export function OrganizationStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SepYap',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'Compare grocery prices across all major Turkish markets',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function WebSiteStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SepYap',
    url: baseUrl,
    description: 'Compare grocery prices across all major Turkish markets and find the cheapest shopping cart',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

