# Tekne Turu Yönetim Sistemi

Tekne turu işletmeleri için dijital kayıt, check-in ve müşteri sayfası yönetim sistemi.

## Proje Yapısı

```
src/
├── TekneTuru.API/       # ASP.NET Core 9 Web API (backend)
├── TekneTuru.Core/      # Ortak entity ve arayüzler
└── frontend/
    ├── admin/           # Admin panel (React + Vite) — port 5173
    ├── desk/            # Kayıt ekranı (tablet) — port 5174
    ├── checkin/         # Check-in ekranı — port 5175
    └── landing/         # Müşteri landing page — port 3000
```

## Gereksinimler

- **.NET 9 SDK** — [indir](https://dotnet.microsoft.com/download)
- **Node.js 18+** ve **npm** — frontend için
- **PostgreSQL** — veritabanı (Faz 1’de kullanılacak)

## Çalıştırma

### Backend (API)

Proje kökünden (Tekne Turu Yönetim Sistemi klasöründen):

```bash
dotnet run --project src/TekneTuru.API
```

veya önce API klasörüne girip:

```bash
cd src/TekneTuru.API
dotnet run
```

API varsayılan olarak `http://localhost:5244` üzerinde çalışır. Sağlık kontrolü: `http://localhost:5244/health` veya `http://localhost:5244/api/health`.

**Giriş (Admin panel):** PostgreSQL çalışıyorsa ilk çalıştırmada `tekneturu` veritabanı ve varsayılan kullanıcı otomatik oluşturulur (createdb gerekmez). Varsayılan admin hesabı:
- E-posta: `nusretblog@gmail.com`
- Şifre: `Sene69..`
PostgreSQL kurulu değilse veya şifre kullanıyorsanız `appsettings.json` içindeki `ConnectionStrings:DefaultConnection` değerini güncelleyin.

### Frontend (Admin)

```bash
cd src/frontend/admin
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır. Giriş ekranı ve dashboard iskeleti hazır; API proxy ile `http://localhost:5244` kullanılır.

### Diğer frontend uygulamaları

- **Desk:** `cd src/frontend/desk && npm install && npm run dev` → http://localhost:5174 (acenta alanı yok; kayıtlarda boş)  
- **Desk Acenta:** `cd src/frontend/desk-acenta && npm install && npm run dev` → http://localhost:5176 (Acenta Adı alanı ile kayıt)  
- **Check-in:** `cd src/frontend/checkin && npm install && npm run dev` → http://localhost:5175 (giriş: Admin veya Çalışan hesabı)  
- **Landing:** `cd src/frontend/landing && npm install && npm run dev` → http://localhost:3000 (ana sayfa: token ile tur bilgisi; tur sonu teşekkür: `/thanks`)  

## Yapılandırma

- **API:** `src/TekneTuru.API/appsettings.json` — `ConnectionStrings:DefaultConnection` ve `Cors:AllowedOrigins` buradan düzenlenir.
- Yerel geliştirme: `src/TekneTuru.API/appsettings.Development.example.json` dosyasını `appsettings.Development.json` olarak kopyalayın ve NetGSM/DB bilgilerinizi girin; `appsettings.Development.json` repoya eklenmez (.gitignore).
- **SMS (NetGSM):** Gerçek SMS için `NetGsm:Usercode`, `NetGsm:Password` ve `NetGsm:MsgHeader` doldurun. Üçü de doluysa NetGSM kullanılır; boşsa sadece log modu çalışır.
  - **Sunucuda (production):** Şifreyi repoya koymayın; ortam değişkeni verin. ASP.NET Core `NetGsm` bölümünü env’den okur. Tanımlanacak değişkenler:
    - `NetGsm__Usercode` = abone numarası
    - `NetGsm__Password` = API şifresi
    - `NetGsm__MsgHeader` = onaylı SMS başlığı  
    (Çift alt çizgi `__` bölüm:anahtar karşılığıdır.) Docker / Easypanel / VPS’te bu üç değişkeni eklemeniz yeterli.
- **Kısa linkler:** Admin → Ayarlar’da **ShortLinkBaseUrl** (örn. `https://firma.com`) tanımlıysa, rezervasyon SMS’indeki link bu domain üzerinden kısa formatla gider: `https://firma.com/t/xK9mP2`. API’de `GET /t/{code}` müşteriye özel landing’e yönlendirir; `/t/thanks` teşekkür sayfasına gider. Tıklamalar `ShortLinkClick` tablosunda kaydedilir.

## Geliştirme Fazları (PRD)

1. **Faz 1 – Temel altyapı:** Proje yapısı, API, PostgreSQL, JWT, Admin giriş/dashboard.  
2. **Faz 2 – Desk kayıt:** Müşteri formu, çoklu kişi, KVKK, kayıt, teşekkür ekranı.  
3. **Faz 3 – Check-in:** Yolcu listesi, tarih/arama, check-in/geri al, toplu check-in, 30 sn polling.  
4. **Faz 4 – Landing page:** Token ile erişim, TR/EN dil, hero, tur bilgisi, duraklar, menü/kurallar PDF, sosyal linkler.  
5. **Faz 5 – Admin panel:** Dashboard, Müşteriler, Sahil Güvenlik listesi, Tur bilgisi, Duraklar, Ayarlar.  
6. **Faz 6 – SMS entegrasyonu:** Sağlayıcıdan bağımsız arayüz (ISmsSender), LogOnly gönderici (test), rezervasyon sonrası onay SMS’i (SmsConsent olan müşterilere), şablonlar (booking-confirmation, check-in-reminder), Admin’de SMS şablonları ve gönderim geçmişi. NetGSM/Turkcell eklenebilir.  
7. **Faz 7 – PWA ve rötuş:** Tüm frontend uygulamaları (Admin, Desk, Check-in, Landing) PWA olarak yapılandırıldı: Web App Manifest (isim, standalone görünüm, theme-color), service worker ile otomatik güncelleme (`vite-plugin-pwa`). Mobil/tablet için `theme-color`, `viewport-fit=cover` ve “Add to Home Screen” uyumu eklendi. İsteğe bağlı: `public/icon-192.png` ve `public/icon-512.png` ekleyerek “Ana ekrana ekle” ikonunu özelleştirebilirsiniz.  

8. **Bilet modülü:** Admin’de Bilet Kes ile bilet no (6 hane), ad-soyad, telefon, tur tarihi, kişi sayısı, otel, not, servis, ödeme tipi ve bilet durumu girilir; Bilet Kes butonuna basılınca şablon üzerine yazılı JPG oluşturulur ve Biletler sekmesinde kayıt altına alınır. Biletler listesinde filtre, İndir, Paylaş ve Düzenle vardır. Bilet şablonu: `src/TekneTuru.API/Templates/bilet.jpg` olmalıdır; `src/frontend/admin/bilet.jpg` dosyasını bu klasöre `bilet.jpg` adıyla kopyalayın.

## Push sonrası hangi servisi deploy etmeli?

Değişen dosyalara göre deploy edilecek servis:

| Değişen yer | Deploy et |
|-------------|-----------|
| `src/TekneTuru.API/`, `src/TekneTuru.Core/` | **API** |
| `src/frontend/admin/` | **Admin** |
| `src/frontend/desk/` | **Desk** (kayıt ekranı) |
| `src/frontend/desk-acenta/` | **Acenta** (acenta kayıt ekranı) |
| `src/frontend/checkin/` | **Check-in** |
| `src/frontend/landing/` | **Landing** |

- **Sadece API** değiştiyse → API’yi deploy et (DB migration da API ile çalışır).
- **Birden fazla frontend** değiştiyse → Değişen her frontend servisini deploy et.
- **Hem API hem frontend** değiştiyse → Önce API, sonra ilgili frontend’leri deploy et.

Easypanel’de tek bir “Frontend” servisi kullanıyorsanız (tüm uygulamalar tek container’da), herhangi bir frontend klasörü değişince **Frontend** servisini bir kez deploy etmeniz yeterlidir.

## Lisans

Özel proje.
