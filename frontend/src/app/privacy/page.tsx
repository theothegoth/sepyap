'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors py-16 sm:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-8">
                    <Link href="/" className="text-green-600 dark:text-green-500 font-bold mb-4 inline-block hover:underline">
                        ← Ana Sayfaya Dön
                    </Link>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        Gizlilik Politikası
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        SepYap olarak gizliliğinize ve verilerinizin güvenliğine büyük önem veriyoruz.
                        Bu politika, Chrome uzantımızın hangi verileri topladığını ve bu verileri nasıl kullandığını açıklar.
                    </p>
                </header>

                <div className="space-y-12">
                    {/* Section 1: What we collect */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            1. Hangi Verileri Topluyoruz?
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                            Chrome uzantımız, sadece market alışverişi özelliklerimizi sunabilmek için gerekli olan ürün bilgilerini toplar. Toplanan veriler şunlardır:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                            <li>Ürün adı</li>
                            <li>Ürün fiyatı</li>
                            <li>Market adı</li>
                        </ul>
                        <p className="mt-4 text-gray-700 dark:text-gray-300 italic">
                            Bu veriler sadece desteklenen market sitelerini aktif olarak ziyaret ettiğinizde toplanır.
                        </p>
                    </section>

                    {/* Section 2: What we DON'T collect */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-red-600 dark:text-red-400">
                            2. Neleri Toplamıyoruz?
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                            Gizliliğiniz bizim için önceliklidir. Aşağıdaki verileri <strong>asla</strong> toplamıyoruz:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                            <li>Kişisel veriler (ad, e-posta, telefon vb.)</li>
                            <li>Tarama geçmişi</li>
                            <li>Giriş bilgileri (parolalar, kullanıcı adları)</li>
                            <li>Çerezler (Cookies)</li>
                            <li>IP adresleri</li>
                            <li>Konum verileri</li>
                        </ul>
                    </section>

                    {/* Section 3: Purpose and Use */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            3. Veriler Neden Toplanıyor ve Nasıl Kullanılıyor?
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            Toplanan ürün verileri, size aşağıdaki özellikleri sunmak amacıyla kullanılır:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                            <li>Farklı marketlerdeki ürün fiyatlarını karşılaştırmak.</li>
                            <li>Alışveriş sepetiniz için en ucuz market kombinasyonunu hesaplamak.</li>
                            <li>Ürün fiyat geçmişini takip etmenize olanak sağlamak.</li>
                        </ul>
                    </section>

                    {/* Section 4: Sharing */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            4. Veri Paylaşımı
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Topladığımız verileri <strong>asla satmayız veya üçüncü taraflarla paylaşmayız</strong>.
                            Veriler sadece SepYap hizmetinin işleyişi için sunucularımızda güvenli bir şekilde saklanır.
                        </p>
                    </section>

                    {/* Section 5: Control and Uninstallation */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            5. Kontrol Sizde
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Veri toplanmasını istediğiniz zaman durdurabilirsiniz. Bunun için Chrome uzantısını kaldırmanız veya tarayıcı ayarlarından devre dışı bırakmanız yeterlidir.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            Sorularınız mı var?
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300">
                            Gizlilik uygulamalarımızla ilgili herhangi bir sorunuz olursa bizimle iletişime geçmekten çekinmeyin.
                        </p>
                    </section>
                </div>

                <footer className="mt-16 text-sm text-gray-500 dark:text-gray-500">
                    Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
                </footer>
            </div>
        </main>
    );
}
