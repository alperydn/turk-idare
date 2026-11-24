// Natural Earth verisinden bölge haritası + unsur koordinatları üretir.
// Kullanım: node build.mjs [bolge...]   (önce: sh indir.sh)
import { geoConicConformal, geoPath, geoContains, geoArea, geoCentroid, geoClipRectangle, geoBounds } from 'd3-geo';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BOLGELER } from './bolgeler.mjs';

export const KATEGORILER = ['ulke', 'baskent', 'eser', 'muze', 'uretim', 'anlasma', 'fiziki'];
const TURLER = ['nokta', 'alan', 'ulke'];
const GENISLIK = 1000, KENAR = 10;

// d3-geo küresel poligonlarda saat yönü dış halka bekler; RFC 7946 tersini kullanır.
function rewind(f) {
  const ters = (rings) => rings.map((r) => r.slice().reverse());
  const g = f.geometry;
  if (!g) return f;
  const duzelt = (poly) => (geoArea({ type: 'Polygon', coordinates: poly }) > 2 * Math.PI ? ters(poly) : poly);
  if (g.type === 'Polygon') return { ...f, geometry: { ...g, coordinates: duzelt(g.coordinates) } };
  if (g.type === 'MultiPolygon') return { ...f, geometry: { ...g, coordinates: g.coordinates.map(duzelt) } };
  return f;
}

// geoPath çıktısını 1 ondalığa yuvarlayan ve 0.8 birimden yakın ardışık noktaları atan bağlam.
class InceYol {
  constructor() { this.s = []; this.son = null; this.ilk = null; this.n = 0; }
  moveTo(x, y) { this.s.push(`M${+x.toFixed(1)},${+y.toFixed(1)}`); this.son = this.ilk = [x, y]; this.n = 1; }
  lineTo(x, y) {
    if (Math.hypot(x - this.son[0], y - this.son[1]) < 0.8) return;
    this.s.push(`L${+x.toFixed(1)},${+y.toFixed(1)}`); this.son = [x, y]; this.n++;
  }
  closePath() { this.s.push('Z'); }
  arc() {} rect() {}
  sonuc() { const r = this.s.join(''); this.s = []; return r; }
}
const r1 = (s) => s || '';

