# Frontend Build Hata Giderme

## Detaylı Hata Mesajını Görme

### Yöntem 1: Tüm build loglarını kaydet

```bash
# Build loglarını dosyaya kaydet
docker compose -f docker-compose.prod.yml build frontend --no-cache 2>&1 | tee build.log

# Son 100 satırı gör
tail -100 build.log

# Hata satırlarını filtrele
grep -i "error\|failed\|fail" build.log
```

### Yöntem 2: Sadece hata satırlarını gör

```bash
docker compose -f docker-compose.prod.yml build frontend --no-cache 2>&1 | grep -B 5 -A 10 -i "error\|failed\|fail"
```

### Yöntem 3: Build'in nerede durduğunu gör

```bash
docker compose -f docker-compose.prod.yml build frontend --no-cache 2>&1 | tail -50
```

## Yaygın Hatalar ve Çözümleri

### Hata 1: "NEXT_PUBLIC_* variables are undefined"

**Çözüm:** Dockerfile.prod'da ARG ekle (yukarıda güncellendi)

### Hata 2: TypeScript/ESLint hataları

**Çözüm:** Build sırasında lint'i atla:

```dockerfile
# Dockerfile.prod'da build komutunu değiştir
RUN npm run build || npm run build -- --no-lint
```

### Hata 3: "Module not found" veya dependency hataları

**Çözüm:** node_modules'i temizle ve yeniden yükle:

```bash
# Container içinde test et
docker run --rm -it -v $(pwd)/frontend:/app -w /app node:20-alpine sh
npm ci
npm run build
```

### Hata 4: "Cannot find module" veya path hataları

**Çözüm:** next.config.js'de path mapping kontrol et

## Hızlı Test: Build'i Container Dışında Dene

```bash
# Frontend klasörüne git
cd frontend

# Node.js kur (eğer yoksa)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Dependencies yükle
npm ci

# Build dene
npm run build

# Hata varsa burada görürsün
```

## Geçici Çözüm: Lint'i Devre Dışı Bırak

Eğer ESLint hataları varsa, `package.json`'da:

```json
{
  "scripts": {
    "build": "next build",
    "build:skip-lint": "next build --no-lint"
  }
}
```

Sonra Dockerfile.prod'da:
```dockerfile
RUN npm run build:skip-lint
```

## En Yaygın Çözüm: Dockerfile.prod Güncelle

Server'da `frontend/Dockerfile.prod` dosyasını güncelle (yukarıdaki güncellenmiş versiyonu kullan).

