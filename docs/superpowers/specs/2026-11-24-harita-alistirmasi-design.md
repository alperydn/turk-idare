# Harita Alıştırması — Tasarım

## Amaç ve neden

Türk İdare dersi dönem sonu sınavında hoca dört bölgenin (Orta Asya Türk
Coğrafyası, Osmanlı Coğrafyası, Avrupa Tarihî Coğrafyası, İslam Coğrafyası)
boş haritasını çizdirip sitede geçen önemli unsurları bu haritalarda doğru
yerlere yerleştirmeyi isteyecek. Siteye her bölge için bir alıştırma sayfası
eklenecek: boş harita + unsur listesi; öğrenci unsurları listeden sürükleyip
haritada doğru yere bırakır, sonra kontrol eder.

Başarı ölçütü: öğrenci her bölgenin unsurlarını haritada ezbere ve doğru
konumlandırabilir hâle gelir.

## Hedefler

- Dört ayrı sayfa, her biri bir bölgenin boş haritası.
- Sürükle-bırak: unsur haritanın **istenen herhangi bir yerine** bırakılır
  (hazır noktalar yok — sınavdaki boş kâğıda en yakın durum).
- "Kontrol et": doğru olanlar yeşil, yanlışlar kırmızı; yanlışlarda doğru yer
  gösterilir (yanlış noktadan doğru noktaya çizgi), puan verilir.
- Unsurlar yalnızca sitede adı geçenlerden seçilir; her unsur sitedeki ilgili
  bölüme bağlantı verir.
- Mobilde (dokunmatik) ve masaüstünde çalışır; açık/koyu tema uyumlu.

## Hedef olmayanlar

- Sınır çizme alıştırması (haritayı kâğıda çizmek öğrencinin işi).
- Hesap, sunucu, skor tablosu.
- Sitedeki mevcut 7 haritayı değiştirmek.

## Kaçınılacaklar (çalışsa bile başarısızlık sayılır)

- Yanlış konumlar: öğrenci yanlış yeri ezberler. Her konum gerçek
  enlem/boylamdan gelmeli.
- Boş haritada isim/etiket bulunması.
- Mevcut siteyi (index.html, arama, mobil menü) bozmak.
- Unsurların harita üstünde üst üste binip okunamaz hâle gelmesi.

## Kısıtlar

- Site GitHub Pages'te duran statik dosyalar: `index.html` + `assets/`.
  Derleme adımı yok; yeni sayfalar da düz HTML/CSS/JS olmalı.
- Çalışma anında internet gerektirmemeli (yazı tipleri dışında).
- Görünüm sitenin mevcut harita üslubuna uymalı (`#EFEBE3` dolgu, `#8C8F8C`
  sınır, Inter yazı tipi, `assets/style.css` renk değişkenleri).

## Yaklaşımlar

1. **Gerçek coğrafi veriden yeni boş haritalar üretmek — SEÇİLDİ.**
   Natural Earth sınır verisinden her bölge için sade SVG üretilir; her unsurun
   doğru yeri enlem/boylamla tanımlanır. Tutarlı, doğru, genişletilebilir;
   ilk kurulum biraz daha emek ister.
2. Sitedeki mevcut haritaları boşaltıp kullanmak. Görünüm birebir aynı olurdu
   ama Avrupa haritası yok ve mevcut çizimlerin koordinat sistemi bilinmediği
   için yeni unsurların yeri tahmine kalırdı.
3. Çevrim içi etiketsiz harita (Leaflet vb.). İnternet ister, sınavdaki sade
   elle çizilmiş haritaya benzemez.

Kullanıcı 1. yolu seçti.

## Kararlaştırılanlar

- Etkileşim: listeden sürükle-bırak, serbest yerleştirme (kullanıcı kararı).
- Hangi unsurların haritaya konacağı: Claude'un seçimi (kullanıcı bıraktı;
  aşağıda).
- Harita üretimi: yol 1 (kullanıcı kararı).

## Claude'un kararları (düzeltilebilir)

### Sayfalar ve dosyalar
- `harita/orta-asya.html`, `harita/osmanli.html`, `harita/avrupa.html`,
  `harita/islam.html` — dört sayfa aynı iskeleti paylaşır.
- Ortak kod: `assets/harita.js`, `assets/harita.css`.
- Her bölgenin verisi: `assets/harita/<bolge>.json` (unsurlar) ve SVG harita
  sayfanın içine gömülü ya da `assets/harita/<bolge>.svg`.
