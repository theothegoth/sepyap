# Server Kurulum - Sonraki Adımlar

## Mevcut Durum Kontrolü

Önce mevcut durumu kontrol et:

```bash
# 1. Proje klasöründe olduğundan emin ol
cd /opt/sepyap
pwd

# 2. Dosyaların var olduğunu kontrol et
ls -la docker-compose.prod.yml
ls -la .env
ls -la backend/Dockerfile.prod
ls -la frontend/Dockerfile.prod

# 3. .env dosyasını kontrol et
cat .env
```

## Adım 1: .env Dosyasını Local PostgreSQL için Güncelle

Managed database kullanmıyorsan, `.env` dosyasını güncelle:

```bash
nano .env
```

İçeriği şu şekilde olmalı:
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

**Önemli:** `DB_HOST=postgres` olmalı (local Docker container için)

## Adım 2: docker-compose.prod.yml Syntax Kontrolü

```bash
# YAML syntax kontrolü
docker compose -f docker-compose.prod.yml config

# Eğer hata varsa, dosyayı yeniden oluştur (yukarıdaki içerikle)
```

## Adım 3: PostgreSQL Container'ını Başlat

```bash
# Sadece PostgreSQL'i başlat
docker compose -f docker-compose.prod.yml up -d postgres

# Durumu kontrol et
docker ps | grep sepyap-db

# Logları kontrol et
docker logs sepyap-db
```

**Beklenen çıktı:** Container çalışıyor ve "database system is ready" mesajı görünüyor

## Adım 4: Backend ve Frontend Build

```bash
# Backend build
docker compose -f docker-compose.prod.yml build backend

# Frontend build (bu biraz zaman alabilir)
docker compose -f docker-compose.prod.yml build frontend

# Eğer frontend build hatası varsa, detaylı log al
docker compose -f docker-compose.prod.yml build frontend --no-cache 2>&1 | tail -50
```

## Adım 5: Tüm Servisleri Başlat

```bash
# Tüm servisleri başlat
docker compose -f docker-compose.prod.yml up -d

# Durumu kontrol et
docker compose -f docker-compose.prod.yml ps

# Logları kontrol et
docker compose -f docker-compose.prod.yml logs -f
```

**Beklenen durum:**
- `sepyap-db` - Up (healthy)
- `sepyap-backend` - Up (healthy)
- `sepyap-frontend` - Up (healthy)

## Adım 6: Servislerin Çalıştığını Test Et

```bash
# Backend test (localhost'tan)
curl http://localhost:3000/api/ingest/stats

# Frontend test
curl http://localhost:3000

# Container içinden test
docker exec sepyap-backend curl http://localhost:3000/api/ingest/stats
```

## Adım 7: Nginx Reverse Proxy Kurulumu

### 7.1 Frontend için Nginx Config

```bash
nano /etc/nginx/sites-available/sepyap.com
```

İçeriği:
```nginx
server {
    listen 80;
    server_name sepyap.com www.sepyap.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.2 Backend için Nginx Config

```bash
nano /etc/nginx/sites-available/api.sepyap.com
```

İçeriği:
```nginx
server {
    listen 80;
    server_name api.sepyap.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Not:** Backend ve frontend aynı port'ta (3000) çalışıyor. Nginx'te farklı port mapping yapman gerekebilir. Önce container'ların hangi port'ta çalıştığını kontrol et.

### 7.3 Nginx'i Aktif Et

```bash
# Symlink oluştur
ln -s /etc/nginx/sites-available/sepyap.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/api.sepyap.com /etc/nginx/sites-enabled/

# Config test
nginx -t

# Nginx'i yeniden başlat
systemctl restart nginx
```

## Adım 8: SSL Sertifikası (Let's Encrypt)

```bash
# Frontend için SSL
certbot --nginx -d sepyap.com -d www.sepyap.com

# Backend için SSL
certbot --nginx -d api.sepyap.com

# Otomatik yenileme test
certbot renew --dry-run
```

## Adım 9: Domain DNS Ayarları

Squarespace'te DNS kayıtlarını güncelle:

1. **A Record:** `@` → Server IP (178.62.202.102)
2. **CNAME:** `www` → `sepyap.com`
3. **CNAME:** `api` → `sepyap.com` (veya server IP)

## Adım 10: Firewall Ayarları

```bash
# UFW kur (eğer yoksa)
apt-get install ufw -y

# Varsayılan kurallar
ufw default deny incoming
ufw default allow outgoing

# Gerekli portları aç
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Firewall'ı aktif et
ufw enable

# Durumu kontrol et
ufw status
```

## Hızlı Kontrol Listesi

- [ ] `.env` dosyası `DB_HOST=postgres` ile güncellendi
- [ ] `docker-compose.prod.yml` syntax hatası yok
- [ ] PostgreSQL container çalışıyor
- [ ] Backend build başarılı
- [ ] Frontend build başarılı
- [ ] Tüm container'lar çalışıyor (healthy)
- [ ] Nginx config dosyaları oluşturuldu
- [ ] Nginx aktif ve çalışıyor
- [ ] SSL sertifikaları alındı
- [ ] DNS ayarları yapıldı
- [ ] Firewall aktif

## Sorun Giderme

### Container'lar başlamıyor
```bash
# Logları kontrol et
docker compose -f docker-compose.prod.yml logs

# Container'ları yeniden başlat
docker compose -f docker-compose.prod.yml restart
```

### Database bağlantı hatası
```bash
# Database container'ı kontrol et
docker logs sepyap-db

# .env dosyasını kontrol et
cat .env | grep DB_
```

### Nginx 502 hatası
```bash
# Container'ların çalıştığını kontrol et
docker ps

# Port mapping'i kontrol et
docker compose -f docker-compose.prod.yml ps
```

## Sonraki Adımlar Özeti

1. ✅ `.env` dosyasını güncelle (`DB_HOST=postgres`)
2. ✅ PostgreSQL container'ını başlat
3. ✅ Backend ve frontend build
4. ✅ Tüm servisleri başlat
5. ✅ Nginx reverse proxy kur
6. ✅ SSL sertifikası al
7. ✅ DNS ayarlarını yap
8. ✅ Firewall aktif et

Her adımı tamamladıktan sonra bir sonrakine geç!