export function bolgeUret(bolge, geo, unsurlar, { indexHtml }) {
  const [[x0, y0], [x1, y1]] = bolge.kapsam;
  const merkez = [(x0 + x1) / 2, (y0 + y1) / 2];
  const kapsamPoly = { type: 'Polygon', coordinates: [[]] };
  const ring = kapsamPoly.coordinates[0];
  // d3-geo için saat yönünde: batı kenarı kuzeye, kuzey kenarı doğuya, doğu güneye, güney batıya.
  for (let y = y0; y <= y1; y += 1) ring.push([x0, y]);
  for (let x = x0; x <= x1; x += 1) ring.push([x, y1]);
  for (let y = y1; y >= y0; y -= 1) ring.push([x1, y]);
  for (let x = x1; x >= x0; x -= 1) ring.push([x, y0]);

  const proj0 = geoConicConformal().parallels(bolge.paralel).rotate([-merkez[0], 0]);
  proj0.fitWidth(GENISLIK - 2 * KENAR, kapsamPoly);
  const b = geoPath(proj0).bounds(kapsamPoly);
  const yukseklik = Math.round(b[1][1] - b[0][1] + 2 * KENAR);
  const proj = geoConicConformal().parallels(bolge.paralel).rotate([-merkez[0], 0])
    .fitExtent([[KENAR, KENAR], [GENISLIK - KENAR, yukseklik - KENAR]], kapsamPoly);
  proj.postclip(geoClipRectangle(0, 0, GENISLIK, yukseklik));
  const baglam = new InceYol();
  const ciz = geoPath(proj, baglam);
  const yol = (f) => { ciz(f); return baglam.sonuc(); };
  const pay = 8; // kapsamın biraz dışındakileri de çiz (kenarlar boş kalmasın)
  const icinde = (f) => {
    if (!f.geometry) return false;
    const [[a, b], [c, d]] = geoBounds(f);
    const capraz = c < a; // tarih değiştirme çizgisini aşanlar
    return d >= y0 - pay && b <= y1 + pay && (capraz || (c >= x0 - pay && a <= x1 + pay));
  };

  const ulkeFeat = new Map();
  const ulkeler = [];
  for (const f0 of geo.ulkeler.features) {
    const f = rewind(f0);
    const a3 = f.properties.ADM0_A3;
    ulkeFeat.set(a3, f);
    if (!icinde(f)) continue;
    const d = r1(yol(f));
    if (d) ulkeler.push({ a3, d });
  }
  const birlesik = (fc, filtre) => r1(fc.features.filter((f) => filtre(f) && icinde(rewind(f))).map((f) => yol(rewind(f)) || '').join(''));
  const goller = birlesik(geo.goller, (f) => (f.properties.scalerank ?? 0) <= 3);
  const nehirler = birlesik(geo.nehirler, (f) => bolge.nehirler.includes(f.properties.name));

  // 1 SVG birimi kaç km: merkezde 1° boylamın gerçek uzunluğu / SVG uzunluğu
  const lat = merkez[1];
  const p = proj([merkez[0], lat]), q = proj([merkez[0] + 1, lat]);
  const kmBirim = (111.32 * Math.cos((lat * Math.PI) / 180)) / Math.hypot(q[0] - p[0], q[1] - p[1]);

  const goruldu = new Set();
  const cikti = unsurlar.map((u) => {
    if (goruldu.has(u.id)) throw new Error(`Yinelenen id: ${u.id}`);
    goruldu.add(u.id);
    if (!KATEGORILER.includes(u.kat)) throw new Error(`${u.id}: bilinmeyen kategori "${u.kat}"`);
    if (!TURLER.includes(u.tur)) throw new Error(`${u.id}: bilinmeyen tür "${u.tur}"`);
    if (!indexHtml.includes(`id="${u.ref}"`)) throw new Error(`${u.id}: ref index.html içinde yok: ${u.ref}`);
    if (!u.ad) throw new Error(`${u.id}: ad boş`);
    let konum;
    if (u.tur === 'ulke') {
      const f = ulkeFeat.get(u.ulke);
      if (!f) throw new Error(`${u.id}: ülke bulunamadı ${u.ulke}`);
      konum = u.lat != null ? [u.lon, u.lat] : geoCentroid(f);
    } else {
      if (typeof u.lat !== 'number' || typeof u.lon !== 'number') throw new Error(`${u.id}: lat/lon eksik`);
      konum = [u.lon, u.lat];
      if (u.ulke) {
        const f = ulkeFeat.get(u.ulke);
        if (!f) throw new Error(`${u.id}: ülke bulunamadı ${u.ulke}`);
        if (u.tur === 'nokta' && !geoContains(f, konum)) throw new Error(`${u.id}: (${u.lat}, ${u.lon}) ${u.ulke} sınırları dışında`);
      }
      if (u.tur === 'alan' && !(u.yaricapKm > 0)) throw new Error(`${u.id}: alan için yaricapKm gerekli`);
    }
    if (konum[0] < x0 || konum[0] > x1 || konum[1] < y0 || konum[1] > y1) throw new Error(`${u.id}: harita kapsamı dışında`);
    const [x, y] = proj(konum);
    const o = { id: u.id, ad: u.ad, kat: u.kat, tur: u.tur, x: +x.toFixed(1), y: +y.toFixed(1), not: u.not || '', ref: u.ref };
    if (u.tur === 'alan') o.yaricapKm = u.yaricapKm;
    if (u.tur === 'ulke') o.ulke = u.ulke;
    return o;
  });

  const sonuc = {
    id: bolge.id, baslik: bolge.baslik, genislik: GENISLIK, yukseklik,
    kmBirim: +kmBirim.toFixed(4), esikKm: bolge.esikKm, ulkeler, goller, nehirler, unsurlar: cikti,
  };
  Object.defineProperty(sonuc, '_projeksiyon', { value: proj, enumerable: false });
  return sonuc;
}

function main() {
  const kok = dirname(fileURLToPath(import.meta.url));
  const oku = (f) => JSON.parse(readFileSync(join(kok, 'veri', f + '.geojson'), 'utf8'));
  const geo = {
    ulkeler: oku('ne_50m_admin_0_countries'),
    goller: oku('ne_50m_lakes'),
    nehirler: oku('ne_50m_rivers_lake_centerlines'),
  };
  const indexHtml = readFileSync(join(kok, '../../index.html'), 'utf8');
  const hedef = join(kok, '../../assets/harita');
  mkdirSync(hedef, { recursive: true });
  const secilen = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(BOLGELER);
  for (const id of secilen) {
    const bolge = BOLGELER[id];
    if (!bolge) throw new Error(`Bilinmeyen bölge: ${id}`);
    const kaynak = join(kok, 'unsurlar', id + '.json');
    const unsurlar = existsSync(kaynak) ? JSON.parse(readFileSync(kaynak, 'utf8')) : [];
    const c = bolgeUret(bolge, geo, unsurlar, { indexHtml });
    writeFileSync(join(hedef, id + '.json'), JSON.stringify(c));
    console.log(`${id}: ${c.unsurlar.length} unsur, ${c.ulkeler.length} ülke, ${c.genislik}x${c.yukseklik}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
