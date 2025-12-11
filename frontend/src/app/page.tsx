'use client';

import React from 'react';
import Link from 'next/link';
import { useExtensionCheck } from '../hooks/useExtensionCheck';
import StructuredData from '../components/StructuredData';

const privacyPoints = [
  'Sadece ürün adı, fiyat ve market bilgisi toplanır',
  'Kişisel bilgi veya tarama geçmişi toplanmaz',
  'Veriler sadece fiyat karşılaştırması için kullanılır',
];

export default function LandingPage() {
  const { checkExtension } = useExtensionCheck();
  const hasExtension = checkExtension();

  return (
    <>
      <StructuredData
        type="WebPage"
        data={{
          url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
          name: 'SepYap - En Ucuz Alışveriş Fiyatlarını Bulun',
          description: 'Tüm Türk marketlerinde fiyatları karşılaştırın ve en ucuz alışveriş sepetini bulun. Gerçek zamanlı fiyat karşılaştırması ile alışverişinizden tasarruf edin.',
        }}
      />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-blue-600 dark:from-green-700 dark:via-green-600 dark:to-blue-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
                En Ucuz Alışveriş Sepetini Bulun
              </h1>
              <p className="text-xl sm:text-2xl mb-8 text-green-50 dark:text-green-100 max-w-3xl mx-auto">
                Tüm Türk marketlerinde fiyatları karşılaştırın ve paradan tasarruf edin
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {!hasExtension ? (
                  <a
                    href="#install"
                    className="px-8 py-4 bg-white text-green-600 dark:bg-gray-800 dark:text-green-400 rounded-lg font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    Uzantıyı Yükle
                  </a>
                ) : (
                  <Link
                    href="/cart"
                    className="px-8 py-4 bg-white text-green-600 dark:bg-gray-800 dark:text-green-400 rounded-lg font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    Alışverişe Başla
                  </Link>
                )}
                <Link
                  href="/search"
                  className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-colors"
                >
                  Ürün Ara
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
              Nasıl Çalışır?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Uzantıyı Yükle
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Chrome uzantısını yükleyin ve market sitelerinde otomatik fiyat toplama özelliğini etkinleştirin
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Marketlerde Gezin
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Migros, CarrefourSA, Getir, A101 ve daha fazlasında normal şekilde alışveriş yapın
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 dark:bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Fiyatları Karşılaştır
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  SepYap'ta sepetinizi oluşturun ve tüm marketlerdeki en ucuz seçeneği bulun
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 dark:bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  4
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Para Tasarrufu Yapın
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  En iyi fiyatları görün ve alışverişinizden en fazla tasarrufu yapın
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
              Özellikler
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="card">
                <div className="text-4xl mb-4">🛒</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Çoklu Market Karşılaştırması
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Migros, CarrefourSA, Getir, A101, Bim, Şok ve daha fazlasını karşılaştırın
                </p>
              </div>
              <div className="card">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Fiyat Geçmişi
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Ürün fiyatlarının zaman içindeki değişimini takip edin
                </p>
              </div>
              <div className="card">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  İzleme Listesi
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Favori ürünlerinizi kaydedin ve fiyat düşüşlerinde uyarı alın
                </p>
              </div>
              <div className="card">
                <div className="text-4xl mb-4">🏷️</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Marka Filtreleme
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tercih ettiğiniz markaları seçin veya istemediklerinizi hariç tutun
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy & Security */}
        <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">
              Gizlilik ve Güvenlik
            </h2>
            <h3 className="text-2xl font-semibold text-center mb-6 text-green-600 dark:text-green-400">
              Verileriniz Güvende
            </h3>
            <p className="text-lg text-center mb-8 text-gray-600 dark:text-gray-400">
              Sadece ürün fiyatlarını topluyoruz. Kişisel bilgileriniz asla toplanmaz veya saklanmaz.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {privacyPoints.map((point: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-green-600 dark:text-green-400 text-xl mt-0.5">✓</div>
                  <p className="text-gray-700 dark:text-gray-300">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Extension Installation Guide */}
        <section id="install" className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
              Uzantı Kurulum Rehberi
            </h2>
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Chrome Web Mağazası'na gidin veya uzantıyı manuel yükleyin
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Uzantıyı yükledikten sonra market sitelerinde gezinmeye başlayın
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Uzantı otomatik olarak fiyatları toplar ve SepYap'a gönderir
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      SepYap'ta sepetinizi oluşturun ve en ucuz seçeneği bulun
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
              Sık Sorulan Sorular
            </h2>
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Uzantı neden gerekli?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Uzantı, market sitelerindeki fiyatları otomatik olarak toplar. Bu sayede manuel olarak her marketi kontrol etmenize gerek kalmaz.
                </p>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Verilerim güvende mi?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Evet! Sadece ürün fiyatları toplanır. Kişisel bilgileriniz, tarama geçmişiniz veya diğer hassas veriler asla toplanmaz.
                </p>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Hangi marketleri destekliyor?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Migros, CarrefourSA, Getir, A101, Bim, Şok, Happy Center, Macro Center ve daha fazlası.
                </p>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Ücretsiz mi?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Evet, SepYap tamamen ücretsizdir ve her zaman öyle kalacaktır.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-24 bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-700 dark:to-blue-700 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Hemen Başlayın
            </h2>
            <p className="text-xl mb-8 text-green-50 dark:text-green-100">
              Uzantıyı yükleyin ve alışverişinizden tasarruf etmeye başlayın
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!hasExtension ? (
                <a
                  href="#install"
                  className="px-8 py-4 bg-white text-green-600 dark:bg-gray-800 dark:text-green-400 rounded-lg font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-xl"
                >
                  Uzantıyı Yükle
                </a>
              ) : (
                <Link
                  href="/cart"
                  className="px-8 py-4 bg-white text-green-600 dark:bg-gray-800 dark:text-green-400 rounded-lg font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-xl"
                >
                  Alışverişe Başla
                </Link>
              )}
              <Link
                href="/search"
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-colors"
              >
                Ürün Ara
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
