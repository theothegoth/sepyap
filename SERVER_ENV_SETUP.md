# DigitalOcean Server .env Dosyası Kurulum Rehberi

## Hızlı Başlangıç

Server'a bağlan ve `.env` dosyasını oluştur:

```bash
# Server'a bağlan
ssh root@178.62.202.102

# Proje klasörüne git
cd /opt/sepyap

# .env dosyasını oluştur
nano .env
```

Aşağıdaki içeriği kopyala-yapıştır ve değerleri kendi bilgilerinle değiştir.

## .env Dosyası İçeriği

```env
# ============================================
# SepYap Production Environment Variables
# DigitalOcean Server için .env dosyası
# ============================================

# ============================================
# Database Configuration
# ============================================

# Seçenek 1: DigitalOcean Managed Database (Önerilen)
DB_HOST=your-db-host.db.ondigitalocean.com
DB_USER=doadmin
DB_PASSWORD=your-managed-db-password-here
DB_NAME=sepyap

# Seçenek 2: Droplet'te Local PostgreSQL (docker-compose.prod.yml kullanıyorsan)
# DB_HOST=postgres
# DB_USER=sepyap_admin
# DB_PASSWORD=your-strong-password-here
# DB_NAME=sepyap

# ============================================
# Admin Secret Key
# ============================================
ADMIN_SECRET=H9vpL3qA!t2Zr8W

# ============================================
# CORS Configuration
# ============================================
ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com

# ============================================
# Frontend Configuration
# ============================================
NEXT_PUBLIC_SITE_URL=https://sepyap.com
NEXT_PUBLIC_API_URL=https://api.sepyap.com/api

# ============================================
# Node Environment
# ============================================
NODE_ENV=production
```

## Adım Adım Kurulum

### 1. Managed Database Kullanıyorsanız

**DigitalOcean Dashboard'dan:**
1. Databases → Database'inizi seçin
2. "Connection Details" bölümüne gidin
3. Şu bilgileri kopyalayın:
   - **Host:** `your-db-host.db.ondigitalocean.com`
   - **User:** `doadmin` (genellikle)
   - **Password:** Otomatik oluşturulan şifre
   - **Database:** `sepyap` (oluştururken verdiğiniz isim)
   - **Port:** `25060` (genellikle)

**.env dosyasında:**
```env
DB_HOST=your-db-host.db.ondigitalocean.com
DB_USER=doadmin
DB_PASSWORD=<kopyaladığınız-şifre>
DB_NAME=sepyap
```

### 2. Local PostgreSQL Kullanıyorsanız (Docker Compose)

**.env dosyasında:**
```env
DB_HOST=postgres
DB_USER=sepyap_admin
DB_PASSWORD=SePy@P2024!Db#P@ss
DB_NAME=sepyap
```

**Not:** `docker-compose.prod.yml` kullanıyorsanız, `DB_HOST=postgres` olmalı (container name).

### 3. Admin Secret Key

Production'da mutlaka güçlü bir key kullanın:

```env
ADMIN_SECRET=SePy@P2024!Adm1n#K3y
```

**Güvenlik:**
- En az 15 karakter
- Rastgele karakterler
- Güvenli bir yerde saklayın

### 4. Domain Ayarları

Kendi domain'lerinizi ekleyin:

```env
NEXT_PUBLIC_SITE_URL=https://sepyap.com
NEXT_PUBLIC_API_URL=https://api.sepyap.com/api
ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com
```

**Not:** `api.sepyap.com` subdomain'i oluşturmanız gerekiyor (backend için).

## Dosya İzinleri

.env dosyasını güvenli hale getirin:

```bash
# Sadece root okuyabilsin
chmod 600 .env

# Sahibini kontrol et
ls -la .env
# Çıktı: -rw------- 1 root root ... .env
```

## Doğrulama

Environment variables'ların doğru yüklendiğini kontrol edin:

```bash
# Docker Compose ile test
docker compose -f docker-compose.prod.yml config

# Veya backend container'da kontrol
docker exec sepyap-backend env | grep DB_
```

## Güvenlik Notları

1. **.env dosyasını Git'e commit ETMEYİN**
   - Zaten `.gitignore`'da olmalı
   - Kontrol: `git check-ignore .env` → `.env` döndürmeli

2. **Şifre Güvenliği**
   - En az 16 karakter
   - Büyük/küçük harf, sayı, özel karakter
   - Her ortam için farklı şifre

3. **Dosya İzinleri**
   - `chmod 600 .env` (sadece owner okuyabilir)

4. **Yedekleme**
   - .env dosyasını güvenli bir yerde (şifre yöneticisi) saklayın
   - Production şifrelerini kaybetmeyin!

## Troubleshooting

### "Connection refused" Hatası
- DB_HOST'u kontrol edin
- Managed DB kullanıyorsanız, Trusted Sources'a IP ekleyin
- Firewall kurallarını kontrol edin

### "Authentication failed" Hatası
- DB_PASSWORD'u kontrol edin (büyük/küçük harf duyarlı)
- DB_USER'ı kontrol edin

### "Database does not exist" Hatası
- DB_NAME'i kontrol edin (`sepyap`)
- Database'in oluşturulduğundan emin olun

## Örnek Tam .env Dosyası (Managed Database)

```env
DB_HOST=db-postgresql-ams3-12345.db.ondigitalocean.com
DB_USER=doadmin
DB_PASSWORD=AVNS_AbCdEf1234567890XyZ
DB_NAME=sepyap
ADMIN_SECRET=SePy@P2024!Adm1n#K3y
ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com
NEXT_PUBLIC_SITE_URL=https://sepyap.com
NEXT_PUBLIC_API_URL=https://api.sepyap.com/api
NODE_ENV=production
```

## Örnek Tam .env Dosyası (Local PostgreSQL)

```env
DB_HOST=postgres
DB_USER=sepyap_admin
DB_PASSWORD=SePy@P2024!Db#P@ss
DB_NAME=sepyap
ADMIN_SECRET=SePy@P2024!Adm1n#K3y
ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com
NEXT_PUBLIC_SITE_URL=https://sepyap.com
NEXT_PUBLIC_API_URL=https://api.sepyap.com/api
NODE_ENV=production
```

