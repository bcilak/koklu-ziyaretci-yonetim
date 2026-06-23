# Köklü Zeytincilik Ziyaretçi Yönetim Sistemi

React, Node.js/Express ve PostgreSQL tabanlı merkezi ziyaretçi yönetim sistemi.

## Özellikler

- Tablet kiosk ziyaretçi akışı ve dijital imza
- Yetkili kimlik/kart kontrolü ve alan seçimi
- PostgreSQL üzerinde merkezi kayıt ve ayar saklama
- HttpOnly oturum çereziyle sunucu tarafı PIN doğrulaması
- Türkçe/İngilizce arayüz ve otomatik çeviri
- Günlük, haftalık, aylık ve tarih aralıklı raporlar
- Excel uyumlu UTF-16LE CSV ve PDF/yazdırma çıktısı

## Gereksinimler

- Node.js 20 veya üzeri önerilir. Minimum desteklenen sürüm Node.js 18.18'dir.
- PostgreSQL 14 veya üzeri
- HTTPS kullanan domain

## Yerel Kurulum

```bash
npm install
cp .env.example .env
npm run build
npm run db:init
npm start
```

Uygulama varsayılan olarak `http://127.0.0.1:3000` adresinde çalışır.

Geliştirme sırasında API ve Vite'ı birlikte çalıştırmak için:

```bash
npm run dev
```

## PostgreSQL Kurulumu

PostgreSQL terminalini açın:

```bash
sudo -u postgres psql
```

Veritabanı kullanıcısı ve veritabanını oluşturun:

```sql
CREATE USER kokluziyaret WITH PASSWORD 'BURAYA_COK_GUCLU_BIR_SIFRE';
CREATE DATABASE kokluziyaret OWNER kokluziyaret;
GRANT ALL PRIVILEGES ON DATABASE kokluziyaret TO kokluziyaret;
\q
```

`.env` dosyasını düzenleyin:

```env
DATABASE_URL=postgresql://kokluziyaret:URL_ENCODE_EDILMIS_SIFRE@127.0.0.1:5432/kokluziyaret
DATABASE_SSL=false
DATABASE_POOL_SIZE=10
STAFF_PIN=GUCLU_PERSONEL_PINI
SESSION_SECRET=EN_AZ_32_KARAKTER_UZUN_RASTGELE_BIR_DEGER
COOKIE_SECURE=true
TRUST_PROXY=1
PORT=3000
NODE_ENV=production
```

Şemayı kurun:

```bash
npm run db:init
```

## Üretim Çalıştırma

```bash
npm install
npm run build
npm run db:init
npm start
```

Kalıcı süreç için PM2:

```bash
npm install -g pm2
pm2 start server/index.js --name koklu-ziyaretci
pm2 save
pm2 startup
```

`pm2 startup` komutunun ekrana yazdığı komutu da çalıştırın.

## Nginx Reverse Proxy

Domain'i Node uygulamasına yönlendirin:

```nginx
server {
    listen 443 ssl http2;
    server_name kokluzeytincilik.altikodtech.com.tr;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Artık `dist` içeriğini `public_html` köküne kopyalamayın. Node sunucusu hem API'yi hem frontend dosyalarını sunar.

## Güncelleme

```bash
git pull
npm install
npm run build
npm run db:init
pm2 restart koklu-ziyaretci
```

Build sonrasında domainin güncel JavaScript paketini sunduğunu doğrulayın:

```bash
grep -o '/assets/[^"]*' dist/index.html
curl -s https://DOMAIN/ | grep -o '/assets/[^"]*'
```

İki çıktının aynı olması gerekir.

## Sağlık Kontrolü

```bash
curl https://DOMAIN/api/health
```

Beklenen yanıt:

```json
{"ok":true,"storage":"postgresql"}
```

Farklı cihazlarda farklı kayıtlar görünüyorsa domainin hâlâ eski statik sürümü
sunmadığını bu yanıtla doğrulayın. `404`, HTML veya `storage` alanı olmayan bir
yanıt reverse proxy ya da tarayıcı önbelleğinin güncel olmadığını gösterir.

## Yedekleme

```bash
pg_dump -U kokluziyaret -h 127.0.0.1 kokluziyaret > kokluziyaret-backup.sql
```

Veritabanı şifresini, `.env` dosyasını ve yedekleri GitHub'a göndermeyin.
