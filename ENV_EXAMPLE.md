# Environment Variables Örnekleri

## Production Environment Variables

### Database Configuration
```env
DB_USER=sepyap_admin
DB_PASSWORD=SePy@P2024!Db#P@ss
DB_NAME=sepyap
DB_HOST=your-db-host.digitalocean.com
```

**DB_PASSWORD Güvenlik Kuralları:**
- ✅ En az 16 karakter
- ✅ Büyük harf (A-Z)
- ✅ Küçük harf (a-z)
- ✅ Sayı (0-9)
- ✅ Özel karakter (!@#$%^&*)
- ❌ Kişisel bilgiler kullanmayın
- ❌ Sözlükteki kelimeler kullanmayın
- ❌ Git'e commit etmeyin

**Şifre Oluşturma Önerileri:**
1. DigitalOcean Managed Database kullanıyorsanız, otomatik oluşturulan şifreyi kullanın
2. Manuel oluşturuyorsanız, şifre yöneticisi kullanın (1Password, LastPass, Bitwarden)
3. Her ortam için farklı şifre kullanın (development, staging, production)

### Admin Secret Key
```env
ADMIN_SECRET=H9vpL3qA!t2Zr8W
```

**ADMIN_SECRET Güvenlik:**
- En az 15 karakter
- Rastgele karakterler kullanın
- Production'da mutlaka değiştirin
- Güvenli bir yerde saklayın (şifre yöneticisi)

### CORS Configuration
```env
ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com
```

**Not:** Production'da sadece kendi domain'lerinizi ekleyin. Development için localhost ekleyebilirsiniz.

### Frontend Configuration
```env
NEXT_PUBLIC_SITE_URL=https://sepyap.com
NEXT_PUBLIC_API_URL=https://api.sepyap.com/api
```

**Not:** `NEXT_PUBLIC_` prefix'i olan değişkenler client-side'da görünür. Hassas bilgi eklemeyin.

## Development Environment Variables

```env
DB_USER=admin
DB_PASSWORD=dev_password_123
DB_NAME=sepyap_dev
DB_HOST=localhost
ADMIN_SECRET=dev-secret-key
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://127.0.0.1:3005/api
```

## DigitalOcean Managed Database

DigitalOcean Managed Database kullanıyorsanız:

1. Database oluşturulduktan sonra **Connection Details** bölümünden:
   - `Host`: `your-db-host.db.ondigitalocean.com`
   - `Port`: `25060` (genellikle)
   - `Database`: `sepyap`
   - `User`: `doadmin` (varsayılan)
   - `Password`: Otomatik oluşturulan şifre (kopyalayın!)

2. Bu bilgileri `.env` dosyasına ekleyin:
```env
DB_HOST=your-db-host.db.ondigitalocean.com
DB_USER=doadmin
DB_PASSWORD=<otomatik-oluşturulan-şifre>
DB_NAME=sepyap
```

**Önemli:** Managed Database şifresi sadece bir kez gösterilir. Mutlaka güvenli bir yerde saklayın!

