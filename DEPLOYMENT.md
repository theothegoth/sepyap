# SepYap Production Deployment Guide - DigitalOcean

Bu rehber DigitalOcean'da SepYap projesini deploy etmek için adım adım talimatlar içerir.

## Seçenek 1: DigitalOcean App Platform (Önerilen - Kolay)

### Avantajlar:
- Otomatik SSL sertifikaları
- Otomatik scaling
- Git entegrasyonu
- Kolay domain bağlama
- Managed PostgreSQL

### Adımlar:

1. **DigitalOcean App Platform'a Git**
   - https://cloud.digitalocean.com/apps
   - "Create App" butonuna tıkla

2. **GitHub Repository Bağla**
   - GitHub hesabını bağla
   - `theothegoth/sepyap` repository'sini seç
   - Branch: `main`

3. **Backend Service Oluştur**
   - "Add Service" → "Web Service"
   - Name: `backend`
   - Build Command: `cd backend && npm ci && npm run build`
   - Run Command: `cd backend && npm run start:prod`
   - Environment Variables:
     ```
     DB_HOST=<managed-db-host>
     DB_USER=sepyap_admin
     DB_PASSWORD=<strong-password-min-16-chars>
     DB_NAME=sepyap
     ADMIN_SECRET=<your-secret-key>
     ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com
     NODE_ENV=production
     ```
     
   **Not:** 
   - `DB_PASSWORD`: En az 16 karakter, büyük/küçük harf, sayı ve özel karakter içermeli
   - Örnek: `MyStr0ng!P@ssw0rd#2024`
   - DigitalOcean Managed Database kullanıyorsanız, database oluştururken otomatik oluşturulan şifreyi kullanın

4. **Frontend Service Oluştur**
   - "Add Service" → "Web Service"
   - Name: `frontend`
   - Build Command: `cd frontend && npm ci && npm run build`
   - Run Command: `cd frontend && npm run start`
   - Environment Variables:
     ```
     NEXT_PUBLIC_SITE_URL=https://sepyap.com
     NEXT_PUBLIC_API_URL=https://api.sepyap.com/api
     NODE_ENV=production
     ```

5. **Managed PostgreSQL Database Ekle**
   - "Add Resource" → "Database"
   - PostgreSQL seç
   - Plan seç (Basic $15/ay başlangıç için yeterli)
   - Database name: `sepyap`
   - **Önemli:** Database oluşturulduktan sonra otomatik oluşturulan `DB_PASSWORD`'ı kopyalayın ve backend environment variables'a ekleyin

6. **Domain Bağlama**
   - Settings → Domains
   - Frontend için: `sepyap.com` ve `www.sepyap.com`
   - Backend için: `api.sepyap.com` (subdomain oluştur)

7. **SSL Sertifikaları**
   - Otomatik olarak Let's Encrypt ile oluşturulur

## Seçenek 2: DigitalOcean Droplet (Daha Kontrollü)

### Avantajlar:
- Tam kontrol
- Daha ucuz (başlangıç $6/ay)
- Docker Compose kullanabilirsin

### Adımlar:

1. **Droplet Oluştur**
   - Ubuntu 22.04 LTS
   - En az 2GB RAM (4GB önerilir)
   - Region: Amsterdam (Türkiye'ye yakın)

2. **SSH ile Bağlan**
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Docker ve Docker Compose Kur**
   ```bash
   # Docker kurulumu
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Docker Compose kurulumu
   apt-get update
   apt-get install docker-compose-plugin -y
   ```

4. **Projeyi Clone Et**
   ```bash
   cd /opt
   git clone https://github.com/theothegoth/sepyap.git
   cd sepyap
   ```

5. **Environment Variables Ayarla**
   ```bash
   nano .env
   ```
   ```env
   DB_USER=sepyap_admin
   DB_PASSWORD=<strong-password-min-16-chars>
   DB_NAME=sepyap
   ADMIN_SECRET=<your-secret-key>
   ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com
   NEXT_PUBLIC_SITE_URL=https://sepyap.com
   NEXT_PUBLIC_API_URL=https://api.sepyap.com/api
   ```
   
   **DB_PASSWORD Güvenlik Önerileri:**
   - En az 16 karakter uzunluğunda olmalı
   - Büyük harf (A-Z), küçük harf (a-z), sayı (0-9) ve özel karakter (!@#$%^&*) içermeli
   - Örnek güçlü şifre: `SePy@P2024!Db#P@ss`
   - **Asla** şifreyi Git'e commit etmeyin (`.env` zaten `.gitignore`'da)
   - Her ortam için farklı şifre kullanın (development, staging, production)

6. **Production Docker Compose Dosyası Oluştur**
   - `docker-compose.prod.yml` dosyasını kullan (aşağıda)

7. **Nginx Reverse Proxy Kur**
   ```bash
   apt-get install nginx certbot python3-certbot-nginx -y
   ```

8. **Nginx Configuration**
   - Frontend için: `/etc/nginx/sites-available/sepyap.com`
   - Backend için: `/etc/nginx/sites-available/api.sepyap.com`
   - SSL: `certbot --nginx -d sepyap.com -d www.sepyap.com`

9. **Docker Compose ile Başlat**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

## Domain Ayarları (Squarespace)

1. **Squarespace DNS Ayarları**
   - DigitalOcean'a git
   - Networking → Domains
   - `sepyap.com` ekle
   - DNS kayıtlarını al

2. **Squarespace'te DNS Kayıtlarını Güncelle**
   - Settings → Domains → sepyap.com → DNS Settings
   - A Record: `@` → DigitalOcean IP
   - CNAME: `www` → `sepyap.com`
   - CNAME: `api` → `api.sepyap.com` (backend için)

## Production Docker Compose

`docker-compose.prod.yml` dosyası oluşturulmalı (production için optimize edilmiş)

## Monitoring ve Backup

1. **Database Backup**
   - DigitalOcean Managed DB: Otomatik backup
   - Droplet: Cron job ile günlük backup

2. **Monitoring**
   - DigitalOcean Monitoring (ücretsiz)
   - Uptime monitoring ekle

3. **Logs**
   - `docker compose logs -f` ile logları izle
   - App Platform: Otomatik log toplama

## Güvenlik Checklist

- [ ] Strong database password
- [ ] ADMIN_SECRET güçlü secret key
- [ ] Firewall kuralları (sadece 80, 443 açık)
- [ ] Fail2ban kurulumu (Droplet için)
- [ ] Regular security updates
- [ ] SSL sertifikaları aktif
- [ ] CORS ayarları production domain'leriyle

## Maliyet Tahmini

### App Platform:
- Backend: ~$12/ay (Basic plan)
- Frontend: ~$12/ay (Basic plan)
- PostgreSQL: ~$15/ay (Basic plan)
- **Toplam: ~$39/ay**

### Droplet:
- Droplet (4GB): ~$24/ay
- Managed PostgreSQL: ~$15/ay (opsiyonel)
- **Toplam: ~$24-39/ay**

## Öneri

**Başlangıç için:** App Platform (kolay, otomatik scaling, SSL)
**Daha sonra:** Droplet'e geçiş (daha ucuz, daha fazla kontrol)

