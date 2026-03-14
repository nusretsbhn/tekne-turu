# Easypanel – Tek Domain (vikingoludeniz.xyz) Kurulumu

## URL Yapısı

| Path | Uygulama |
|------|----------|
| `/` | Desk (kayıt ekranı) |
| `/admin/` | Admin panel |
| `/checkin/` | Check-in ekranı |
| `/acenta/` | Acenta kayıt ekranı |
| `/landing/` | Müşteri landing (?token=xxx) |
| `/thanks` | Teşekkür sayfası (→ /landing/thanks) |
| `/api/*` | API |
| `/t/*` | Kısa link (API redirect) |
| `/uploads/*` | Yüklenen dosyalar (API) |

## 1. Frontend Servisi (tek container)

- **Kaynak**: Github → `nusretsbhn/tekne-turu`, branch `main`
- **Yapı Yolu**: `/`
- **Yapı**: Dockerfile
- **Dosya**: `Dockerfile.frontend`
- **Port**: 80
- **Domain**: `vikingoludeniz.xyz` – Path: `/` (veya boş)

## 2. API Servisi (mevcut)

- **Domain**: `vikingoludeniz.xyz` – Path: `/api`
- **Domain**: `vikingoludeniz.xyz` – Path: `/t`
- **Domain**: `vikingoludeniz.xyz` – Path: `/uploads`

Her path için ayrı “Alan Adı” ekle; hedef servis: `tekneturu-api`, port: 5244.

## 3. Path Sırası (önemli)

Easypanel’de path kuralları **daha spesifik olan önce** çalışmalı:

1. `/api` → API
2. `/t` → API
3. `/uploads` → API
4. `/` → Frontend (geri kalan her şey)

## 4. Admin Ayarları (ilk girişten sonra)

Admin → **Ayarlar** bölümünde:

- **LandingBaseUrl**: `https://vikingoludeniz.xyz/landing`
- **ThanksPageUrl**: `https://vikingoludeniz.xyz/landing/thanks` (veya `https://vikingoludeniz.xyz/thanks`)
- **ShortLinkBaseUrl**: `https://vikingoludeniz.xyz` (kısa linkler `/t/xxx` formatında)

Bu ayarlar SMS şablonlarındaki `{LandingUrl}` ve `{ThanksPageUrl}` için kullanılır.

## 5. Acenta linki – query string korunmalı

Acenta kayıt sayfası **`/acenta/?agency=KOD`** linki ile açılınca acenta adı otomatik dolar. Eğer sunucu `/acenta` isteğini `/acenta/`e yönlendiriyorsa, **query string korunmalı**; yoksa `?agency=xxx` kaybolur ve acenta adı dolmaz.

**Nginx** örneği (slash eklerken query’yi korumak):

```nginx
# /acenta?agency=xxx → /acenta/?agency=xxx
location = /acenta {
    return 301 /acenta/$is_args$args;
}
```

**Easypanel / reverse proxy** kullanıyorsanız, yönlendirme kuralında query string’in taşınmasına izin verin. Mümkünse acenta linkini her zaman **slash’lı** verin: `https://vikingoludeniz.xyz/acenta/?agency=5vz76z` (Admin’deki link bu formatta üretilir).
