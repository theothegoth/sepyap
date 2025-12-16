# Production Docker Compose Kullanım Rehberi

## Durum

✅ `docker-compose.prod.yml` dosyası hazır (local PostgreSQL ile)
✅ Production Dockerfile'lar hazır (`Dockerfile.prod`)
✅ `.env` dosyası oluşturulmalı

## Server'da Kurulum Adımları

### 1. Projeyi Server'a Kopyala

```bash
# Server'a bağlan
ssh root@178.62.202.102

# Proje klasörüne git (veya oluştur)
cd /opt
git clone https://github.com/theothegoth/sepyap.git
cd sepyap
```

### 2. .env Dosyasını Oluştur

```bash
nano .env
```

İçeriği (local PostgreSQL için):
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

**Önemli:** Şifreleri kendi güçlü şifrelerinizle değiştirin!

```bash
# Dosya izinlerini ayarla
chmod 600 .env
```

### 3. Docker ve Docker Compose Kurulumu

```bash
# Docker kurulumu (eğer yoksa)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose kurulumu (eğer yoksa)
apt-get update
apt-get install docker-compose-plugin -y

# Docker servisini başlat
systemctl start docker
systemctl enable docker
```

### 4. Production Build ve Başlatma

```bash
# Production build yap
docker compose -f docker-compose.prod.yml build

# Container'ları başlat
docker compose -f docker-compose.prod.yml up -d

# Logları kontrol et
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Durum Kontrolü

```bash
# Container'ların durumunu kontrol et
docker compose -f docker-compose.prod.yml ps

# Health check'leri kontrol et
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Beklenen çıktı:**
```
NAME              STATUS
sepyap-db         Up (healthy)
sepyap-backend    Up (healthy)
sepyap-frontend   Up (healthy)
```

## Yaygın Komutlar

### Container'ları Durdurma

```bash
docker compose -f docker-compose.prod.yml down
```

### Container'ları Yeniden Başlatma

```bash
docker compose -f docker-compose.prod.yml restart
```

### Logları İzleme

```bash
# Tüm loglar
docker compose -f docker-compose.prod.yml logs -f

# Sadece backend
docker compose -f docker-compose.prod.yml logs -f backend

# Sadece frontend
docker compose -f docker-compose.prod.yml logs -f frontend

# Sadece database
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Container'a Bağlanma

```bash
# Backend container'ına bağlan
docker exec -it sepyap-backend sh

# Frontend container'ına bağlan
docker exec -it sepyap-frontend sh

# Database'e bağlan
docker exec -it sepyap-db psql -U sepyap_admin -d sepyap
```

### Yeniden Build ve Başlatma

```bash
# Kod değişikliği yaptıktan sonra
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Database Backup

```bash
# Backup al
docker exec sepyap-db pg_dump -U sepyap_admin sepyap > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup'ı restore et
cat backup_20240101_120000.sql | docker exec -i sepyap-db psql -U sepyap_admin -d sepyap
```

## Nginx Reverse Proxy Kurulumu

Container'lar çalıştıktan sonra Nginx ile domain'leri bağla:

### 1. Nginx Kurulumu

```bash
apt-get update
apt-get install nginx certbot python3-certbot-nginx -y
```

### 2. Frontend için Nginx Config

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

### 3. Backend için Nginx Config

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

### 4. Nginx'i Aktif Et

```bash
# Symlink oluştur
ln -s /etc/nginx/sites-available/sepyap.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/api.sepyap.com /etc/nginx/sites-enabled/

# Nginx config'i test et
nginx -t

# Nginx'i yeniden başlat
systemctl restart nginx
```

### 5. SSL Sertifikası (Let's Encrypt)

```bash
# Frontend için SSL
certbot --nginx -d sepyap.com -d www.sepyap.com

# Backend için SSL
certbot --nginx -d api.sepyap.com

# Otomatik yenileme test et
certbot renew --dry-run
```

## Troubleshooting

### Container'lar Başlamıyor

```bash
# Logları kontrol et
docker compose -f docker-compose.prod.yml logs

# Environment variables'ı kontrol et
docker compose -f docker-compose.prod.yml config
```

### Database Bağlantı Hatası

```bash
# Database container'ın çalıştığını kontrol et
docker ps | grep sepyap-db

# Database loglarını kontrol et
docker logs sepyap-db

# .env dosyasındaki DB bilgilerini kontrol et
cat .env | grep DB_
```

### Port Çakışması

```bash
# Hangi portlar kullanılıyor kontrol et
netstat -tulpn | grep LISTEN

# Gerekirse docker-compose.prod.yml'de port mapping'i değiştir
```

### Disk Alanı Sorunu

```bash
# Kullanılmayan Docker kaynaklarını temizle
docker system prune -a --volumes

# Disk kullanımını kontrol et
df -h
```

## Otomatik Başlatma (Systemd)

Container'ların server yeniden başladığında otomatik başlaması için:

```bash
# Systemd service oluştur
nano /etc/systemd/system/sepyap.service
```

İçeriği:
```ini
[Unit]
Description=SepYap Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/sepyap
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Service'i aktif et
systemctl daemon-reload
systemctl enable sepyap
systemctl start sepyap
```

## Özet

1. ✅ `docker-compose.prod.yml` hazır
2. ✅ `.env` dosyası oluştur
3. ✅ `docker compose -f docker-compose.prod.yml build`
4. ✅ `docker compose -f docker-compose.prod.yml up -d`
5. ✅ Nginx reverse proxy kur
6. ✅ SSL sertifikası al

Tüm adımlar tamamlandıktan sonra `https://sepyap.com` adresinden erişebilirsiniz!

