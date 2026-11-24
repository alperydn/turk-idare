// Harita alıştırması arayüzü: Çalış ve Alıştırma modları.
import { turSec, dogruMu, puanla, seyrelt, kumele, enIyiPuan, enIyiKaydet } from './harita-core.js?v=h2';

const NS = 'http://www.w3.org/2000/svg';
const KATEGORI = {
  ulke: 'Ülkeler', baskent: 'Başkentler', eser: 'Tarihî eserler', muze: 'Müzeler',
  uretim: 'Üretim alanları', anlasma: 'Anlaşmalar', fiziki: 'Fiziki unsurlar',
};
const ONCELIK = { ulke: 6, baskent: 5, fiziki: 4, eser: 3, anlasma: 2, uretim: 2, muze: 1 };

const kok = document.getElementById('harita-uygulama');
const bolgeId = kok.dataset.bolge;
const $ = (s) => document.querySelector(s);
const el = (ad, ozellik = {}, ns = NS) => {
  const e = ns ? document.createElementNS(ns, ad) : document.createElement(ad);
  for (const [k, v] of Object.entries(ozellik)) e.setAttribute(k, v);
  return e;
};

const durum = {
  veri: null, mod: 'calis', kategoriler: new Set(Object.keys(KATEGORI)), boyut: 15,
  tur: [], yerler: new Map(), sonuc: null, cevaplar: false, secili: null, vb: null,
};

let svg, gIsaret, gCizgi, haritaKutu;
const ulkeYolu = new Map();

// ---------- tema ----------
$('#themeBtn')?.addEventListener('click', () => {
  const d = document.documentElement;
  const t = d.dataset.theme === 'dark' ? 'light' : 'dark';
  d.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch {}
});

// ---------- yükleme ----------
fetch(`../assets/harita/${bolgeId}.json`)
  .then((r) => r.json())
  .then((v) => { durum.veri = v; kur(); })
  .catch(() => { $('#hbIpucu').textContent = 'Harita yüklenemedi. Sayfayı yenileyin.'; });

function kur() {
  const v = durum.veri;
  haritaKutu = $('#hbHarita');
  svg = el('svg', { viewBox: `0 0 ${v.genislik} ${v.yukseklik}`, role: 'img', 'aria-label': `${v.baslik} boş haritası` });
  svg.append(el('rect', { x: -5000, y: -5000, width: 20000, height: 20000, fill: 'var(--deniz)' }));
  const zemin = el('g');
  for (const u of v.ulkeler) {
    const p = el('path', { d: u.d, class: 'hb-ulke', 'data-a3': u.a3, 'vector-effect': 'non-scaling-stroke' });
    zemin.append(p);
    ulkeYolu.set(u.a3, p);
  }
  if (v.goller) zemin.append(el('path', { d: v.goller, class: 'hb-gol', 'vector-effect': 'non-scaling-stroke' }));
  if (v.nehirler) zemin.append(el('path', { d: v.nehirler, class: 'hb-nehir', 'vector-effect': 'non-scaling-stroke' }));
  gCizgi = el('g');
  gIsaret = el('g');
  svg.append(zemin, gCizgi, gIsaret);
  haritaKutu.prepend(svg);
  durum.vb = { x: 0, y: 0, w: v.genislik, h: v.yukseklik };

  // kategori çipleri (bu bölgede bulunanlar)
  const var_ = new Set(v.unsurlar.map((u) => u.kat));
  const kc = $('.hb-kategoriler');
  for (const [k, ad] of Object.entries(KATEGORI)) {
    if (!var_.has(k)) { durum.kategoriler.delete(k); continue; }
    const say = v.unsurlar.filter((u) => u.kat === k).length;
    const b = el('button', { type: 'button', class: 'hb-cip', 'aria-pressed': 'true', 'data-kat': k, style: `--renk:var(--k-${k})` }, null);
    b.textContent = `${ad} (${say})`;
    b.onclick = () => {
      if (durum.kategoriler.has(k) && durum.kategoriler.size === 1) return;
      durum.kategoriler.has(k) ? durum.kategoriler.delete(k) : durum.kategoriler.add(k);
      b.setAttribute('aria-pressed', durum.kategoriler.has(k));
      if (durum.mod === 'alistirma') yeniTur(); else ciz();
    };
    kc.append(b);
  }

  document.querySelectorAll('.hb-mod button').forEach((b) => (b.onclick = () => modSec(b.dataset.mod)));
  $('#hbBoyut').onchange = (e) => { durum.boyut = e.target.value === 'hepsi' ? 'hepsi' : +e.target.value; yeniTur(); };
  $('#hbKontrol').onclick = kontrol;
  $('#hbCevap').onclick = () => {
    durum.cevaplar = !durum.cevaplar;
    if (durum.cevaplar) durum.cevapGoruldu = true;
    cevapDugmesi();
    ciz();
  };
  $('#hbYeni').onclick = yeniTur;
  document.querySelectorAll('.hb-zoom button').forEach((b) => (b.onclick = () => zoomDugme(b.dataset.zoom)));

  kaydirmaKur();
  new ResizeObserver(() => {
    if (durum.serbest) tamGorunum();
    else durum.vb = sinirla(durum.vb);
    ciz();
  }).observe(haritaKutu);
  const istenen = new URLSearchParams(location.search).get('mod');
  modSec(istenen === 'alistirma' ? 'alistirma' : 'calis');
}

