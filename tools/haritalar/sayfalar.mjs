// harita/*.html sayfalarını tek şablondan üretir. Kullanım: node sayfalar.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BOLGELER } from './bolgeler.mjs';

const SURUM = 'h1';
const kok = join(dirname(fileURLToPath(import.meta.url)), '../..');
const hedef = join(kok, 'harita');
mkdirSync(hedef, { recursive: true });

const KISA = { 'orta-asya': 'Orta Asya', osmanli: 'Osmanlı', avrupa: 'Avrupa', islam: 'İslam' };

const bas = (baslik) => `<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${baslik}</title>
<meta name="theme-color" content="#f6f1e7">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css">
<link rel="stylesheet" href="../assets/harita.css?v=${SURUM}">
<script>try{var t=localStorage.getItem('theme');if(!t&&matchMedia('(prefers-color-scheme: dark)').matches)t='dark';if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
</head>`;

const sekmeler = (etkin) => Object.keys(BOLGELER).map((id) =>
  `<a href="${id}.html" class="hb-sekme" data-bolge="${id}"${id === etkin ? ' aria-current="page"' : ''}>${KISA[id]}</a>`).join('');

const ust = (etkin) => `<header class="topbar hb-ust">
  <a class="brand" href="../index.html">← Türk İdare Tarihi</a>
  <nav class="hb-sekmeler" aria-label="Bölgeler">${sekmeler(etkin)}</nav>
  <button class="icon-btn" id="themeBtn" aria-label="Koyu / açık tema">
    <svg class="sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    <svg class="moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
  </button>
</header>`;

for (const [id, b] of Object.entries(BOLGELER)) {
  writeFileSync(join(hedef, id + '.html'), `${bas(`Harita Alıştırması — ${b.baslik}`)}
<body class="hb-sayfa">
${ust(id)}
<main id="harita-uygulama" data-bolge="${id}">
  <div class="hb-arac">
    <h1>${b.baslik}</h1>
    <div class="hb-mod" role="group" aria-label="Mod">
      <button type="button" data-mod="calis" aria-pressed="true">Çalış</button>
      <button type="button" data-mod="alistirma" aria-pressed="false">Alıştırma</button>
    </div>
    <div class="hb-kategoriler" role="group" aria-label="Kategoriler"></div>
    <div class="hb-tur" hidden>
      <label>Tur <select id="hbBoyut"><option value="10">10</option><option value="15" selected>15</option><option value="20">20</option><option value="hepsi">Hepsi</option></select></label>
      <button type="button" id="hbKontrol" class="hb-ana">Kontrol et</button>
      <button type="button" id="hbCevap">Cevapları göster</button>
      <button type="button" id="hbYeni">Yeni tur</button>
      <span class="hb-puan" id="hbPuan" aria-live="polite"></span>
    </div>
    <p class="hb-ipucu" id="hbIpucu"></p>
  </div>
  <div class="hb-govde">
    <div class="hb-harita" id="hbHarita">
      <div class="hb-zoom">
        <button type="button" data-zoom="in" aria-label="Yakınlaştır">+</button>
        <button type="button" data-zoom="out" aria-label="Uzaklaştır">−</button>
        <button type="button" data-zoom="reset" aria-label="Haritayı sıfırla">⟲</button>
      </div>
      <div class="hb-kutu" id="hbKutu" hidden></div>
    </div>
    <aside class="hb-liste" id="hbListe" hidden aria-label="Yerleştirilecek unsurlar"></aside>
  </div>
</main>
<script type="module" src="../assets/harita.js?v=${SURUM}"></script>
</body>
</html>
`);
}

writeFileSync(join(hedef, 'index.html'), `${bas('Harita Alıştırması — Türk İdare Tarihi')}
<body class="hb-sayfa">
${ust('')}
<main class="hb-giris">
  <h1>Harita Alıştırması</h1>
  <p>Her bölgenin boş haritasında, sitede adı geçen başkentleri, eserleri, müzeleri, üretim alanlarını, anlaşma yerlerini ve fiziki unsurları çalışın. <b>Çalış</b> modunda tüm unsurlar doğru yerlerinde görünür; <b>Alıştırma</b> modunda listeden sürükleyip boş haritaya kendiniz yerleştirirsiniz.</p>
  <ul class="hb-giris-liste">
${Object.entries(BOLGELER).map(([id, b]) => `    <li><a href="${id}.html" data-bolge="${id}">${b.baslik}</a></li>`).join('\n')}
  </ul>
</main>
<script>document.getElementById('themeBtn').onclick=function(){var d=document.documentElement,t=d.dataset.theme==='dark'?'light':'dark';d.dataset.theme=t;try{localStorage.setItem('theme',t)}catch(e){}}</script>
</body>
</html>
`);
console.log('sayfalar yazıldı');
