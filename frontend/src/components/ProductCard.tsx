'use client';

import React, { memo } from 'react';
import Link from 'next/link';

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
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onProductClick(product.id)}
          className="flex-1 btn-primary text-sm"
        >
          Fiyatları karşılaştır →
        </button>
        {isWatched ? (
          <button
            onClick={onRemoveFromWatchlist}
            className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm transition-colors"
            title="Kaldır"
            disabled={isLoading}
          >
            {isLoading ? '...' : '✕'}
          </button>
        ) : (
          <button
            onClick={onAddToWatchlist}
            className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm transition-colors"
            title="İzleme Listesine Ekle"
            disabled={isLoading}
          >
            {isLoading ? '...' : '⭐'}
          </button>
        )}
      </div>
    </div>
  );
});

export default ProductCard;