// ---------- modlar ----------
function modSec(mod) {
  durum.mod = mod;
  document.querySelectorAll('.hb-mod button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mod === mod));
  $('.hb-tur').hidden = mod !== 'alistirma';
  $('#hbListe').hidden = mod !== 'alistirma';
  if (mod === 'alistirma') yeniTur();
  else { kutuKapat(); ciz(); }
}

function yeniTur() {
  durum.tur = turSec(durum.veri.unsurlar, [...durum.kategoriler], durum.boyut);
  durum.yerler = new Map();
  durum.sonuc = null;
  durum.cevaplar = false;
  durum.cevapGoruldu = false;
  cevapDugmesi();
  durum.secili = null;
  kutuKapat();
  listeCiz();
  ciz();
}

function kontrol() {
  durum.sonuc = puanla(durum.tur, durum.yerler, durum.veri, ulkeIcinde);
  // Cevaplara bakılan ya da boş geçilen tur en iyi puana sayılmaz.
  const sayilir = !durum.cevapGoruldu && durum.yerler.size > 0;
  durum.rekor = sayilir && enIyiKaydet(bolgeId, durum.sonuc.puan);
  ciz();
  listeCiz();
}

function cevapDugmesi() {
  const b = $('#hbCevap');
  b.textContent = durum.cevaplar ? 'Cevapları gizle' : 'Cevapları göster';
  b.setAttribute('aria-pressed', durum.cevaplar);
}

function ulkeIcinde(a3, x, y) {
  const p = ulkeYolu.get(a3);
  if (!p) return false;
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  return p.isPointInFill(pt);
}

// ---------- çizim ----------
const birim = () => durum.vb.w / (haritaKutu.clientWidth || 1); // 1 ekran pikseli kaç SVG birimi

function ciz() {
  if (!svg) return;
  const { x, y, w, h } = durum.vb;
  svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  gIsaret.replaceChildren();
  gCizgi.replaceChildren();
  for (const p of ulkeYolu.values()) p.classList.remove('vurgu', 'vurgu-dogru', 'vurgu-cevap');
  if (durum.mod === 'calis') calisCiz(); else alistirmaCiz();
  puanYaz();
}

function isaret(u, x, y, { sinif = '', etiket = true, alan = true, metin = u.ad } = {}) {
  const px = birim();
  const g = el('g', { class: `hb-isaret ${sinif}`, style: `--renk:var(--k-${u.kat})`, 'data-id': u.id });
  if (alan && u.tur === 'cizgi') g.append(el('path', { class: 'c', d: u.cizgi.map((c) => 'M' + c.join('L')).join(''), 'vector-effect': 'non-scaling-stroke' }));
  if (alan && u.tur === 'alan') g.append(el('circle', { class: 'a', cx: x, cy: y, r: u.yaricapKm / durum.veri.kmBirim, 'vector-effect': 'non-scaling-stroke' }));
  if (u.tur !== 'ulke' || sinif) g.append(el('circle', { class: 'n', cx: x, cy: y, r: 5 * px, 'stroke-width': 1.5 * px }));
  if (etiket) {
    const t = el('text', { x: x + 8 * px, y: y + 4 * px, 'font-size': 12 * px, 'stroke-width': 3 * px });
    t.textContent = metin;
    if (u.tur === 'ulke' && !sinif) { t.setAttribute('text-anchor', 'middle'); t.setAttribute('x', x); t.setAttribute('font-size', 13 * px); }
    g.append(t);
  }
  return g;
}

function etiketKutusu(u, x, y, metin = u.ad) {
  const px = birim();
  const fs = (u.tur === 'ulke' ? 13 : 12) * px;
  const w = metin.length * fs * 0.62 + 4 * px;
  const bx = u.tur === 'ulke' ? x - w / 2 : x + 8 * px;
  return { id: u.id, x: bx, y: y + 4 * px - fs, w, h: fs * 1.2, oncelik: ONCELIK[u.kat] };
}

function gorunurMu(x, y) {
  const { x: vx, y: vy, w, h } = durum.vb;
  return x >= vx - 50 && x <= vx + w + 50 && y >= vy - 50 && y <= vy + h + 50;
}

function calisCiz() {
  const liste = durum.veri.unsurlar.filter((u) => durum.kategoriler.has(u.kat));
  for (const u of liste) if (u.tur === 'ulke') ulkeYolu.get(u.ulke)?.classList.add('vurgu');
  const gor = liste.filter((u) => gorunurMu(u.x, u.y));
  // Aynı noktaya düşenleri (ekranda 7 pikselden yakın) tek işarette topla; ülkeler ayrı kalır.
  const kumeler = [
    ...gor.filter((u) => u.tur === 'ulke').map((u) => ({ x: u.x, y: u.y, uyeler: [u] })),
    ...kumele(gor.filter((u) => u.tur !== 'ulke').map((u) => ({ ...u, oncelik: ONCELIK[u.kat] })), 7 * birim()),
  ].map((k) => ({ ...k, bas: k.uyeler[0], metin: k.uyeler[0].ad + (k.uyeler.length > 1 ? ` +${k.uyeler.length - 1}` : '') }));
  const etiketli = seyrelt(kumeler.map((k) => etiketKutusu(k.bas, k.bas.x, k.bas.y, k.metin)));
  // önce alanlar ve nehirler (altta), sonra noktalar
  const alttaMi = (k) => (k.bas.tur === 'alan' || k.bas.tur === 'cizgi' ? 0 : 1);
  for (const k of [...kumeler].sort((a, b) => alttaMi(a) - alttaMi(b))) {
    const u = k.bas;
    const g = isaret(u, u.x, u.y, { etiket: etiketli.has(u.id), metin: k.metin });
    // kümedeki diğer alan ve nehirlerin şekilleri de görünsün
    for (const d of k.uyeler.slice(1)) if (d.tur === 'alan' || d.tur === 'cizgi') g.prepend(isaret(d, d.x, d.y, { etiket: false }));
    g.addEventListener('click', (e) => { e.stopPropagation(); kutuAc(u, u.x, u.y, k.uyeler); });
    gIsaret.append(g);
  }
  const gizli = kumeler.length - etiketli.size;
  $('#hbIpucu').textContent = `${liste.length} unsur gösteriliyor.` +
    (gizli > 0 ? ` Kalabalık yerlerde ${gizli} isim gizlendi: yakınlaştırın ya da noktaya dokunun.` : '') +
    ' Ezberledikten sonra Alıştırma moduna geçin.';
}

function alistirmaCiz() {
  const s = durum.sonuc;
  const durumu = (id) => (s ? (s.dogru.includes(id) ? 'dogru' : s.yanlis.includes(id) ? 'yanlis' : 'bos') : '');
  // cevaplar / yanlışların doğru yerleri
  for (const u of durum.tur) {
    const d = durumu(u.id);
    const goster = durum.cevaplar || d === 'yanlis';
    if (!goster) continue;
    const yer = durum.yerler.get(u.id);
    if (u.tur === 'ulke') ulkeYolu.get(u.ulke)?.classList.add('vurgu-cevap');
    if (yer && d === 'yanlis') gCizgi.append(el('line', { class: 'hb-cizgi', x1: yer.x, y1: yer.y, x2: u.x, y2: u.y, 'vector-effect': 'non-scaling-stroke' }));
    const g = isaret(u, u.x, u.y, { sinif: 'hayalet' });
    g.addEventListener('click', (e) => { e.stopPropagation(); kutuAc(u, u.x, u.y); });
    gIsaret.append(g);
  }
  for (const u of durum.tur) {
    const yer = durum.yerler.get(u.id);
    if (!yer) continue;
    const d = durumu(u.id);
    if (d === 'dogru' && u.tur === 'ulke') ulkeYolu.get(u.ulke)?.classList.add('vurgu-dogru');
    const g = isaret(u, yer.x, yer.y, { sinif: `hb-yerlesik ${d}`, alan: false });
    g.addEventListener('pointerdown', (e) => suruklemeBasla(e, u, 'harita'));
    gIsaret.append(g);
  }
  const yerlesen = durum.yerler.size;
  $('#hbIpucu').textContent = s
    ? `${s.dogru.length} doğru, ${s.yanlis.length} yanlış, ${s.bos.length} boş. Yanlışların doğru yeri yeşil halkayla gösterildi.`
    : `${yerlesen}/${durum.tur.length} yerleştirildi. Unsuru listeden haritaya sürükleyin ya da önce unsura, sonra haritada yerine dokunun.`;
}

function puanYaz() {
  const p = $('#hbPuan');
  if (!p) return;
  const eniyi = enIyiPuan(bolgeId);
  const s = durum.sonuc;
  const not = s && durum.cevapGoruldu ? ' · Cevaplara bakıldı, rekora sayılmaz' : '';
  p.textContent = (s ? `Puan: ${s.puan} (${s.dogru.length}/${durum.tur.length})${durum.rekor ? ' · Yeni rekor!' : not}` : '') +
    (eniyi !== null ? `${s ? ' · ' : ''}En iyi: ${eniyi}` : '');
}

function listeCiz() {
  const l = $('#hbListe');
  l.replaceChildren();
  const bilgi = el('p', { class: 'bilgi' }, null);
  bilgi.textContent = 'Haritaya sürükleyin';
  l.append(bilgi);
  const s = durum.sonuc;
  for (const u of durum.tur) {
    if (durum.yerler.has(u.id)) continue;
    const b = el('button', { type: 'button', class: 'hb-oge' + (s ? ' bos' : ''), style: `--renk:var(--k-${u.kat})`, 'data-id': u.id, 'aria-pressed': durum.secili === u.id }, null);
    b.textContent = u.ad;
    b.title = KATEGORI[u.kat];
    b.addEventListener('pointerdown', (e) => suruklemeBasla(e, u, 'liste'));
    b.addEventListener('click', () => {
      if (b.dataset.surukle) { delete b.dataset.surukle; return; }
      durum.secili = durum.secili === u.id ? null : u.id;
      haritaKutu.classList.toggle('secili', !!durum.secili);
      listeCiz();
    });
    l.append(b);
  }
  if (l.children.length === 1) bilgi.textContent = s ? 'Tur bitti. "Yeni tur" ile devam edin.' : 'Hepsi yerleştirildi. "Kontrol et"e basın.';
}

// ---------- açılır kutu ----------
function kutuAc(u, x, y, uyeler = [u]) {
  const k = $('#hbKutu');
  if (uyeler.length > 1) {
    k.style.setProperty('--renk', 'var(--muted)');
    k.innerHTML = `<span class="k">Bu noktada ${uyeler.length} unsur</span><ul class="hb-kume"></ul>`;
    const ul = k.querySelector('ul');
    for (const m of uyeler) {
      const li = el('li', { style: `--renk:var(--k-${m.kat})` }, null);
      const a = el('a', { href: `../index.html#${m.ref}`, target: '_blank', rel: 'noopener' }, null);
      a.textContent = m.ad;
      const not = el('span', {}, null);
      not.textContent = ` — ${KATEGORI[m.kat]}`;
      li.append(a, not);
      ul.append(li);
    }
    konumla(k, x, y);
    return;
  }
  const s = durum.sonuc;
  let durumHtml = '';
  if (s && durum.mod === 'alistirma') {
    if (s.dogru.includes(u.id)) durumHtml = '<div class="durum dogru">Doğru yerleştirdiniz</div>';
    else if (s.yanlis.includes(u.id)) durumHtml = '<div class="durum yanlis">Yanlış yer — doğru yer yeşil halkada</div>';
    else durumHtml = '<div class="durum">Yerleştirilmedi</div>';
  }
  k.style.setProperty('--renk', `var(--k-${u.kat})`);
  k.innerHTML = `<span class="k"></span><b></b><p></p>${durumHtml}<a target="_blank" rel="noopener">Sitede oku →</a>`;
  k.querySelector('.k').textContent = KATEGORI[u.kat];
  k.querySelector('b').textContent = u.ad;
  k.querySelector('p').textContent = u.not;
  k.querySelector('a').href = `../index.html#${u.ref}`;
  konumla(k, x, y);
}

function konumla(k, x, y) {
  k.hidden = false;
  const m = svg.getScreenCTM();
  const r = haritaKutu.getBoundingClientRect();
  const sx = m.a * x + m.e - r.left, sy = m.d * y + m.f - r.top;
  const kw = k.offsetWidth, kh = k.offsetHeight;
  k.style.left = Math.max(8, Math.min(sx + 10, r.width - kw - 8)) + 'px';
  k.style.top = Math.max(8, Math.min(sy + 10, r.height - kh - 8)) + 'px';
}
function kutuKapat() { const k = $('#hbKutu'); if (k) k.hidden = true; }

// ---------- koordinat ----------
function ekrandanSvg(cx, cy) {
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: +p.x.toFixed(1), y: +p.y.toFixed(1) };
}
function haritaUstunde(cx, cy) {
  const r = haritaKutu.getBoundingClientRect();
  return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
}

