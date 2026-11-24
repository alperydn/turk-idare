# Harita Alıştırması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dört bölge için boş harita üzerinde "Çalış" (tüm unsurlar görünür) ve "Alıştırma" (listeden serbest sürükle-bırak + kontrol) sayfaları eklemek.

**Architecture:** Bir Node betiği (`tools/haritalar/build.mjs`) Natural Earth GeoJSON'dan her bölge için projeksiyonlu SVG yollarını ve elle derlenmiş unsurların (enlem/boylam) SVG koordinatlarını hesaplayıp `assets/harita/<bolge>.json` dosyasına yazar; her unsurun beyan edilen ülkenin içinde kaldığını doğrular. Tarayıcı tarafında saf mantık `assets/harita-core.js` (ES modülü, Node'da test edilir), arayüz `assets/harita.js`; dört HTML sayfası aynı iskelet.

**Tech Stack:** Düz HTML/CSS/ES modülleri (derleme yok, GitHub Pages), Node 22 + `d3-geo` (yalnızca üretim betiğinde), `node --test`, önceden kurulu Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-harita-alistirmasi-design.md`

## Global Constraints

- Site statik: çalışma anında derleme ve internet gerekmez (Google Fonts hariç). `tools/` sitenin çalışması için gerekmez.
- Boş haritada hiçbir yazı/etiket yok.
- Her unsur konumu gerçek enlem/boylamdan; her nokta unsuru beyan edilen ülkenin poligonu içinde olmalı (üretim betiği aksi hâlde hata verir).
- Unsurlar yalnızca `index.html`'de adı geçenlerden; her unsurun `ref`'i `index.html`'de var olan bir `id`.
- Harita üslubu: ülke dolgusu `#EFEBE3`, sınır `#8C8F8C` 0.8, Inter; koyu temada `assets/style.css` değişkenleri.
- Doğruluk eşikleri: Orta Asya 150 km, Osmanlı 200 km, Avrupa 150 km, İslam 300 km; alan unsurlarında eşik + `yaricapKm`.
- Varsayılan mod "Çalış"; alıştırma turu varsayılan 15 unsur, seçenekler 10 / 15 / 20 / Hepsi.
- Kategori kimlikleri: `ulke`, `baskent`, `eser`, `muze`, `uretim`, `anlasma`, `fiziki`.
- Mevcut `index.html`, arama, mobil menü bozulmamalı.

## Review Focus

- Dokunmatik ekranda sürükleme sayfayı kaydırmamalı; harita içinde iki parmak/düğme ile yakınlaştırma çalışmalı → Task 5 e2e'de mobil sürükle-bırak testi.
- Yakınlaştırılmış/kaydırılmış haritada bırakılan nokta doğru SVG koordinatına çevrilmeli (ekran→SVG dönüşümü `getScreenCTM`) → Task 5 e2e: yakınlaştırıp bırak, doğru say.
- Unsur haritanın dışına (listeye) bırakılırsa listeye geri dönmeli, puan dışı kalmalı → Task 4 birim testi `puanla` yerleştirilmemişleri "boş" sayar.
- Çalış modunda kalabalık bölgelerde (Maverâünnehir, Balkanlar, Levant) etiketler üst üste binmemeli → Task 4 `seyrelt` testi.
- Aynı unsur adı iki bölgede farklı konumda olabilir (ör. İstanbul) — veri bölge başına ayrı, kimlikler bölge içinde benzersiz → Task 1 doğrulaması yinelenen `id` reddeder.

---

## Dosya yapısı

