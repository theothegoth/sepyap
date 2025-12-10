import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { OrganizationStructuredData, WebSiteStructuredData } from "./structured-data";

export const metadata: Metadata = {
  title: {
    default: "SepYap - Find the Cheapest Grocery Prices Across All Markets",
    template: "%s | SepYap"
  },
  description: "Compare grocery prices across all major Turkish markets (Migros, CarrefourSA, Getir, A101) and find the cheapest shopping cart. Save money on your groceries with real-time price comparison.",
  keywords: ["grocery", "price comparison", "shopping", "migros", "carrefour", "getir", "a101", "cheap groceries", "grocery prices", "market comparison", "turkey"],
  authors: [{ name: "SepYap" }],
  creator: "SepYap",
  publisher: "SepYap",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  alternates: {
    canonical: '/',
    languages: {
      'tr': '/tr',
      'en': '/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    alternateLocale: ['en_US'],
    url: '/',
    siteName: 'SepYap',
    title: 'SepYap - Find the Cheapest Grocery Prices',
    description: 'Compare grocery prices across all major Turkish markets and find the cheapest shopping cart.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SepYap - Price Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SepYap - Find the Cheapest Grocery Prices',
    description: 'Compare grocery prices across all major Turkish markets and find the cheapest shopping cart.',
    images: ['/og-image.png'],
    creator: '@sepyap',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <OrganizationStructuredData />
        <WebSiteStructuredData />
        <link rel="canonical" href={process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#10b981" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

