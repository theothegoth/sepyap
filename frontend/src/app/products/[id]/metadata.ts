import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  // In a real implementation, you would fetch product data here
  // For now, we'll use dynamic metadata
  const productId = params.id;

  return {
    title: `Product #${productId} - Price Comparison`,
    description: `Compare prices for product #${productId} across all major Turkish markets. Find the cheapest option and save money.`,
    openGraph: {
      title: `Product #${productId} - Price Comparison`,
      description: `Compare prices for product #${productId} across all major Turkish markets.`,
      url: `/products/${productId}`,
      type: 'product',
    },
    alternates: {
      canonical: `/products/${productId}`,
    },
  };
}

