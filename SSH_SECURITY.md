# SSH Güvenlik Rehberi - DigitalOcean Droplet

## SSH Key Authentication vs Password Authentication

### SSH Key Authentication (Önerilen) ✅

**Senin durumun:** Şifre girmeden bağlanıyorsun → **SSH Key Authentication kullanıyorsun!**

**Avantajları:**
- ✅ **Daha güvenli** - Private key olmadan bağlanılamaz
- ✅ **Brute force saldırılarına karşı korumalı** - Şifre denemeleri işe yaramaz
- ✅ **Kullanımı kolay** - Her seferinde şifre girmene gerek yok
- ✅ **Best practice** - Tüm production sunucularda önerilen yöntem

**Nasıl Çalışır:**
1. Bilgisayarında bir **private key** var (`~/.ssh/id_rsa`)
2. Sunucuda bir **public key** var (`~/.ssh/authorized_keys`)
3. Bağlanırken private key otomatik kullanılır
4. Sunucu public key ile eşleştirir ve bağlantıyı onaylar

### Password Authentication (Güvensiz) ❌

**Neden güvensiz:**
- ❌ Brute force saldırılarına açık
- ❌ Zayıf şifreler kolayca kırılabilir
- ❌ Her bağlantıda şifre girmen gerekir
- ❌ Şifre unutulabilir veya çalınabilir

## Mevcut Durumunu Kontrol Etme

### 1. SSH Key'lerini Kontrol Et

**Windows (PowerShell):**
```powershell
# Public key'i görüntüle
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub

# Private key var mı kontrol et
Test-Path $env:USERPROFILE\.ssh\id_rsa
```

**Linux/Mac:**
```bash
# Public key'i görüntüle
cat ~/.ssh/id_rsa.pub

# Private key var mı kontrol et
ls -la ~/.ssh/id_rsa
```

### 2. Sunucuda Authorized Keys Kontrol Et

Sunucuya bağlan ve kontrol et:
```bash
ssh root@178.62.202.102 "cat ~/.ssh/authorized_keys"
```

Eğer çıktı görüyorsan → SSH key authentication aktif!

### 3. SSH Config Dosyasını Kontrol Et

**Windows:**
```powershell
Get-Content $env:USERPROFILE\.ssh\config
```

**Linux/Mac:**
```bash
cat ~/.ssh/config
```

Eğer `178.62.202.102` için özel bir config varsa, orada key belirtilmiş olabilir.

## Güvenlik Önerileri

### 1. Password Authentication'ı Kapat (Önerilen)

Sunucuda password authentication'ı kapatarak sadece SSH key ile bağlanmayı zorunlu kıl:

```bash
# Sunucuya bağlan
ssh root@178.62.202.102

# SSH config dosyasını düzenle
sudo nano /etc/ssh/sshd_config

# Şu satırları bul ve değiştir:
PasswordAuthentication no
PubkeyAuthentication yes

# SSH servisini yeniden başlat
sudo systemctl restart sshd
```

**Önemli:** Bu değişikliği yapmadan önce SSH key'in çalıştığından emin ol! Yoksa kendini kilitlersin.

### 2. Root Login'i Kapat (Daha Güvenli)

Root kullanıcısı yerine normal bir kullanıcı oluştur:

```bash
# Sunucuya bağlan
ssh root@178.62.202.102

# Yeni kullanıcı oluştur
adduser sepyap
usermod -aG sudo sepyap

# SSH key'ini yeni kullanıcıya kopyala
mkdir -p /home/sepyap/.ssh
cp ~/.ssh/authorized_keys /home/sepyap/.ssh/
chown -R sepyap:sepyap /home/sepyap/.ssh
chmod 700 /home/sepyap/.ssh
chmod 600 /home/sepyap/.ssh/authorized_keys

# SSH config'i düzenle
sudo nano /etc/ssh/sshd_config

# Şu satırları değiştir:
PermitRootLogin no
AllowUsers sepyap

# SSH servisini yeniden başlat
sudo systemctl restart sshd
```

Artık şu şekilde bağlanacaksın:
```bash
ssh sepyap@178.62.202.102
```

### 3. SSH Port'unu Değiştir (Opsiyonel)

Varsayılan port 22'yi değiştirerek otomatik saldırıları azalt:

```bash
# SSH config'i düzenle
sudo nano /etc/ssh/sshd_config

# Port satırını bul ve değiştir:
Port 2222  # veya başka bir port

# SSH servisini yeniden başlat
sudo systemctl restart sshd

# Firewall'da yeni portu aç
sudo ufw allow 2222/tcp
```

Artık şu şekilde bağlanacaksın:
```bash
ssh -p 2222 sepyap@178.62.202.102
```

### 4. Fail2ban Kur (Brute Force Koruması)

Brute force saldırılarına karşı koruma:

```bash
# Fail2ban kur
sudo apt-get update
sudo apt-get install fail2ban -y

# SSH için fail2ban config
sudo nano /etc/fail2ban/jail.local
```

İçeriği:
```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

```bash
# Fail2ban'ı başlat
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 5. Firewall Kuralları (UFW)

Sadece gerekli portları aç:

```bash
# UFW kur (eğer yoksa)
sudo apt-get install ufw -y

# Varsayılan kuralları ayarla
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH portunu aç (önemli: önce bunu aç, yoksa kendini kilitlersin!)
sudo ufw allow 22/tcp

# HTTP ve HTTPS aç
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Backend API portunu aç (eğer direkt erişim istiyorsan)
sudo ufw allow 3005/tcp

# Firewall'ı aktif et
sudo ufw enable

# Durumu kontrol et
sudo ufw status
```

## Güvenlik Checklist

- [x] SSH Key Authentication aktif (şifre girmeden bağlanıyorsun)
- [ ] Password Authentication kapalı
- [ ] Root login kapalı (normal kullanıcı kullan)
- [ ] Fail2ban kurulu ve aktif
- [ ] Firewall (UFW) aktif ve sadece gerekli portlar açık
- [ ] SSH port değiştirilmiş (opsiyonel)
- [ ] Düzenli güvenlik güncellemeleri yapılıyor

## Sonuç

**Senin durumun:** ✅ **Güvenli!**

Şifre girmeden bağlanman **güvenlik açığı değil**, tam tersine **daha güvenli bir yöntem**. SSH key authentication kullanıyorsun ve bu best practice.

**Yapman gerekenler:**
1. Password authentication'ı kapat (sadece key ile bağlanmayı zorunlu kıl)
2. Root login'i kapat (normal kullanıcı oluştur)
3. Fail2ban kur (brute force koruması)
4. Firewall aktif et (sadece gerekli portlar açık)

Bu adımları uyguladıktan sonra sunucun çok daha güvenli olacak!

