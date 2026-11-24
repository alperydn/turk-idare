// Uçtan uca test: node tools/haritalar/e2e.mjs  (depo kökünde `python3 -m http.server 8765` açıkken)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const req = createRequire(import.meta.url);
let pw;
try { pw = req('playwright'); } catch { pw = createRequire('/opt/node-tools/node_modules/')('playwright'); }
const { chromium, devices } = pw;
const BASE = process.env.BASE || 'http://localhost:8765';
const veri = JSON.parse(readFileSync(new URL('../../assets/harita/orta-asya.json', import.meta.url)));
const bul = (id) => veri.unsurlar.find((u) => u.id === id);

async function ekranKonumu(p, x, y) {
  return p.evaluate(([x, y]) => {
    const m = document.querySelector('#hbHarita svg').getScreenCTM();
    return { x: m.a * x + m.e, y: m.d * y + m.f };
  }, [x, y]);
}

async function surukle(p, kaynak, hedef) {
  const k = await kaynak.boundingBox();
  await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await p.mouse.move(k.x + k.width / 2 + ((hedef.x - k.x - k.width / 2) * i) / 8, k.y + k.height / 2 + ((hedef.y - k.y - k.height / 2) * i) / 8);
  }
  await p.mouse.up();
}

async function senaryo(ad, ctxAyar) {
  const b = await chromium.launch();
  const ctx = await b.newContext(ctxAyar);
  const p = await ctx.newPage();
  const hatalar = [];
  p.on('pageerror', (e) => hatalar.push(e.message));
  p.on('console', (m) => m.type() === 'error' && hatalar.push(m.text()));

  // Çalış modu
  await p.goto(`${BASE}/harita/orta-asya.html`);
  await p.waitForSelector('.hb-isaret[data-id="semerkant"]', { state: 'attached' });

  // Alıştırma: 10'luk tur
  await p.click('.hb-mod button[data-mod="alistirma"]');
  await p.selectOption('#hbBoyut', '10');
  await p.waitForFunction(() => document.querySelectorAll('.hb-oge').length === 10);
  const ids = await p.$$eval('.hb-oge', (l) => l.map((e) => e.dataset.id));

  // 1) doğru yere
  const u1 = bul(ids[0]);
  await surukle(p, p.locator(`.hb-oge[data-id="${u1.id}"]`), await ekranKonumu(p, u1.x, u1.y));
  // 2) uzak köşeye (yanlış)
  const u2 = bul(ids[1]);
  const kose = { x: u2.x < veri.genislik / 2 ? veri.genislik - 15 : 15, y: u2.y < veri.yukseklik / 2 ? veri.yukseklik - 15 : 15 };
  await surukle(p, p.locator(`.hb-oge[data-id="${u2.id}"]`), await ekranKonumu(p, kose.x, kose.y));
  await p.click('#hbKontrol');
  assert.equal(await p.locator('.hb-yerlesik.dogru').count(), 1, `${ad}: bir doğru bekleniyordu`);
  assert.equal(await p.locator('.hb-yerlesik.yanlis').count(), 1, `${ad}: bir yanlış bekleniyordu`);
  assert.match(await p.textContent('#hbPuan'), /Puan: 10 \(1\/10\)/);

  // 3) yakınlaştırılmış haritada doğru yere (hedefin üstünde tekerlekle yakınlaştır)
  const u3 = bul(ids[2]);
  const ilk = await ekranKonumu(p, u3.x, u3.y);
  await p.mouse.move(ilk.x, ilk.y);
  await p.mouse.wheel(0, -200);
  await p.mouse.wheel(0, -200);
  const vb = await p.getAttribute('#hbHarita svg', 'viewBox');
  assert.ok(+vb.split(' ')[2] < veri.genislik * 0.9, `${ad}: yakınlaşmadı (${vb})`);
  await surukle(p, p.locator(`.hb-oge[data-id="${u3.id}"]`), await ekranKonumu(p, u3.x, u3.y));
  await p.click('#hbKontrol');
  assert.equal(await p.locator('.hb-yerlesik.dogru').count(), 2, `${ad}: yakınlaştırılmışken doğru yerleştirme`);

  // 4) yerleşmiş unsuru listeye geri sürükle
  const liste = await p.locator('#hbListe').boundingBox();
  await surukle(p, p.locator(`.hb-yerlesik[data-id="${u3.id}"] .n`), { x: liste.x + liste.width / 2, y: liste.y + liste.height / 2 });
  await p.waitForSelector(`.hb-oge[data-id="${u3.id}"]`);

  // 5) ana sayfadan bağlantı ve dört sayfa
  await p.goto(`${BASE}/index.html`);
  await p.click('a[href="harita/index.html"]');
  await p.waitForURL(/harita\/index\.html$/);
  for (const r of ['orta-asya', 'osmanli', 'avrupa', 'islam']) {
    const yanit = await p.goto(`${BASE}/harita/${r}.html`);
    assert.equal(yanit.status(), 200);
    await p.waitForSelector('svg .hb-ulke', { state: 'attached' });
  }
  assert.deepEqual(hatalar, [], `${ad}: konsol hataları`);
  await b.close();
  console.log(`ok - ${ad}`);
}

await senaryo('masaüstü', { viewport: { width: 1280, height: 800 } });
await senaryo('mobil', { ...devices['iPhone 13'] });
