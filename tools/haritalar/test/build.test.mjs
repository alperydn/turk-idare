import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bolgeUret } from '../build.mjs';

const kutu = (a3, [x0, y0, x1, y1]) => ({
  type: 'Feature',
  properties: { ADM0_A3: a3 },
  // RFC 7946 sırası (saat yönü tersi) — Natural Earth dosyaları da böyle.
  geometry: { type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] },
});
const bos = { type: 'FeatureCollection', features: [] };
const geo = {
  ulkeler: { type: 'FeatureCollection', features: [kutu('UZB', [56, 37, 73, 46]), kutu('KAZ', [46, 46, 87, 55])] },
  goller: bos,
  nehirler: bos,
};
const bolge = {
  id: 'deneme', baslik: 'Deneme', kapsam: [[44, 32], [96, 56]], paralel: [38, 50], esikKm: 150, nehirler: [],
};
const html = '<h3 id="b3-sehirler">x</h3>';
const taskent = { id: 'taskent', ad: 'Taşkent', kat: 'baskent', tur: 'nokta', lat: 41.31, lon: 69.28, ulke: 'UZB', not: 'Başkent', ref: 'b3-sehirler' };
const uret = (unsurlar) => bolgeUret(bolge, geo, unsurlar, { indexHtml: html });

test('nokta unsuru harita sınırları içinde SVG koordinatı alır', () => {
  const c = uret([taskent]);
  const u = c.unsurlar[0];
  assert.ok(u.x > 0 && u.x < c.genislik, `x=${u.x}`);
  assert.ok(u.y > 0 && u.y < c.yukseklik, `y=${u.y}`);
  assert.equal(c.genislik, 1000);
  assert.equal(c.ulkeler.length, 2);
  assert.ok(c.ulkeler[0].d.startsWith('M'));
});

test('beyan edilen ülkenin dışındaki nokta reddedilir', () => {
  assert.throws(() => uret([{ ...taskent, ulke: 'KAZ' }]), /taskent.*KAZ/);
});

test('yinelenen id reddedilir', () => {
  assert.throws(() => uret([taskent, { ...taskent }]), /yinelenen.*taskent/i);
});

test('bilinmeyen kategori reddedilir', () => {
  assert.throws(() => uret([{ ...taskent, kat: 'dil' }]), /kategori/i);
});

test('index.html içinde olmayan ref reddedilir', () => {
  assert.throws(() => uret([{ ...taskent, ref: 'yok-boyle-bir-id' }]), /ref/i);
});

test('ulke türü unsur poligon merkezine yerleşir ve a3 taşır', () => {
  const c = uret([{ id: 'ozbekistan', ad: 'Özbekistan', kat: 'ulke', tur: 'ulke', ulke: 'UZB', not: '', ref: 'b3-sehirler' }]);
  assert.equal(c.unsurlar[0].ulke, 'UZB');
  assert.ok(c.unsurlar[0].x > 0);
});

test('kmBirim harita merkezindeki gerçek ölçüyle tutarlı', () => {
  const c = uret([]);
  const lat = 44, km1derece = 111.32 * Math.cos((lat * Math.PI) / 180);
  const a = c._projeksiyon([69, lat]), b = c._projeksiyon([70, lat]);
  const birim = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const beklenen = km1derece / birim;
  assert.ok(Math.abs(c.kmBirim - beklenen) / beklenen < 0.05, `${c.kmBirim} vs ${beklenen}`);
});

test('kapsamın köşeleri haritanın kenarlarına yakın düşer (ölçek doğru)', () => {
  const c = uret([]);
  const [bx, by] = c._projeksiyon([70, 32]); // güney kenarın ortası
  const [tx, ty] = c._projeksiyon([70, 56]); // kuzey kenarın ortası
  assert.ok(by > c.yukseklik * 0.8, `güney y=${by}`);
  assert.ok(ty < c.yukseklik * 0.3, `kuzey y=${ty}`);
  const [wx] = c._projeksiyon([44, 44]), [ex] = c._projeksiyon([96, 44]);
  assert.ok(wx < 100 && ex > 900, `batı ${wx} doğu ${ex}`);
});
