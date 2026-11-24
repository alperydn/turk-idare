import { test } from 'node:test';
import assert from 'node:assert/strict';
import { turSec, dogruMu, puanla, seyrelt, enIyiPuan, enIyiKaydet } from '../../../assets/harita-core.js';

const unsurlar = Array.from({ length: 30 }, (_, i) => ({
  id: 'u' + i, kat: i < 12 ? 'baskent' : 'eser', tur: 'nokta', x: i, y: i,
}));

test('turSec yalnızca seçili kategoriden, istenen sayıda, tekrarsız seçer', () => {
  const t = turSec(unsurlar, ['baskent'], 10);
  assert.equal(t.length, 10);
  assert.ok(t.every((u) => u.kat === 'baskent'));
  assert.equal(new Set(t.map((u) => u.id)).size, 10);
});

test("turSec 'hepsi' ile eşleşenlerin tümünü döndürür", () => {
  assert.equal(turSec(unsurlar, ['eser'], 'hepsi').length, 18);
});

test('turSec eşleşen azsa hepsini döndürür', () => {
  const az = unsurlar.slice(0, 5);
  assert.equal(turSec(az, ['baskent'], 10).length, 5);
});

test('turSec rastgele kaynağı kullanır (farklı tohumda farklı sıra)', () => {
  let s = 1;
  const r1 = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const a = turSec(unsurlar, ['baskent', 'eser'], 10, r1).map((u) => u.id).join();
  s = 99;
  const b = turSec(unsurlar, ['baskent', 'eser'], 10, r1).map((u) => u.id).join();
  assert.notEqual(a, b);
});

const harita = { kmBirim: 2, esikKm: 150 };
const hayir = () => false;

test('dogruMu nokta: eşiğin içi doğru, dışı yanlış', () => {
  const u = { tur: 'nokta', x: 0, y: 0 };
  assert.equal(dogruMu(u, { x: 74, y: 0 }, harita, hayir), true); // 148 km
  assert.equal(dogruMu(u, { x: 76, y: 0 }, harita, hayir), false); // 152 km
});

test('dogruMu alan: eşiğe yarıçap eklenir', () => {
  const u = { tur: 'alan', x: 0, y: 0, yaricapKm: 100 };
  assert.equal(dogruMu(u, { x: 0, y: 120 }, harita, hayir), true); // 240 ≤ 250
  assert.equal(dogruMu(u, { x: 0, y: 130 }, harita, hayir), false); // 260
});

test('dogruMu yerleştirilmemiş unsur için yanlış', () => {
  assert.equal(dogruMu({ tur: 'nokta', x: 0, y: 0 }, null, harita, hayir), false);
});

test('dogruMu ulke türünü geri çağrıya devreder', () => {
  const cagri = [];
  const ulkeIcinde = (a3, x, y) => { cagri.push([a3, x, y]); return a3 === 'UZB'; };
  assert.equal(dogruMu({ tur: 'ulke', ulke: 'UZB', x: 0, y: 0 }, { x: 500, y: 9 }, harita, ulkeIcinde), true);
  assert.deepEqual(cagri, [['UZB', 500, 9]]);
  assert.equal(dogruMu({ tur: 'ulke', ulke: 'KAZ', x: 0, y: 0 }, { x: 1, y: 1 }, harita, ulkeIcinde), false);
});

test('puanla doğru, yanlış ve boşları ayırır; puan yüzdedir', () => {
  const tur = [
    { id: 'a', tur: 'nokta', x: 0, y: 0 },
    { id: 'b', tur: 'nokta', x: 100, y: 100 },
    { id: 'c', tur: 'nokta', x: 200, y: 200 },
    { id: 'd', tur: 'nokta', x: 300, y: 300 },
  ];
  const yerler = new Map([['a', { x: 1, y: 1 }], ['b', { x: 101, y: 99 }], ['c', { x: 900, y: 900 }]]);
  const p = puanla(tur, yerler, harita, hayir);
  assert.deepEqual(p.dogru, ['a', 'b']);
  assert.deepEqual(p.yanlis, ['c']);
  assert.deepEqual(p.bos, ['d']);
  assert.equal(p.puan, 50);
});

test('puanla boş turda 0 verir', () => {
  assert.equal(puanla([], new Map(), harita, hayir).puan, 0);
});

test('seyrelt çakışanlardan yüksek öncelikliyi tutar', () => {
  const g = seyrelt([
    { id: 'dusuk', x: 0, y: 0, w: 50, h: 10, oncelik: 1 },
    { id: 'yuksek', x: 20, y: 5, w: 50, h: 10, oncelik: 5 },
    { id: 'uzak', x: 200, y: 200, w: 50, h: 10, oncelik: 0 },
  ]);
  assert.ok(g.has('yuksek'));
  assert.ok(!g.has('dusuk'));
  assert.ok(g.has('uzak'));
});

test('seyrelt değen ama örtüşmeyen kutuları ikisini de gösterir', () => {
  const g = seyrelt([
    { id: 'a', x: 0, y: 0, w: 10, h: 10, oncelik: 1 },
    { id: 'b', x: 10, y: 0, w: 10, h: 10, oncelik: 1 },
  ]);
  assert.equal(g.size, 2);
});

const sahteDepo = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('enIyiKaydet yalnızca rekorda true döner ve saklar', () => {
  const d = sahteDepo();
  assert.equal(enIyiPuan('osmanli', d), null);
  assert.equal(enIyiKaydet('osmanli', 60, d), true);
  assert.equal(enIyiKaydet('osmanli', 50, d), false);
  assert.equal(enIyiPuan('osmanli', d), 60);
  assert.equal(enIyiPuan('avrupa', d), null);
});

test('enIyiPuan depo hata verirse null döner', () => {
  const bozuk = { getItem: () => { throw new Error('gizli mod'); }, setItem: () => { throw new Error('x'); } };
  assert.equal(enIyiPuan('islam', bozuk), null);
  assert.equal(enIyiKaydet('islam', 10, bozuk), false);
});
