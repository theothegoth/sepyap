# Database Durumu Kontrol Rehberi

## 1. DigitalOcean Managed Database Kontrolü

### Dashboard'dan Kontrol

```bash
# Browser'da DigitalOcean'a git
https://cloud.digitalocean.com/databases

# Veya API ile kontrol (server'dan)
curl -X GET \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DO_TOKEN" \
  "https://api.digitalocean.com/v2/databases"
```

**Eğer listede database görünüyorsa:** Managed Database var
**Eğer liste boşsa:** Managed Database yok

## 2. Droplet'te Local PostgreSQL Kontrolü

### Docker Container Kontrolü

```bash
# Çalışan PostgreSQL container'ı var mı?
docker ps | grep postgres

# Veya tüm container'ları listele
docker ps -a
```

**Eğer `sepyap-db` veya `postgres` container'ı görünüyorsa:** Local PostgreSQL var

### Sistem PostgreSQL Kontrolü

```bash
# Sistem PostgreSQL kurulu mu?
which psql

# PostgreSQL servisi çalışıyor mu?
systemctl status postgresql

# Veya
service postgresql status
```

**Eğer PostgreSQL kurulu ve çalışıyorsa:** Sistem PostgreSQL var

### Port Kontrolü

```bash
# 5432 portu kullanılıyor mu?
netstat -tulpn | grep 5432

# Veya
ss -tulpn | grep 5432
```

**Eğer 5432 portu dinleniyorsa:** PostgreSQL çalışıyor

## 3. .env Dosyasındaki DB_HOST Kontrolü

```bash
# .env dosyasındaki DB_HOST'u kontrol et
cat .env | grep DB_HOST
```

**Eğer:**
- `DB_HOST=db-postgresql-ams3-12345.db.ondigitalocean.com` → **Managed Database** kullanılıyor
- `DB_HOST=postgres` → **Local Docker Container** kullanılıyor
- `DB_HOST=localhost` → **Sistem PostgreSQL** kullanılıyor

## 4. Database Bağlantı Testi

### Managed Database Testi

```bash
# .env'deki bilgilerle bağlantı testi
DB_HOST=$(grep DB_HOST .env | cut -d '=' -f2)
DB_USER=$(grep DB_USER .env | cut -d '=' -f2)
DB_PASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2)

# PostgreSQL client ile test (kuruluysa)
psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:25060/${DB_NAME}?sslmode=require"
```

### Local Database Testi

```bash
# Docker container içinden test
docker exec -it sepyap-db psql -U sepyap_admin -d sepyap

# Veya sistem PostgreSQL
psql -U sepyap_admin -d sepyap -h localhost
```

## 5. Hızlı Kontrol Komutları

### Tüm Database Durumlarını Kontrol Et

```bash
echo "=== Managed Database Kontrolü ==="
curl -s https://cloud.digitalocean.com/databases 2>/dev/null | grep -q "database" && echo "Managed DB var" || echo "Managed DB yok"

echo ""
echo "=== Docker Container Kontrolü ==="
docker ps | grep -E "postgres|sepyap-db" && echo "Docker PostgreSQL var" || echo "Docker PostgreSQL yok"

echo ""
echo "=== Sistem PostgreSQL Kontrolü ==="
systemctl status postgresql 2>/dev/null | grep -q "active" && echo "Sistem PostgreSQL çalışıyor" || echo "Sistem PostgreSQL yok"

echo ""
echo "=== Port Kontrolü ==="
netstat -tulpn 2>/dev/null | grep 5432 && echo "5432 portu kullanılıyor" || echo "5432 portu boş"

echo ""
echo "=== .env DB_HOST ==="
cat .env | grep DB_HOST
```

## 6. Duruma Göre Çözüm

### Senaryo 1: Managed Database Kullanıyorsan

**.env dosyası:**
```env
DB_HOST=db-postgresql-ams3-12345.db.ondigitalocean.com
DB_USER=doadmin  # veya admin
DB_PASSWORD=şifre
DB_NAME=sepyap
```

**docker-compose:**
```bash
docker compose -f docker-compose.prod.managed-db.yml up -d
```

### Senaryo 2: Local Docker PostgreSQL Kullanıyorsan

**.env dosyası:**
```env
DB_HOST=postgres
DB_USER=sepyap_admin
DB_PASSWORD=şifre
DB_NAME=sepyap
```

**docker-compose:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Senaryo 3: Database Yok - Oluşturman Gerekiyor

**Seçenek A: Docker ile Local PostgreSQL**

```bash
# docker-compose.prod.yml kullan (postgres service'i var)
docker compose -f docker-compose.prod.yml up -d postgres

# .env dosyasını güncelle
DB_HOST=postgres
DB_USER=sepyap_admin
DB_PASSWORD=güçlü-şifre
DB_NAME=sepyap
```

**Seçenek B: Managed Database Oluştur**

1. DigitalOcean Dashboard → Databases → Create Database
2. PostgreSQL seç
3. Connection Details'i al
4. .env dosyasını güncelle

## 7. Mevcut Durumunu Belirleme

Server'da şu komutları çalıştır:

```bash
# 1. Docker container'ları kontrol et
docker ps -a

# 2. .env dosyasındaki DB_HOST'u kontrol et
cat .env | grep DB_HOST

# 3. Port kontrolü
netstat -tulpn | grep 5432

# 4. Database bağlantısını test et
# (DB_HOST'a göre uygun komutu kullan)
```

Bu komutların çıktısını paylaşırsan, hangi durumda olduğunu belirleyebiliriz.

