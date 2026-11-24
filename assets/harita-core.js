// Harita alıştırmasının DOM'suz çekirdek mantığı (tarayıcıda ve Node testlerinde kullanılır).

// Seçili kategorilerden rastgele, tekrarsız tur seçer. boyut: sayı ya da 'hepsi'.
export function turSec(unsurlar, kategoriler, boyut, rastgele = Math.random) {
  const havuz = unsurlar.filter((u) => kategoriler.includes(u.kat));
  for (let i = havuz.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele() * (i + 1));
    [havuz[i], havuz[j]] = [havuz[j], havuz[i]];
  }
  return boyut === 'hepsi' ? havuz : havuz.slice(0, boyut);
}

// Bırakılan yer doğru mu? ulkeIcinde(a3, x, y) ülke türü için çağrılır.
export function dogruMu(unsur, yer, harita, ulkeIcinde) {
  if (!yer) return false;
  if (unsur.tur === 'ulke') return ulkeIcinde(unsur.ulke, yer.x, yer.y);
  const km = Math.hypot(yer.x - unsur.x, yer.y - unsur.y) * harita.kmBirim;
  const esik = harita.esikKm + (unsur.tur === 'alan' ? unsur.yaricapKm || 0 : 0);
  return km <= esik;
}

export function puanla(tur, yerler, harita, ulkeIcinde) {
  const dogru = [], yanlis = [], bos = [];
  for (const u of tur) {
    const yer = yerler.get(u.id);
    if (!yer) bos.push(u.id);
    else if (dogruMu(u, yer, harita, ulkeIcinde)) dogru.push(u.id);
    else yanlis.push(u.id);
  }
  const puan = tur.length ? Math.round((dogru.length / tur.length) * 100) : 0;
  return { dogru, yanlis, bos, puan };
}

// Açgözlü etiket seyreltme: öncelik sırasıyla, öncekilerle örtüşmeyenleri göster.
export function seyrelt(kutular) {
  const sirali = [...kutular].sort((a, b) => b.oncelik - a.oncelik);
  const kabul = [];
  const gorunur = new Set();
  for (const k of sirali) {
    const carpisir = kabul.some((o) => k.x < o.x + o.w && o.x < k.x + k.w && k.y < o.y + o.h && o.y < k.y + k.h);
    if (!carpisir) { kabul.push(k); gorunur.add(k.id); }
  }
  return gorunur;
}

const anahtar = (bolgeId) => `harita-eniyi-${bolgeId}`;

export function enIyiPuan(bolgeId, depo = globalThis.localStorage) {
  try {
    const v = depo.getItem(anahtar(bolgeId));
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

export function enIyiKaydet(bolgeId, puan, depo = globalThis.localStorage) {
  try {
    const eski = enIyiPuan(bolgeId, depo);
    if (eski !== null && puan <= eski) return false;
    depo.setItem(anahtar(bolgeId), puan);
    return true;
  } catch {
    return false;
  }
}
