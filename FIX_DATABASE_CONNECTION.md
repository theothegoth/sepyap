# Database Bağlantı Hatası Giderme

## Sorun

Backend "admin" database'ine bağlanmaya çalışıyor ama database "sepyap" olmalı.

## Çözüm Adımları

### 1. .env Dosyasını Kontrol Et

```bash
# .env dosyasını kontrol et
cat .env

# DB_NAME'in doğru olduğundan emin ol
grep DB_NAME .env
```

**Beklenen çıktı:**
```
DB_NAME=sepyap
```

### 2. Environment Variables'ı Container'da Kontrol Et

```bash
# Backend container'ın environment variables'ını kontrol et
docker exec sepyap-backend env | grep DB_

# Veya container başlamadan önce
docker compose -f docker-compose.prod.yml config | grep -A 10 "backend:"
```

### 3. .env Dosyasını Düzelt

Eğer DB_NAME eksik veya yanlışsa:

```bash
nano .env
```

Şu şekilde olmalı:
```env
DB_HOST=postgres
DB_USER=sepyap_admin
DB_PASSWORD=SePy@P2024!Db#P@ss
DB_NAME=sepyap
ADMIN_SECRET=H9vpL3qA!t2Zr8W
ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com
NEXT_PUBLIC_SITE_URL=https://sepyap.com
NEXT_PUBLIC_API_URL=https://api.sepyap.com/api
NODE_ENV=production
```

**Önemli:** 
- `DB_NAME=sepyap` olmalı (admin değil!)
- `DB_USER=sepyap_admin` olmalı (admin değil!)

### 4. Container'ları Yeniden Başlat

```bash
# Container'ları durdur
docker compose -f docker-compose.prod.yml down

# .env dosyasını tekrar kontrol et
cat .env

# Container'ları yeniden başlat
docker compose -f docker-compose.prod.yml up -d

# Backend loglarını kontrol et
docker logs sepyap-backend
```

### 5. Database'in Oluşturulduğunu Kontrol Et

```bash
# PostgreSQL container'a bağlan
docker exec -it sepyap-db psql -U sepyap_admin -d postgres

# Database'leri listele
\l

# "sepyap" database'i var mı kontrol et
# Eğer yoksa, oluştur:
CREATE DATABASE sepyap;

# Çıkış
\q
```

### 6. Manuel Database Oluşturma (Gerekirse)

```bash
# PostgreSQL container'a bağlan
docker exec -it sepyap-db psql -U sepyap_admin -d postgres

# Database oluştur
CREATE DATABASE sepyap;

# Kullanıcı oluştur (eğer yoksa)
CREATE USER sepyap_admin WITH PASSWORD 'SePy@P2024!Db#P@ss';

# İzinleri ver
GRANT ALL PRIVILEGES ON DATABASE sepyap TO sepyap_admin;

# Çıkış
\q
```

## Hızlı Çözüm

```bash
# 1. .env dosyasını kontrol et ve düzelt
cat .env
nano .env  # DB_NAME=sepyap olduğundan emin ol

# 2. Container'ları yeniden başlat
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# 3. Backend loglarını kontrol et
docker logs sepyap-backend | tail -20
```

## Kontrol Komutları

```bash
# .env dosyasındaki DB_NAME
cat .env | grep DB_NAME

# Container'daki DB_NAME
docker exec sepyap-backend env | grep DB_NAME

# Database'lerin listesi
docker exec sepyap-db psql -U sepyap_admin -d postgres -c "\l"
```

