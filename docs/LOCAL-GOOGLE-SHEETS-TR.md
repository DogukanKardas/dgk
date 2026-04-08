# Yerel geliştirme: Google Sheets (Drive) bağlantısı

Bu doküman, DGK uygulamasını **bilgisayarınızda** (`npm run dev`) çalıştırırken Google e-tablonu **Service Account** ile nasıl bağlayacağınızı adım adım anlatır. Tarayıcıya veya uygulamaya Service Account **şifresini yüklemeniz gerekmez**; tüm gizli bilgiler yalnızca `.env.local` dosyasında (veya Vercel ortam değişkenlerinde) tutulur.

## Önkoşullar

- Bir **Google hesabı** ( kişisel veya Workspace ).
- Google Sheets’te oluşturduğunuz veya kullanacağınız **bir spreadsheet** (e-tablo). Bu tabloda üç sekme ve doğru başlık sırası olmalıdır (aşağıdaki “E-tablo yapısı”).
- Bilgisayarınızda proje kökünde `.env.local` oluşturma imkânı.

## Adım 1: Google Cloud projesi

1. Tarayıcıda [Google Cloud Console](https://console.cloud.google.com/) açın.
2. Üstteki proje seçiciden **Yeni proje** oluşturun veya mevcut bir projeyi seçin.
3. Proje seçili iken devam edin.

## Adım 2: Google Sheets API’yi etkinleştirin

1. Sol menüden **API’ler ve Hizmetler** → **Kitaplık** (Library) seçin.
2. Arama kutusuna **Google Sheets API** yazın.
3. **Google Sheets API** → **Etkinleştir** (Enable).

> Not: Bu uygulama Drive API’ye doğrudan ihtiyaç duymaz; veri okuma/yazma **Sheets API** üzerinden yapılır.

## Adım 3: Service Account oluşturma

1. Sol menüden **IAM ve Yönetici** → **Hizmet Hesapları** (Service accounts) açın.
2. **Hizmet hesabı oluştur** → bir **ad** verin (ör. `dgk-sheets`) → **Oluştur ve devam et**.
3. **Bu hizmet hesabına projede rol ver** adımında bu proje için zorunlu bir rol yoktur; erişim, e-tabloyu **paylaşarak** verilir. İsterseniz **Devam** → **Bitti** ile geçebilirsiniz.

## Adım 4: JSON anahtarı indirme

1. Oluşturduğunuz hizmet hesabına tıklayın.
2. **Anahtarlar** (Keys) sekmesi → **Anahtar ekle** → **Yeni anahtar oluştur** → biçim **JSON** → **Oluştur**.
3. İnen `.json` dosikasını **güvenli** bir yerde saklayın. Bu dosya, sunucunun Sheets’e adına erişmesini sağlar; **paylaşmayın**, **git’e eklemeyin**.

> Uyarı: Anahtarı sadece gerektiğinde oluşturun; sızmış anahtarları Google Cloud’da iptal edip yenisini üretin.

## Adım 5: Service Account e-postası ile e-tabloyu paylaşma

1. İndirdiğiniz JSON dosyasını bir metin düzenleyicide açın.
2. `client_email` alanındaki adresi kopyalayın (örnek biçim: `xxx@yyy.iam.gserviceaccount.com`).
3. Google Sheets’te hedef e-tabloyu açın → sağ üst **Paylaş**.
4. Bu e-postayı yapıştırın, rol **Düzenleyici** (Editor) olsun → **Gönder**.

E-tablo bu hesapla paylaşılmadıysa API genelde **403** veya benzeri erişim hatası verir.

## Adım 6: E-tablo yapısı (sekme adları ve başlıklar)

Tek bir spreadsheet kullanın. Varsayılan sekme adları: **Medya**, **Görevler**, **İş**. İlk satır her sekmede **başlık** satırıdır; sütun sırası [README](../README.md) ile aynı olmalıdır.

Kısa özet:

| Sekme   | Başlıklar (sırayla) |
|--------|----------------------|
| Medya  | Başlık, Kategori, Durum, Tür, Link, Tarih, Notlar, Puan |
| Görevler | Tarih, Görevler, Kategori, Öncelik, Son Durum, Bitiş Tarihi, İlerleme, Dosya, Notlar |
| İş     | Tarih, Şirket, İş Türü, Başlık, Durum, Tutar, Para Birimi, Bitiş Tarihi, Link, Notlar, Müşteri İsmi, İletişim, Süre (ay), Aylık tutar, Aylık ödemeler |

Sekme adlarını değiştirirseniz `.env.local` içinde `SHEET_MEDIA_NAME`, `SHEET_TASKS_NAME`, `SHEET_WORK_NAME` ile uygulamaya bildirin.

## Adım 7: Spreadsheet ID’yi bulma

E-tablo açıkken tarayıcı adres çubuğuna bakın:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_BURASI/edit
```

`SPREADSHEET_ID_BURASI` uzun karakter dizisini kopyalayın; bu değer `GOOGLE_SPREADSHEET_ID` ortam değişkenine yazılacaktır.

### Drive klasörü ile karıştırmayın

Google Drive’da bir **klasör** açıksanız adres çubuğu şuna benzer:

```text
https://drive.google.com/drive/.../folders/KLASÖR_ID
```

Bu `KLASÖR_ID`, Google Sheets API’nin beklediği **e-tablo kimliği değildir**. Klasörün içindeki **Google Sheets dosyasına çift tıklayıp dosyayı açın**; o zaman adres `.../spreadsheets/d/E_TABLO_ID/edit` biçimine döner. `GOOGLE_SPREADSHEET_ID` olarak **yalnızca bu `E_TABLO_ID`** kullanılmalıdır.

## Adım 8: `.env.local` dosyası

1. Proje kökünde [`.env.example`](../.env.example) dosyasını kopyalayıp `.env.local` adıyla kaydedin (dosya adı tam olarak `.env.local` olmalı; `package.json` ile **aynı klasörde**). `.env.example` veya yalnızca `.env` kullanmak, Next.js’in varsayılan yüklemesinde beklenen dosyayı kaçırmanıza yol açabilir.
2. Değişkenleri kaydettikten sonra çalışan `npm run dev` sürecini durdurup **yeniden başlatın**; ortam değişkenleri yalnızca süreç başlarken okunur.
3. Aşağıdaki değişkenleri doldurun:

| Değişken | Ne yazılır |
|----------|------------|
| `GOOGLE_SPREADSHEET_ID` | Adres çubuğundan kopyaladığınız ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | İndirdiğiniz JSON’un **tek satır** metni **veya** **Base64** kodu |
| `GOOGLE_SERVICE_ACCOUNT_JSON_FILE` | **Yerel öneri:** İndirdiğiniz `.json` dosyasının yolu (örn. `secrets/sa.json`). Çok satırlı anahtarı `.env` içine yapıştırma derdi olmaz. |
| `SHEET_MEDIA_NAME` | İsteğe bağlı; boş bırakırsanız `Medya` |
| `SHEET_TASKS_NAME` | İsteğe bağlı; varsayılan `Görevler` |
| `SHEET_WORK_NAME` | İsteğe bağlı; varsayılan `İş` |

### `GOOGLE_SERVICE_ACCOUNT_JSON` ipuçları

- JSON içinde `private_key` alanı çok satırlıdır. **Ham JSON’u `.env.local` içinde doğrudan çok satır yapıştırmak**, ortam değişkeni ayrıştırıcısına bağlı olarak yalnızca ilk satırın okunmasına ve `GOOGLE_SERVICE_ACCOUNT_JSON`’un boş/eksik görünmesine yol açabilir. **En sorunsuz yöntem:** Ayarlar sayfasından veya elle tüm JSON’u **Base64** yapıp tek satırda atamak (`GOOGLE_SERVICE_ACCOUNT_JSON=<base64>`).
- Tek satır **minify** JSON da kullanılabilir; tırnak kaçışına dikkat edin.
- **Vercel** veya bazı panellerde çok satırlı JSON yapıştırmak zor olabilir: Base64 önerilir (uygulama Base64’ü otomatik çözer).
- `.env` dosyasında değerin çevresinde gereksiz boşluk bırakmayın.

## Adım 9: Geliştirme sunucusu ve doğrulama

1. Proje klasöründe: `npm install` (bir kez).
2. `npm run dev`
3. Tarayıcıda `http://localhost:3000/medya` veya `http://localhost:3000/ayarlar` açın.
4. **Ayarlar** sayfasında ortam değişkenlerinin tanımlı olup olmadığını görebilirsiniz; liste yükleniyorsa bağlantı çalışıyordur.

Komut satırından hızlı test (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/medya"
```

Hata mesajı yerine `rows` içeren bir JSON gelmesi beklenir (tablo boş olsa bile genelde `rows: []`).

## Sık karşılaşılan sorunlar

| Belirti | Olası neden | Ne yapmalı |
|---------|-------------|------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON eksik` veya `Missing env` | `.env.local` yok veya değişken adı yanlış | Dosya adı `.env.local`, kök dizinde; sunucuyu yeniden başlatın |
| 403 / erişim reddedildi | E-tablo Service Account ile paylaşılmadı veya yetki Düzenleyici değil | Paylaş adımını tekrarlayın |
| Sayfa bulunamadı / sekme | Sheet’te sekme adı farklı | `SHEET_*` env ile uygulama adlarını eşleştirin |
| Başlık / sütun uyuşmazlığı | İlk satır sırası README’den farklı | Başlıkları düzeltin veya sütun sırasına uygun veri girin |
| JSON hatası | `.env` içinde tırnak / kaçış bozuk | Base64 yöntemini deneyin veya tek satır JSON’u dikkatle yapıştırın |
| Ayarlar’da her şey “eksik” ama `.env` dolu | Yanlış dosya adı/yol, dev sunucusu yeniden başlatılmadı, çok satırlı JSON kesildi | `.env.local` proje kökünde; `npm run dev` yeniden; Service Account için Base64 kullanın |
| 404 / geçersiz spreadsheet | `GOOGLE_SPREADSHEET_ID` olarak Drive **klasör** ID’si kullanıldı | E-tabloyu açın; URL’deki `/d/.../edit` kimliğini kullanın |
| `The caller does not have permission` / 403 | E-tablo Service Account ile **paylaşılmadı** veya yalnızca görüntüleyici | Sheets’te **Paylaş** → JSON’daki `client_email` → **Düzenleyici** |

## Ek: Uygulama içi yardım

Tarayıcıda **Ayarlar** (`/ayarlar`) sekmesinden bağlantı durumunu ve `.env.local` için kopyalanabilir şablon üretebilirsiniz. Service Account JSON’unu bu forma yapıştırmak **sunucuya gönderilmez**; yalnızca tarayıcınızda `.env` metni oluşturulur.
