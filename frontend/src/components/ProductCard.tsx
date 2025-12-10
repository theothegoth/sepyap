'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductCardProps {
  product: {
    id: number;
    canonical_title: string;
    image_url?: string | null;
    category?: string | null;
  };
  isWatched: boolean;
  isLoading: boolean;
  onAddToWatchlist: (e: React.MouseEvent) => void;
  onRemoveFromWatchlist: (e: React.MouseEvent) => void;
  onProductClick: (productId: number) => void;
}

const ProductCard = memo(function ProductCard({
  product,
  isWatched,
  isLoading,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onProductClick,
}: ProductCardProps) {
  const { t } = useLanguage();

  return (
    <div className="card hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600">
      {product.image_url && (
        <img
          src={product.image_url}
          alt={`${product.canonical_title} - Price comparison available`}
          className="w-full h-32 object-contain mb-3 rounded bg-gray-50 dark:bg-gray-700"
          loading="lazy"
          width={400}
          height={200}
        />
      )}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        {product.canonical_title}
      </h3>
      {product.category && (
        <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {product.category}
        </span>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onProductClick(product.id)}
          className="flex-1 btn-primary text-sm"
        >
          {t('search.comparePrices')}
        </button>
        {isWatched ? (
          <button
            onClick={onRemoveFromWatchlist}
            disabled={isLoading}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm disabled:opacity-50 transition-colors"
            title={t('watchlist.remove')}
          >
            {isLoading ? '...' : '✓'}
          </button>
        ) : (
          <button
            onClick={onAddToWatchlist}
            disabled={isLoading}
            className="px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm disabled:opacity-50 transition-colors"
            title={t('product.addToWatchlist')}
          >
            {isLoading ? '...' : '+'}
          </button>
        )}
      </div>
    </div>
  );
});

export default ProductCard;