// ---------- sürükle-bırak ----------
function suruklemeBasla(e, u, kaynak) {
  if (e.button !== undefined && e.button !== 0) return;
  e.stopPropagation();
  const kaynakEl = e.currentTarget;
  const bx = e.clientX, by = e.clientY;
  let hayalet = null;
  const esik = kaynak === 'harita' ? 3 : 8;
  const hareket = (ev) => {
    const dx = ev.clientX - bx, dy = ev.clientY - by;
    if (!hayalet) {
      if (Math.hypot(dx, dy) < esik) return;
      hayalet = el('div', { class: 'hb-hayalet-surukle' }, null);
      hayalet.textContent = u.ad;
      document.body.append(hayalet);
      kutuKapat();
      if (kaynak === 'harita') kaynakEl.style.opacity = '.25';
    }
    hayalet.style.left = ev.clientX + 'px';
    hayalet.style.top = ev.clientY + 'px';
  };
  const bitir = (ev) => {
    window.removeEventListener('pointermove', hareket);
    window.removeEventListener('pointerup', bitir);
    window.removeEventListener('pointercancel', iptal);
    if (!hayalet) {
      if (kaynak === 'harita') kutuAc(u, durum.yerler.get(u.id).x, durum.yerler.get(u.id).y);
      return;
    }
    hayalet.remove();
    if (kaynak === 'liste') kaynakEl.dataset.surukle = '1';
    if (haritaUstunde(ev.clientX, ev.clientY)) durum.yerler.set(u.id, ekrandanSvg(ev.clientX, ev.clientY));
    else durum.yerler.delete(u.id);
    degisti();
  };
  const iptal = () => {
    window.removeEventListener('pointermove', hareket);
    window.removeEventListener('pointerup', bitir);
    window.removeEventListener('pointercancel', iptal);
    hayalet?.remove();
    if (kaynakEl) kaynakEl.style.opacity = '';
  };
  window.addEventListener('pointermove', hareket);
  window.addEventListener('pointerup', bitir);
  window.addEventListener('pointercancel', iptal);
}