- Haritaları üreten betik `tools/haritalar/` altında depoya konur (sitenin
  çalışması için gerekmez; yeniden üretmek için). Ürettiği SVG ve projeksiyon
  bilgisi (enlem/boylam → SVG koordinatı) depoya işlenir.
- Ana sayfaya giriş: başlık alanına ve içindekiler menüsüne "Harita
  Alıştırması" bağlantısı; her bölgenin başlığının altına o bölgenin
  alıştırmasına bağlantı. Alıştırma sayfalarında ana siteye ve diğer üç
  bölgeye geçiş.

### Harita içeriği
- Ülke sınırları (bugünkü), kıyı çizgisi, büyük göller (Hazar, Aral, Balkaş
  vb.), sitede adı geçen başlıca nehirler (Seyhun, Ceyhun, Tuna, Nil, Fırat,
  Dicle...). Hiç yazı yok.
- Yaklaşık kapsamlar: Orta Asya ~44–96°D, 32–56°K; Osmanlı ~-10–60°D,
  10–50°K; Avrupa ~-12–45°D, 34–66°K; İslam ~-20–140°D, -12–50°K.
- Projeksiyon her bölgeye uygun seçilir (ör. konik eş açılı); aynı fonksiyon
  hem haritayı çizer hem unsur koordinatlarını dönüştürür.

### Unsurlar (sitedeki tablolardan derlenir)
Kategoriler, her biri ayrı renkli işaret:
- **Ülkeler** — bugünkü ülkeler; ülke poligonunun içine bırakılırsa doğru.
- **Başkentler** — bugünkü başkentler ve tarihî yönetim merkezleri.
- **Tarihî eserler** — mimari/arkeolojik eserler, UNESCO alanları, yazıtlar
  (bulunduğu yer).
- **Müzeler** — bulunduğu şehir.
- **Üretim alanları** — sahalar/havzalar (ör. Tengiz, Fergana).
- **Anlaşmalar** — imzalandığı yer belli olanlar (ör. Karlofça, Küçük
  Kaynarca).
- **Fiziki unsurlar** — sitede geçen denizler, dağlar, nehirler, tarihî
  bölgeler (Maverâünnehir, Deşt-i Kıpçak...).
Konumu belirsiz ya da nokta olarak gösterilemeyen unsurlar (diller,
mezhepler, yeri belirsiz anlaşmalar) alınmaz. Bölge başına tahminen 50–90
unsur.

### Alıştırma akışı
- Üstte kategori seçimi (çoklu) ve "Tur büyüklüğü" (10 / 20 / hepsi);
  varsayılan: tüm kategoriler, rastgele 15 unsurluk tur. Böylece harita
  kalabalıklaşmaz ve her turda farklı unsurlar gelir.
- Liste masaüstünde haritanın yanında, mobilde haritanın altında yatay
  kaydırılabilir şerit.
- Bırakılan unsur haritada nokta + kısa etiket olarak durur; tekrar
  sürüklenebilir ya da listeye geri alınabilir.
- Yakınlaştırma (+ / − / sıfırla) ve sürükleyerek kaydırma — özellikle geniş
  İslam haritası için.
- "Kontrol et": nokta unsurlarda doğru yere uzaklık eşiğin altındaysa doğru.
  Eşik km cinsinden ve bölgeye göre (öneri: Orta Asya/Avrupa 150 km, Osmanlı
  200 km, İslam 300 km; alan unsurlarında — bölge, dağ, havza — daha geniş
  ya da poligon). Yanlışlarda doğru nokta ve aradaki çizgi gösterilir; unsura
  dokununca kısa açıklama + sitedeki bölüme bağlantı.
- "Cevapları göster", "Yeni tur" düğmeleri; her bölge için en iyi puan
  `localStorage`'da saklanır.

## Uygulayıcıya bırakılanlar

- Natural Earth verisinin nereden alınacağı (npm `world-atlas`, doğrudan
  Natural Earth vb.) ve sadeleştirme düzeyi.
- Etiketlerin üst üste binmesini önleme yöntemi.
- Unsur listesinin derlenmesi: sitedeki tablolardan, her unsur için koordinat
  güvenilir bir kaynaktan doğrulanarak.
- Test yaklaşımı (en azından: koordinat dönüşümü ve doğru/yanlış hesaplaması
  için birim test; dört sayfanın Playwright ile masaüstü ve mobilde
  denenmesi).
