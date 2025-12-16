# DigitalOcean Managed Database Kontrol ve Kurulum Rehberi

## Managed Database Kontrol Etme

### Yöntem 1: DigitalOcean Dashboard'dan Kontrol

1. **DigitalOcean Dashboard'a Giriş Yap**
   - https://cloud.digitalocean.com adresine git
   - Hesabına giriş yap

2. **Databases Bölümüne Git**
   - Sol menüden **"Databases"** seçeneğine tıkla
   - Veya direkt link: https://cloud.digitalocean.com/databases

3. **Mevcut Database'leri Kontrol Et**
   - Eğer listede bir database görüyorsan → **Managed Database var!**
   - Eğer liste boşsa veya "No databases" yazıyorsa → **Managed Database yok, oluşturman gerekiyor**

### Yöntem 2: App Platform Üzerinden Kontrol

Eğer App Platform kullanıyorsan:

1. **App Platform Dashboard'a Git**
   - https://cloud.digitalocean.com/apps
   - Projeni seç

2. **Resources Bölümünü Kontrol Et**
   - Sol menüden **"Resources"** seçeneğine tıkla
   - Eğer "Database" başlığı altında bir database görüyorsan → **Managed Database var!**
   - Eğer yoksa → **Managed Database yok**

## Managed Database Yoksa - Nasıl Oluşturulur?

### Seçenek 1: App Platform Üzerinden (Önerilen)

1. **App Platform'da Projeni Aç**
   - https://cloud.digitalocean.com/apps
   - Projeni seç

2. **Add Resource → Database**
   - Sol menüden **"Resources"** → **"Add Resource"** → **"Database"**

3. **Database Ayarları**
   - **Database Engine:** PostgreSQL seç
   - **Database Name:** `sepyap` (veya istediğin isim)
   - **Plan:** Basic ($15/ay) başlangıç için yeterli
   - **Region:** Amsterdam (Türkiye'ye yakın) veya Frankfurt
   - **Version:** PostgreSQL 15 (en son stabil versiyon)

4. **Database Oluştur**
   - "Create Database" butonuna tıkla
   - 2-3 dakika içinde database hazır olacak

5. **Connection Details'i Al**
   - Database oluşturulduktan sonra **"Connection Details"** bölümüne git
   - Şu bilgileri kopyala:
     - **Host:** `your-db-host.db.ondigitalocean.com`
     - **Port:** `25060` (genellikle)
     - **Database:** `sepyap`
     - **User:** `doadmin` (varsayılan)
     - **Password:** Otomatik oluşturulan şifre (sadece bir kez gösterilir!)

6. **Backend Environment Variables'a Ekle**
   - App Platform'da backend service'ine git
   - Settings → Environment Variables
   - Şu değişkenleri ekle:
     ```
     DB_HOST=your-db-host.db.ondigitalocean.com
     DB_USER=doadmin
     DB_PASSWORD=<kopyaladığın-şifre>
     DB_NAME=sepyap
     ```

### Seçenek 2: Standalone Managed Database (App Platform Dışında)

1. **Databases Sayfasına Git**
   - https://cloud.digitalocean.com/databases
   - "Create Database Cluster" butonuna tıkla

2. **Database Ayarları**
   - **Database Engine:** PostgreSQL
   - **Plan:** Basic ($15/ay)
   - **Region:** Amsterdam veya Frankfurt
   - **Database Name:** `sepyap`
   - **Version:** PostgreSQL 15

3. **Oluştur ve Bağla**
   - "Create Database Cluster" butonuna tıkla
   - Oluşturulduktan sonra Connection Details'i al
   - Backend environment variables'a ekle

## Managed Database vs Droplet'te PostgreSQL

### Managed Database (Önerilen) ✅
- ✅ Otomatik backup (günlük)
- ✅ Otomatik failover
- ✅ Kolay scaling
- ✅ SSL bağlantı
- ✅ Monitoring ve alerts
- ✅ Point-in-time recovery
- 💰 Maliyet: ~$15/ay (Basic plan)

### Droplet'te PostgreSQL (Manuel)
- ❌ Manuel backup yapman gerekir
- ❌ Manuel failover
- ❌ Manuel scaling
- ✅ Daha ucuz (Droplet fiyatı içinde)
- ❌ Daha fazla yönetim gerektirir
- 💰 Maliyet: Droplet fiyatı ($6-24/ay)

## Connection String Örneği

Managed Database için connection string şu şekilde olacak:

```
postgresql://doadmin:YOUR_PASSWORD@your-db-host.db.ondigitalocean.com:25060/sepyap?sslmode=require
```

**Önemli:** 
- `sslmode=require` mutlaka ekle (güvenlik için)
- Şifreyi URL encode etmen gerekebilir (özel karakterler için)

## Database Bağlantısını Test Etme

### App Platform'dan Test

1. Backend service'ine git
2. Runtime Logs'u aç
3. Uygulama başladığında database bağlantısı loglarında görünecek
4. Hata varsa connection details'i kontrol et

### Manuel Test (Droplet kullanıyorsan)

```bash
# PostgreSQL client ile test
psql "postgresql://doadmin:YOUR_PASSWORD@your-db-host.db.ondigitalocean.com:25060/sepyap?sslmode=require"

# Bağlantı başarılıysa şunu göreceksin:
# sepyap=>
```

## Troubleshooting

### "Connection refused" Hatası
- Firewall kurallarını kontrol et
- Managed Database'de "Trusted Sources" bölümünden IP adresini ekle
- App Platform kullanıyorsan, otomatik olarak eklenir

### "Authentication failed" Hatası
- Şifreyi kontrol et (büyük/küçük harf duyarlı)
- User adını kontrol et (genellikle `doadmin`)

### "Database does not exist" Hatası
- Database adını kontrol et (`sepyap`)
- Connection string'de doğru database adını kullandığından emin ol

## Güvenlik Notları

1. **Trusted Sources**
   - Managed Database'de sadece gerekli IP adreslerini ekle
   - App Platform kullanıyorsan, otomatik olarak eklenir
   - Droplet kullanıyorsan, Droplet IP'sini ekle

2. **SSL Bağlantı**
   - Mutlaka `sslmode=require` kullan
   - Production'da SSL olmadan bağlanma

3. **Şifre Güvenliği**
   - Otomatik oluşturulan şifreyi güvenli bir yerde sakla
   - Şifreyi Git'e commit etme
   - Düzenli olarak şifre değiştir (3-6 ayda bir)

## Özet

**Kontrol Et:**
1. https://cloud.digitalocean.com/databases → Database var mı?
2. App Platform → Resources → Database var mı?

**Yoksa Oluştur:**
1. App Platform → Add Resource → Database
2. PostgreSQL seç, `sepyap` ismini ver
3. Connection Details'i al
4. Backend environment variables'a ekle

**Öneri:** Managed Database kullan (otomatik backup, kolay yönetim, güvenlik)

