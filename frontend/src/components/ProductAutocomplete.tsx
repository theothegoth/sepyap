import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';

interface ProductAutocompleteProps {
    onSelect: (product: { id: number; title: string; image?: string }) => void;
    onEnter: (query: string) => void;
    placeholder?: string;
    className?: string;
    allowedMarkets?: string[];
    includeBrands?: string[];
    excludeBrands?: string[];
}

export default function ProductAutocomplete({
    onSelect,
    onEnter,
    placeholder = "Ürün ara...",
    className = "",
    allowedMarkets = [],
    includeBrands = [],
    excludeBrands = [],
}: ProductAutocompleteProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Fetch suggestions
    useEffect(() => {
        async function fetchSuggestions() {
            if (debouncedQuery.trim().length < 2) {
                setSuggestions([]);
                return;
            }

            setLoading(true);
            try {
                const response = await api.searchProducts(
                    debouncedQuery,
                    50,
                    includeBrands.length > 0 ? includeBrands : undefined,
                    excludeBrands.length > 0 ? excludeBrands : undefined,
                    true, // strict
                    allowedMarkets.length > 0 ? allowedMarkets : undefined
                );
                setSuggestions(response.data.products || []);
                setIsOpen(true);
            } catch (error) {
                console.error("Failed to fetch suggestions:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchSuggestions();
    }, [debouncedQuery, allowedMarkets, includeBrands, excludeBrands]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (!isOpen || suggestions.length === 0) {
                onEnter(query);
                setQuery('');
                setIsOpen(false);
            }
            // If dropdown is open, user might be selecting via keyboard (todo: add arrow key navigation)
        }
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />

            {loading && (
                <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
            )}

            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                    {suggestions.map((product: any) => (
                        <div
                            key={product.id}
                            onClick={() => {
                                onSelect({
                                    id: product.id,
                                    title: product.canonical_title,
                                    image: product.image_url
                                });
                                setQuery('');
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.canonical_title} className="w-10 h-10 object-contain bg-white rounded p-1" />
                            ) : (
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center text-xs">
                                    📷
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.canonical_title}</div>
                                {product.category && <div className="text-xs text-gray-500 dark:text-gray-400">{product.category}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
