# DGK · Medya, Görev ve İş

Next.js uygulaması: **Medya**, **Görev**, **İş** ve **Finans** listelerini yönetir; veri **Google Sheets** üzerinde tutulur. [Vercel](https://vercel.com) üzerinde deploy için uygundur.

**Yerel kurulum (Google Cloud, Service Account, `.env.local`):** adım adım rehber için [`docs/LOCAL-GOOGLE-SHEETS-TR.md`](./docs/LOCAL-GOOGLE-SHEETS-TR.md) dosyasına bakın. Uygulama içinden bağlantı özeti ve şablon için `/ayarlar` sayfasını kullanabilirsiniz.

## Gereksinimler

- Google Cloud projesinde **Google Sheets API** etkin.
- **Service Account** ve JSON anahtarı.
- Hedef e-tabloyu Service Account e-postasına **Düzenleyici** olarak paylaşın (`…@…iam.gserviceaccount.com`).

## E-tablo düzeni

Tek bir spreadsheet içinde **Medya**, **Görevler** ve **İş** sekmeleri zorunludur. **Finans** sekmesi uygulamadaki Finans menüsü için gereklidir (yoksa `/api/finans` Sheets hatası verir). İlk satır başlıklar tam olarak şu sırada olmalıdır:

**Sekme `Medya` (veya `SHEET_MEDIA_NAME`):**

`Başlık` | `Kategori` | `Durum` | `Tür` | `Link` | `Tarih` | `Notlar` | `Puan`

**Sekme `Görevler` (veya `SHEET_TASKS_NAME`):**

`Tarih` | `Görevler` | `Kategori` | `Öncelik` | `Son Durum` | `Bitiş Tarihi` | `İlerleme` | `Dosya` | `Notlar`

**Sekme `İş` (veya `SHEET_WORK_NAME`):**

`Tarih` | `Şirket` | `İş Türü` | `Başlık` | `Durum` | `Tutar` | `Para Birimi` | `Bitiş Tarihi` | `Link` | `Notlar` | `Müşteri İsmi` | `İletişim` | `Süre (ay)` | `Aylık tutar` | `Aylık ödemeler` (virgülle ödenen ay sıraları, örn. `1,2`)

- **Şirket:** Evrentek veya Vih Soft Inc.
- **İş Türü:** Yazılım, IT.
- **Durum:** Beklemede, Başlandı, Revizyonda, Tamamlandı, Ödeme Bekleniyor, Ödendi.
- **Süre / aylık:** Örn. 3 ay × 1000 TL/ay sözleşme için `Süre (ay)` ve `Aylık tutar` doldurun; toplam (∑) hesaplanır. Tabloda veya düzenlemede her ay için **ödendi** işareti verebilirsiniz; `Aylık ödemeler` sütununda kayıt tutulur (örn. `1,3` = 1. ve 3. ay ödendi). Tek seferlik işlerde yalnızca `Tutar` kullanılabilir.

Tarihler uygulamada `gg.aa.yyyy` metin formatında tutulabilir. İlerleme sütununa `0`–`100` veya `75%` gibi değerler yazılabilir.

**Sekme `Finans` (veya `SHEET_FINANS_NAME`):**

Aynı tabloda `tip` sütunu ile **Gelir**, **Gider** ve **Fatura** satırları birlikte tutulur; uygulama alt menülerle filtreler.

| Sütun | Başlık (örnek) |
|-------|----------------|
| A | `tip` (Gelir \| Gider \| Fatura) |
| B | `tarih` |
| C | `tutar` |
| D | `paraBirimi` (TRY, USD, …) |
| E | `baslik` |
| F | `kategori` |
| G | `durum` |
| H | `vadeTarihi` |
| I | `belgeNo` |
| J | `isSheetRow` (isteğe bağlı İş satır no) |
| K | `link` |
| L | `notlar` |
| M | `ek` |

## Ortam değişkenleri

[`.env.example`](./.env.example) dosyasını `.env.local` olarak kopyalayın ve doldurun.

| Değişken | Açıklama |
|----------|----------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | İndirdiğiniz Service Account JSON’unun tam metni **veya** aynı JSON’un Base64 kodu (Vercel’de satır sonu sorunlarını önler). |
| `GOOGLE_SPREADSHEET_ID` | E-tablo URL’sindeki kimlik (`/d/<ID>/edit`). |
| `SHEET_MEDIA_NAME` | İsteğe bağlı; varsayılan `Medya`. |
| `SHEET_TASKS_NAME` | İsteğe bağlı; varsayılan `Görevler`. |
| `SHEET_WORK_NAME` | İsteğe bağlı; varsayılan `İş`. |
| `SHEET_FINANS_NAME` | İsteğe bağlı; varsayılan `Finans`. |

**Vercel:** Project → Settings → Environment Variables ile aynı isimleri Production (ve gerekiyorsa Preview) için ekleyin.

## Geliştirme

```bash
npm install
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde açılır; ana sayfa `/medya` yönlendirir.

## Build

```bash
npm run build
npm start
```

## API

| Yöntem | Yol | Açıklama |
|--------|-----|----------|
| `GET` | `/api/medya` | Medya satırları (`row` alanı Google Sheets satır numarası, ≥1). Başlık satırı varsa A1 = Başlık. |
| `POST` | `/api/medya` | Yeni satır (JSON alanları: `baslik`, `kategori`, `durum`, `tur`, `link`, `tarih`, `notlar`, `puan`). |
| `PATCH` | `/api/medya` | Güncelleme: `row` + aynı alanlar. |
| `DELETE` | `/api/medya` | Gövde: `{ "row": number }`. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/gorevler` | Görevler; alanlar: `tarih`, `gorevler`, `kategori`, `oncelik`, `sonDurum`, `bitisTarihi`, `ilerleme`, `dosya`, `notlar`. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/is` | İş kayıtları; alanlar: `tarih`, `sirket`, `isTuru`, `baslik`, `durum`, `tutar`, `paraBirimi`, `bitisTarihi`, `link`, `notlar`, `musteriIsmi`, `iletisim`, `sureAy`, `aylikTutar`, `aylikOdemeAylar` (örn. `1,2`). |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/finans` | Finans; alanlar: `tip`, `tarih`, `tutar`, `paraBirimi`, `baslik`, `kategori`, `durum`, `vadeTarihi`, `belgeNo`, `isSheetRow`, `link`, `notlar`, `ek`. |
| `GET` | `/api/settings` | Yerel özet: `hasSpreadsheetId`, `hasServiceAccountJson`, efektif `sheet*` adları (gizli değer yok). |

Silme ve güncelleme, Sheet’teki **gerçek satır numarasına** dayanır; satırlar arası ekleme yapıldıysa yenileme sonrası güncel numarayı kullanın.
# dgk
