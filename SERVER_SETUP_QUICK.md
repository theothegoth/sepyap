# Server Kurulum Hızlı Rehber

## 1. Projeyi Server'a Kopyala

### Seçenek 1: Git ile (Önerilen)

```bash
# Server'a bağlan
ssh root@178.62.202.102

# Proje klasörüne git
cd /opt

# Projeyi clone et
git clone https://github.com/theothegoth/sepyap.git

# Proje klasörüne gir
cd sepyap
```

### Seçenek 2: Manuel Kopyalama

Eğer Git kullanmak istemiyorsan, dosyaları manuel olarak kopyalayabilirsin:

```bash
# Local bilgisayarında (Windows PowerShell)
cd C:\Users\pc\GroceryMatcher

# SCP ile kopyala
scp -r * root@178.62.202.102:/opt/sepyap/
```

## 2. Dosyaların Varlığını Kontrol Et

```bash
# Server'da
cd /opt/sepyap

# Dosyaları listele
ls -la

# docker-compose.prod.yml var mı kontrol et
ls -la docker-compose.prod.yml

# Eğer yoksa, proje klasöründe olduğundan emin ol
pwd
# Çıktı: /opt/sepyap olmalı
```

## 3. .env Dosyasını Oluştur

```bash
# .env dosyasını oluştur
nano .env
```

İçeriği yapıştır:
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

Kaydet: `Ctrl+X`, `Y`, `Enter`

```bash
# Dosya izinlerini ayarla
chmod 600 .env
```

## 4. Docker Compose ile Başlat

```bash
# Proje klasöründe olduğundan emin ol
cd /opt/sepyap

# Dosyanın var olduğunu kontrol et
ls -la docker-compose.prod.yml

# Build ve başlat
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Logları kontrol et
docker compose -f docker-compose.prod.yml logs -f
```

## Troubleshooting

### "no such file or directory" Hatası

**Sebep:** Yanlış dizindesin veya dosya yok.

**Çözüm:**
```bash
# Hangi dizindesin kontrol et
pwd

# Proje klasörüne git
cd /opt/sepyap

# Dosyanın var olduğunu kontrol et
ls -la docker-compose.prod.yml

# Eğer yoksa, projeyi clone et
cd /opt
git clone https://github.com/theothegoth/sepyap.git
cd sepyap
```

### "docker compose" Komutu Bulunamıyor

```bash
# Docker Compose plugin kurulumu
apt-get update
apt-get install docker-compose-plugin -y

# Veya eski versiyon
apt-get install docker-compose -y
```

### Dosyalar Eksik

Eğer bazı dosyalar eksikse, GitHub'dan tekrar clone et:

```bash
cd /opt
rm -rf sepyap  # Eski klasörü sil (dikkatli!)
git clone https://github.com/theothegoth/sepyap.git
cd sepyap
```

## Hızlı Kontrol Listesi

- [ ] `/opt/sepyap` klasörü var mı?
- [ ] `docker-compose.prod.yml` dosyası var mı?
- [ ] `.env` dosyası oluşturuldu mu?
- [ ] Docker ve Docker Compose kurulu mu?
- [ ] Proje klasöründe (`/opt/sepyap`) misin?

## Özet Komutlar

```bash
# 1. Projeyi clone et
cd /opt
git clone https://github.com/theothegoth/sepyap.git
cd sepyap

# 2. .env dosyasını oluştur
nano .env
# (İçeriği yapıştır ve kaydet)

# 3. Build ve başlat
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 4. Kontrol et
docker compose -f docker-compose.prod.yml ps
```

