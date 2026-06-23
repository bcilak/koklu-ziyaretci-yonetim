# Köklü Zeytincilik Ziyaretçi Yönetim Sistemi

Tablet kiosk üzerinden ziyaretçi beyanı, dijital imza, yetkili kimlik/kart kontrolü, alan seçimi, günlük rapor ve CSV/PDF çıktı akışlarını içerir.

## Özellikler

- Tablet/tarayıcı dilini otomatik algılayan Türkçe ve İngilizce ziyaretçi akışı
- Admin panelinden Evet/Hayır sorusu ekleme, düzenleme, pasife alma ve silme
- Türkçe girilen soru ve onay metinlerini otomatik İngilizceye çevirme
- Başlangıç/bitiş tarihine göre rapor filtreleme
- Bugün, bu hafta ve bu ay için toplam giriş/çıkış özetleri
- Bugün / Bu Hafta / Bu Ay hızlı rapor filtreleri
- Filtrelenen kayıtları Windows Excel uyumlu UTF-16LE CSV olarak indirme
- Yetkili ekranında planlanan çıkış için saat seçici
- Kayıt bazlı PDF/yazdırma çıktısı

## Kurulum

```bash
npm install
```

`.env.example` dosyasını `.env` olarak kopyalayın ve yetkili/admin PIN değerini değiştirin:

```bash
VITE_STAFF_PIN=1234
```

## Geliştirme

```bash
npm run dev
```

## Üretim Build

```bash
npm run build
```

Build çıktısı `dist/` klasörüne oluşur. Bu klasör statik dosya olarak Nginx, Apache, IIS veya herhangi bir statik hosting servisine yüklenebilir.

Vercel ve Netlify için gerekli build ayarları proje içinde hazırdır.

## Sunucuda Önizleme

```bash
npm run preview
```

## Teslim Notları

- Kayıtlar tarayıcı cihazında `localStorage` içinde saklanır. Tek tablet/kiosk kullanımında uygundur.
- Birden fazla tabletin aynı kayıt havuzunu paylaşması istenirse backend ve merkezi veritabanı eklenmelidir.
- Statik uygulamadaki personel PIN'i temel kiosk erişim kontrolüdür; internet üzerinden güçlü kimlik doğrulama yerine geçmez. Güçlü yetkilendirme için backend gerekir.
- PDF butonu tarayıcı yazdırma penceresini açar; kullanıcı “PDF olarak kaydet” seçebilir.
- CSV butonu günlük kayıtları Excel uyumlu CSV olarak indirir.
- Köklü Zeytincilik logosu `public/koklu-logo.png` dosyasındadır.
