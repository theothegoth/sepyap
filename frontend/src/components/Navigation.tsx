'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { memo } from 'react';

const Navigation = memo(function Navigation() {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isSearch = pathname === '/search';
  const isWatchlist = pathname === '/watchlist';
  const isAlerts = pathname === '/alerts';

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo/Home */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl sm:text-3xl font-bold hover:opacity-80 transition-opacity group"
              prefetch={true}
              aria-label="SepYap Home"
            >
              <img
                src="/icon_192_safe.png"
                alt="SepYap Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg bg-green-500/5 group-hover:scale-110 transition-transform"
              />
              <span className="bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
                SepYap
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1 ml-4">
              <Link
                href="/cart"
                prefetch={true}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/cart'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                Sepet
              </Link>
              <Link
                href="/search"
                prefetch={true}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSearch
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                Ürün Ara
              </Link>
              <Link
                href="/watchlist"
                prefetch={true}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isWatchlist
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                İzleme Listesi
              </Link>
              <Link
                href="/alerts"
                prefetch={true}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isAlerts
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                Uyarılar
              </Link>
            </div>
          </div>

          {/* Right: Theme Toggle */}
          <div className="flex gap-2 items-center">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 border-t border-gray-200 dark:border-gray-700 mt-2 pt-3">
          <div className="flex items-center gap-1">
            <Link
              href="/cart"
              prefetch={true}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${pathname === '/cart'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              Sepet
            </Link>
            <Link
              href="/search"
              prefetch={true}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${isSearch
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              Ürün Ara
            </Link>
            <Link
              href="/watchlist"
              prefetch={true}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${isWatchlist
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              İzleme Listesi
            </Link>
            <Link
              href="/alerts"
              prefetch={true}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${isAlerts
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              Uyarılar
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
});

export default Navigation;