- `tools/haritalar/package.json` — `d3-geo` bağımlılığı, `build` ve `test` betikleri.
- `tools/haritalar/bolgeler.mjs` — bölge ayarları (kapsam, projeksiyon, eşik, başlık).
- `tools/haritalar/build.mjs` — üretim + doğrulama; `export function bolgeUret(bolge, geo, unsurlar)`.
- `tools/haritalar/unsurlar/{orta-asya,osmanli,avrupa,islam}.json` — elle derlenen unsurlar.
- `tools/haritalar/veri/` — indirilen Natural Earth GeoJSON (git'e girmez, `.gitignore`).
- `tools/haritalar/test/*.test.mjs` — Node testleri; `tools/haritalar/e2e.mjs` — Playwright.
- `assets/harita/<bolge>.json` — üretilen çıktı (git'e girer).
- `assets/harita-core.js`, `assets/harita.js`, `assets/harita.css`.
- `harita/{orta-asya,osmanli,avrupa,islam}.html`, `harita/index.html` (dört bölgeye bağlantı).

### Unsur kaynak biçimi (`tools/haritalar/unsurlar/*.json`)
```json
[{ "id": "semerkant", "ad": "Semerkant", "kat": "baskent", "lat": 39.654, "lon": 66.959,
   "ulke": "UZB", "not": "Timurlu başkenti", "ref": "b3-3-1-bolgenin-tarihi-yonetim-merkezleri",
   "tur": "nokta" }]
```
`tur`: `nokta` | `alan` (ek alan `yaricapKm`) | `ulke` (`ulke` alanı ISO_A3; doğru = o ülke poligonunun içi). `ulke` alanı Natural Earth `ADM0_A3`. Denizler/okyanus noktaları için `ulke: null` (ülke içi kontrolü atlanır, kara dışında olduğu doğrulanır).

### Çıktı biçimi (`assets/harita/<bolge>.json`)
```json
{ "id": "orta-asya", "baslik": "Orta Asya Türk Coğrafyası", "genislik": 1000, "yukseklik": 640,
  "kmBirim": 3.1, "esikKm": 150,
  "ulkeler": [{ "a3": "UZB", "d": "M..." }], "goller": "M...", "nehirler": "M...",
  "unsurlar": [{ "id", "ad", "kat", "tur", "x", "y", "yaricapKm?", "ulke?", "not", "ref" }] }
```
`kmBirim`: haritanın merkezinde 1 SVG biriminin km karşılığı.

---

### Task 1: Harita üretim betiği ve doğrulama

**Files:**
- Create: `tools/haritalar/package.json`, `bolgeler.mjs`, `build.mjs`, `test/build.test.mjs`, `.gitignore` (`veri/`, `node_modules/`), `indir.sh` (Task açıklamasındaki üç GeoJSON'u `veri/`ye indirir: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_{admin_0_countries,lakes,rivers_lake_centerlines}.geojson`)

**Interfaces:**
- Produces: `bolgeUret(bolge, geo, unsurlar) -> Cikti` (yukarıdaki çıktı biçimi), hatalarda `Error` fırlatır; `BOLGELER: Record<id, {baslik, kapsam:[[lonMin,latMin],[lonMax,latMax]], paralel:[a,b], esikKm, nehirler: string[]}>`; CLI `node build.mjs [bolge...]` → `assets/harita/<id>.json`.

Bölge ayarları: Orta Asya kapsam [[44,32],[96,56]] eşik 150; Osmanlı [[-10,10],[60,50]] eşik 200; Avrupa [[-12,34],[45,66]] eşik 150; İslam [[-20,-12],[140,50]] eşik 300. Projeksiyon `geoConicConformal().parallels(paralel)`, `fitExtent([[10,10],[990, h-10]], kapsamPoligonu)`; yükseklik kapsamın en-boy oranından. Ülkeler kapsamla kırpılır (`geoClipRectangle` ile `postclip`), yollar `geoPath` ile, 1 ondalık hassasiyet. Nehirler: `nehirler` listesindeki `name` değerleri (Seyhun = "Syr Darya", Ceyhun = "Amu Darya", Tuna, Nil, Fırat, Dicle, İdil/Volga, Don, Dinyeper, Ural, İli, Tarım vb. — bölgeye göre), göller: kapsamdaki `scalerank <= 3`.

- [ ] **Step 1: Failing testler** (`test/build.test.mjs`, küçük sahte GeoJSON ile)
  - `bolgeUret` Taşkent'i (41.31, 69.28, ulke UZB) içeren sahte Özbekistan kutusuyla çağrılınca unsur `x` 0–1000, `y` 0–yükseklik aralığında.
  - Aynı unsur `ulke: "KAZ"` ile verilince `/taskent.*KAZ/` mesajlı hata.
  - Yinelenen `id` → hata; bilinmeyen `kat` → hata; `ref` `index.html`'de yoksa → hata (`index.html` metni parametreyle verilir: `bolgeUret(bolge, geo, unsurlar, {indexHtml})`).
  - `kmBirim` > 0 ve gerçek ölçüyle tutarlı: kapsam merkezinde 1° boylam ≈ `111.32*cos(lat)` km'nin SVG karşılığından hesaplanana %5 içinde.
- [ ] **Step 2:** `cd tools/haritalar && npm install && node --test` → FAIL.
- [ ] **Step 3:** `bolgeler.mjs`, `build.mjs` uygula; ülke içi kontrol `geoContains`.
- [ ] **Step 4:** `node --test` → PASS. `sh indir.sh && node build.mjs orta-asya` (unsurlar dosyası boş `[]` iken) → `assets/harita/orta-asya.json` oluşur; Playwright ile yollar çizdirilip ekran görüntüsü alınır, Hazar/Aral/sınırlar tanınır ve kapsam bölgeyi doğru kaplıyor.
- [ ] **Step 5:** Commit.

### Task 2: Unsur listeleri (bölge başına bir alt adım, sırayla Orta Asya, Osmanlı, Avrupa, İslam)

**Files:** `tools/haritalar/unsurlar/<bolge>.json`, `assets/harita/<bolge>.json` (üretilen).

**Interfaces:** Consumes Task 1 biçimi ve `node build.mjs`.

Bölge başına kaynak bölümler: Orta Asya b1–b8, Osmanlı b9–b16, Avrupa b17–b24, İslam b25–b32 (`index.html` içindeki tablolar ve haritalar 1–7). Derleme kuralları:
- Kategoriler: `ulke` (bugünkü ülkeler, tur `ulke`), `baskent` (bugünkü + tarihî merkezler), `eser` (eser/UNESCO alanı/yazıt — bulunduğu yer), `muze` (şehir; aynı şehirde birden çok müze varsa tek unsur "Ermitaj (St. Petersburg)" biçiminde ayrı ayrı adlandırılır, ama konum çakışması kabul), `uretim` (saha/havza; genelde `alan` + `yaricapKm`), `anlasma` (imza yeri belli olanlar; ad "Karlofça Antl. (1699)"), `fiziki` (deniz, dağ, nehir, tarihî bölge; genelde `alan`).
- Konumu belirsiz ya da bölgeye yayılan unsurlar alınmaz. Bölge başına 50–90 unsur.
- Koordinatlar bilinen kesin değerlerle (şehir merkezi / yapının yeri) en az 2 ondalık.
- `not` ≤ 80 karakter, sitedeki ifadeye dayanır; `ref` unsurun geçtiği en yakın `h3` `id`'si.

- [ ] **Step 1:** Bölgenin tablolarını oku, listeyi yaz.
- [ ] **Step 2:** `node build.mjs <bolge>` → doğrulama hatasız (hatalar konum/ülke düzeltilerek giderilir, kontrol gevşetilmez).
- [ ] **Step 3:** Geçici Playwright betiğiyle tüm unsurları etiketli çizip ekran görüntüsünde göz kontrolü (Semerkant Maverâünnehir'de, Bakü Hazar kıyısında vb.).
- [ ] **Step 4:** Commit (bölge başına bir commit).

### Task 3: Çekirdek mantık `assets/harita-core.js`

**Files:** Create `assets/harita-core.js`, `tools/haritalar/test/core.test.mjs`.

**Interfaces (hepsi `export`, DOM'suz):**
- `turSec(unsurlar, kategoriler: string[], boyut: number|'hepsi', rastgele=Math.random) -> Unsur[]`
- `dogruMu(unsur, yer: {x,y}|null, harita, ulkeIcinde: (a3, x, y) => boolean) -> boolean` — `nokta`: mesafe×`kmBirim` ≤ `esikKm`; `alan`: ≤ `esikKm + yaricapKm`; `ulke`: `ulkeIcinde(unsur.ulke, x, y)`.
- `puanla(tur, yerler: Map<id,{x,y}>, harita, ulkeIcinde) -> {dogru: id[], yanlis: id[], bos: id[], puan: number /*0-100 yuvarlanmış*/}`
- `seyrelt(kutular: {id, x, y, w, h, oncelik}[]) -> Set<id>` — açgözlü: önceliğe göre sırala, çakışmayanları göster.
- `enIyiPuan(bolgeId, depo=localStorage) -> number|null`, `enIyiKaydet(bolgeId, puan, depo) -> boolean` (yeni rekorsa true).

- [ ] **Step 1: Failing testler**
  - `turSec`: 30 unsurdan `['baskent']` ve 10 → yalnız başkent, 10 adet, tekrar yok; `'hepsi'` → tüm eşleşenler; eşleşen 5 iken 10 istenirse 5.
  - `dogruMu`: `kmBirim=2, esikKm=150`; 74 birim uzak → true, 76 → false; `alan` `yaricapKm=100` ile 120 birim → true; `yer=null` → false; `ulke` türü geri çağrıya devreder.
  - `puanla`: 4 unsur, 2 doğru 1 yanlış 1 boş → `puan: 50`, listeler doğru.
  - `seyrelt`: iki çakışan kutudan yüksek öncelikli kalır; çakışmayanlar ikisi de kalır.
  - `enIyiKaydet`: sahte depo; 60 sonra 50 → ikincisi false, `enIyiPuan` 60.
- [ ] **Step 2:** `node --test test/core.test.mjs` → FAIL.
- [ ] **Step 3:** Uygula.
- [ ] **Step 4:** PASS. Commit.

### Task 4: Arayüz — sayfalar, Çalış ve Alıştırma modları

**Files:** Create `assets/harita.js`, `assets/harita.css`, `harita/index.html`, `harita/{orta-asya,osmanli,avrupa,islam}.html`.

**Interfaces:** Consumes Task 3 fonksiyonları, Task 1/2 çıktı JSON. Sayfa iskeleti: `<main id="harita-uygulama" data-bolge="orta-asya">`; `harita.js` `fetch('../assets/harita/' + bolge + '.json')`.

Davranış (spec'e göre):
- Üst çubuk: ana siteye dönüş, dört bölge sekmesi (etkin olan vurgulu), Çalış/Alıştırma anahtarı, kategori çipleri (renkli, çoklu seçim, varsayılan hepsi), Alıştırma'da tur büyüklüğü seçimi + "Kontrol et", "Cevapları göster", "Yeni tur", puan ve en iyi puan.
- Harita: `<svg viewBox>` içinde ülke yolları, göller, nehirler (ince mavi), unsur katmanı. Yakınlaştırma: +/−/sıfırla düğmeleri, tekerlek, iki parmak; boş alanda sürükleyerek kaydırma (viewBox değiştirerek, sınırlarla). `touch-action: none` yalnızca harita alanında.
- Çalış modu: seçili kategorilerin tüm unsurları renkli nokta (alanlar yarı saydam daire, ülkeler ülke poligonunun hafif boyanması + ağırlık merkezinde etiket) + etiket; her yakınlaştırma/kaydırmada `seyrelt` ile görünür etiketler (öncelik: ülke > başkent > fiziki > diğerleri); gizlenen etiketin noktası kalır, noktaya dokununca açılır kutu (ad, not, "Sitede oku →" `../index.html#ref`).
- Alıştırma modu: harita boş; liste (masaüstü sağda, ≤720px altta yatay şerit) `turSec` sonucuyla. Pointer events ile sürükleme: listeden haritaya, haritadaki yerleşmiş unsuru yeniden; liste alanına bırakılan geri döner. Ekran→SVG: `svg.getScreenCTM().inverse()`. Kontrol et: `puanla`; doğru yeşil, yanlış kırmızı + doğru yere kesik çizgi ve doğru noktada hayalet işaret; boş kalanlar listede gri; `ulkeIcinde` = ilgili ülke yolunda `isPointInFill`. Cevapları göster: tüm doğru yerler. Kontrol sonrası unsura dokununca açılır kutu.
- Tema: `localStorage.theme` okunur (index.html'deki satır kopyalanır), `assets/style.css` yüklenir, `harita.css` değişkenleri kullanır.

- [ ] **Step 1:** Sayfaları ve `harita.css`'i yaz; `harita.js`'te yükleme + çizim + yakınlaştırma.
- [ ] **Step 2:** Çalış modu + seyreltme + açılır kutu.
- [ ] **Step 3:** Alıştırma modu: liste, sürükle-bırak, kontrol, cevaplar, yeni tur, en iyi puan.
- [ ] **Step 4:** `python3 -m http.server` ile sun; Playwright ile dört sayfanın masaüstü (1280×800) ve mobil (iPhone 13) ekran görüntüleri — kontrol listesi: boş haritada yazı yok, etiketler binmiyor, liste mobilde altta.
- [ ] **Step 5:** Commit.

### Task 5: Ana siteye bağlantılar ve uçtan uca test

**Files:** Modify `index.html` (başlık alanı, `<nav id="nav">` içi, dört bölge `<h2>`'sinin altı), `assets/mobile.css` gerekirse; Create `tools/haritalar/e2e.mjs`.

- [ ] **Step 1: e2e betiği** (`node tools/haritalar/e2e.mjs`, yerel sunucuya karşı), masaüstü ve mobil için:
  - `harita/orta-asya.html` açılır, Çalış modunda "Semerkant" etiketi görünür (ya da noktası var).
  - Alıştırma'ya geç, "Hepsi" değil 10; ilk unsuru doğru koordinatına (çıktı JSON'dan, `getScreenCTM` ile ekrana çevrilerek) sürükle, ikinciyi haritanın karşı köşesine sürükle, Kontrol et → biri yeşil biri kırmızı, puan "10" (1/10).
  - Yakınlaştır (+ iki kez), üçüncü unsuru doğru yere sürükle → doğru.
  - Bir unsuru listeye geri sürükle → listede yeniden görünür.
  - `index.html`'deki "Harita Alıştırması" bağlantısı `harita/index.html`'e gider; dört bölge sayfası 200 ve konsol hatasız.
- [ ] **Step 2:** Çalıştır → bağlantılar eklenmeden FAIL.
- [ ] **Step 3:** `index.html`'e bağlantıları ekle (mevcut sınıf/üslupla); mobil dosyalardaki sürüm parametresini güncelle.
- [ ] **Step 4:** e2e PASS + `node --test` PASS.
- [ ] **Step 5:** Commit ve `claude/blissful-brahmagupta-9s2vu0` dalına push.