function degisti() {
  durum.sonuc = null;
  durum.rekor = false;
  durum.secili = null;
  haritaKutu.classList.remove('secili');
  listeCiz();
  ciz();
}

// ---------- yakınlaştırma ve kaydırma ----------
function sinirla(vb) {
  const { genislik: W, yukseklik: H } = durum.veri;
  const oran = haritaKutu.clientHeight / (haritaKutu.clientWidth || 1);
  const wMax = Math.max(W, H / oran); // tam görünümün genişliği
  const w = Math.min(Math.max(vb.w, W / 40), wMax);
  const h = w * oran;
  const x = Math.min(Math.max(vb.x, -w * 0.25), W - w * 0.75);
  const y = Math.min(Math.max(vb.y, -h * 0.25), H - h * 0.75);
  return { x, y, w, h };
}

function zoom(kat, cx, cy) {
  const vb = durum.vb;
  const p = ekrandanSvg(cx, cy);
  const w = vb.w * kat;
  const h = vb.h * kat;
  durum.vb = sinirla({ x: p.x - (p.x - vb.x) * kat, y: p.y - (p.y - vb.y) * kat, w, h });
  durum.serbest = false;
  kutuKapat();
  ciz();
}

function zoomDugme(t) {
  const r = haritaKutu.getBoundingClientRect();
  if (t === 'reset') { tamGorunum(); ciz(); return; }
  zoom(t === 'in' ? 0.6 : 1 / 0.6, r.left + r.width / 2, r.top + r.height / 2);
}

function tamGorunum() {
  const { genislik: W, yukseklik: H } = durum.veri;
  const oran = haritaKutu.clientHeight / (haritaKutu.clientWidth || 1);
  // Haritanın tamamı görünsün; kullanıcı yakınlaştırana dek boyut değişince yeniden hesaplanır.
  durum.serbest = true;
  durum.vb = { x: 0, y: 0, w: W, h: H };
  if (oran > H / W) durum.vb.h = W * oran; else durum.vb.w = H / oran;
  durum.vb.x = (W - durum.vb.w) / 2;
  durum.vb.y = (H - durum.vb.h) / 2;
}

function kaydirmaKur() {
  const isaretciler = new Map();
  let bas = null; // tek parmak kaydırma
  let cimdik = null;
  let tasindi = false;
  tamGorunum();

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
  }, { passive: false });

  svg.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hb-isaret')) return;
    isaretciler.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svg.setPointerCapture(e.pointerId);
    tasindi = false;
    if (isaretciler.size === 1) bas = { x: e.clientX, y: e.clientY, vb: { ...durum.vb } };
    if (isaretciler.size === 2) {
      const [a, b] = [...isaretciler.values()];
      cimdik = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: { ...durum.vb } };
      bas = null;
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!isaretciler.has(e.pointerId)) return;
    isaretciler.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cimdik && isaretciler.size === 2) {
      const [a, b] = [...isaretciler.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const kat = (cimdik.d / d) * (cimdik.vb.w / durum.vb.w);
      if (Math.abs(kat - 1) > 0.01) zoom(kat, mx, my);
      tasindi = true;
      return;
    }
    if (!bas) return;
    const dx = e.clientX - bas.x, dy = e.clientY - bas.y;
    if (!tasindi && Math.hypot(dx, dy) < 4) return;
    tasindi = true;
    svg.classList.add('kayiyor');
    const px = bas.vb.w / haritaKutu.clientWidth;
    durum.vb = sinirla({ ...bas.vb, x: bas.vb.x - dx * px, y: bas.vb.y - dy * px });
    durum.serbest = false;
    ciz();
  });
  const birak = (e) => {
    if (!isaretciler.has(e.pointerId)) return;
    isaretciler.delete(e.pointerId);
    svg.classList.remove('kayiyor');
    if (isaretciler.size < 2) cimdik = null;
    if (isaretciler.size === 0) {
      if (!tasindi && e.type === 'pointerup') haritayaDokun(e.clientX, e.clientY);
      bas = null;
    }
  };
  svg.addEventListener('pointerup', birak);
  svg.addEventListener('pointercancel', birak);
}

function haritayaDokun(cx, cy) {
  if (durum.mod === 'alistirma' && durum.secili) {
    durum.yerler.set(durum.secili, ekrandanSvg(cx, cy));
    degisti();
    return;
  }
  kutuKapat();
}
