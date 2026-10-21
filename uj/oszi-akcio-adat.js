
import {
  akcio, akcioSavHtml, akcioAjanlatHtml, datumIg,
  formazFt, lathatoNev, szobaSavSzoveg, futesJelzo, kepJpg, tized, slug, arDobozHtml,
} from './katalogus-elo.js?v=419ac543';

const NBSP = ' ';
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function fok(c) { return (c < 0 ? '−' + Math.abs(c) : String(c)) + NBSP + '°C'; }
export function felsorol(t, kot) {
  const k = kot || 'és';
  if (t.length < 2) return t.join('');
  return t.slice(0, -1).join(', ') + ' ' + k + ' ' + t[t.length - 1];
}

export function kepUtak(g, helyi) {
  const alap = String(g.kep_url || '').split('/').pop().replace(/\.webp$/, '');
  if (alap && helyi && helyi.includes(alap)) return { webp: `/kepek/gepek/${alap}-vagott.webp`, jpg: `/kepek/gepek/${alap}-vagott.jpg` };
  return { webp: g.kep_url || '', jpg: kepJpg(g.kep_url) };
}

export function tetelekBol(gepek, b, most, helyi) {
  const ki = [];
  for (const g of gepek) {
    const a = akcio(g, b, most);
    if (!a) continue;
    ki.push({ g, a, nev: lathatoNev(g, b), kep: kepUtak(g, helyi), arHtml: arDobozHtml(g, b, 'csom-ar', 'klímaberendezéssel és szereléssel', most) });
  }
  return ki.sort((x, y) => ((y.a.rendes - y.a.ar) - (x.a.rendes - x.a.ar)) || (x.a.ar - y.a.ar) || x.nev.localeCompare(y.nev));
}


function tenyek(g) {
  const ki = [];
  if (futesJelzo(g).fajta === 'fut') ki.push({ ertek: `${fok(g.futesi_hatar_c)}-ig`, cimke: 'fűt is' });
  if (g.scop != null) ki.push({ ertek: tized(g.scop), cimke: 'SCOP (fűtés)' });
  if (g.energia_osztaly) ki.push({ ertek: g.energia_osztaly, cimke: 'energiaosztály' });
  if (g.garancia) ki.push({ ertek: g.garancia, cimke: 'garancia a klímaberendezésre' });
  return ki;
}

export function gepKartyaHtml(t) {
  const { g, a, nev, kep } = t;
  const fj = futesJelzo(g);
  const forras = 'akcio-' + slug(nev);
  const marka = String(g.marka || '');
  const cim = marka && nev.toLowerCase().startsWith(marka.toLowerCase() + ' ')
    ? `<span class="csom-sorozat-marka">${esc(nev.slice(0, marka.length))}</span> ${esc(nev.slice(marka.length + 1))}` : esc(nev);
  const hely = szobaSavSzoveg(g);
  return `<li class="oa-gep" id="oa-kartya-${esc(g.id)}" data-akcio-vege="${a.vegeIso}" data-sav-ar="${a.ar}" data-sav-rendes="${a.rendes}" data-gep-id="${esc(g.id)}"`
    + ` data-oa-scop="${g.scop == null ? '' : esc(tized(g.scop))}" data-oa-hatar="${fj.fajta === 'fut' ? g.futesi_hatar_c : ''}"`
    + ` data-oa-gar="${esc(g.garancia || '')}" data-oa-wifi="${g.wifi ? '1' : ''}" data-oa-megj="${esc(a.megjegyzes || '')}">`
    + `<article class="csom-kartya oa-gep-kartya" aria-labelledby="oa-gep-${esc(g.id)}">`
    + `<picture class="csom-kep"><source srcset="${esc(kep.webp)}" type="image/webp"><img src="${esc(kep.jpg)}" width="640" height="640" loading="lazy" decoding="async" alt="${esc(nev)} beltéri és kültéri egysége"></picture>`
    + `<div class="csom-torzs">`
    + (a.rendes > a.ar ? `<p class="oa-gep-kedv">${esc(formazFt(a.rendes - a.ar))} kedvezmény</p>` : '')
    + `<h3 class="csom-sorozat" id="oa-gep-${esc(g.id)}">${cim}</h3>`
    + (hely ? `<p class="csom-egy">${esc(hely)}</p>` : '')
    + `<div class="oa-gep-sor">${t.arHtml}`
    + `<ul class="csom-tenyek">${tenyek(g).map((x) => `<li><b>${esc(x.ertek)}</b><span>${esc(x.cimke)}</span></li>`).join('')}</ul>`
    + `<div class="csom-gombok"><a class="gomb gomb-fo gep-kerem gep-valaszt" href="#ajanlatkeres" data-gep="${esc(nev)}" data-gep-id="${esc(g.id)}" data-ar="${esc(formazFt(a.ar))}" data-cta-forras="${esc(forras)}">Ezt kérem felmérésre</a></div>`
    + `</div></div></article></li>`;
}

export function visszaszamlaloHtml(tetelek, most) {
  const h = akcioSavHtml(tetelek.map((t) => ({ ...t.a, nev: t.nev, href: '#', kep: '', cel: null, meret: null })), most);
  const i = h.indexOf('<span class="akcio-ora"'), j = h.indexOf('<span class="akcio-sav-nyito"');
  if (i < 0 || j < i) throw new Error('oszi-akcio: the countdown markup was not found in akcioSavHtml()');
  return h.slice(i, j).trim();
}

export function heroOraHtml(tetelek, most) {
  if (!tetelek.length) return '';
  return visszaszamlaloHtml(tetelek, most).replace('<span class="akcio-ora"', '<span class="akcio-ora oa-ar-ora" data-akcio-ora-kovet');
}

export function kedvezmenyHtml(lista) {
  return lista.length ? akcioAjanlatHtml(lista, { csakKedvezmeny: true }) : '';
}

function lapozoHtml(db) {
  const nyil = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<div class="oa-lapozo" data-oa-lapozo hidden>`
    + `<button type="button" class="oa-lapoz" data-oa-lapoz="-1" aria-controls="oa-gepek" aria-label="Előző gép">${nyil('M15 5l-7 7 7 7')}</button>`
    + `<span class="oa-lapozo-hol" data-oa-lapozo-hol aria-live="polite">1 / ${db}</span>`
    + `<button type="button" class="oa-lapoz" data-oa-lapoz="1" aria-controls="oa-gepek" aria-label="Következő gép">${nyil('M9 5l7 7-7 7')}</button>`
    + `</div>`;
}

const SZAM_SZO = ['', 'Egy', 'Két', 'Három', 'Négy', 'Öt'];
export function panelCim() {
  return 'Fűtő klíma felszerelve,';
}
export function panelValaszt(db) {
  return db >= 2 ? `${SZAM_SZO[db] || String(db)} akciós klímaberendezés közül választhatsz. ` : '';
}
export function panelAl(megj) {
  const m = String(megj || '').trim();
  return (m ? m.charAt(0).toUpperCase() + m.slice(1) + '. ' : '')
    + 'A felmérés, a döntés és a szerelés külön nap: ha ezen a télen már fűtenél vele, ne az utolsó hétre hagyd.';
}
export function nyitSzoveg(db) {
  if (db === 1) return 'Megnézem az ajánlatot';
  return SZAM_SZO[db] ? `Megnézem a ${SZAM_SZO[db].toLowerCase()} ajánlatot` : 'Megnézem az ajánlatokat';
}

export function panelHtml(tetelek, most, csoM) {
  if (!tetelek.length) return '';
  const elso = Math.min(...tetelek.map((t) => t.a.vege));
  const megj = [...new Set(tetelek.map((t) => t.a.megjegyzes).filter(Boolean))].join(', ');
  return `<div class="oa-elo" data-akcio-sav data-db="${tetelek.length}" data-megj="${esc(megj)}">`
    + `<div class="oa-akcio-fej"><div>`
    + `<h2 class="oa-csucs"><span data-oa-panel-cim>${esc(panelCim(tetelek.length))}</span> `
    + `<span class="oa-csucs-ig"><span data-oa="ig">${esc(datumIg(elso))}</span> olcsóbban.</span></h2>`
    + `<p class="oa-akcio-osszeg" data-akcio-ajanlat="kedvezmeny">${kedvezmenyHtml(tetelek.map((t) => t.a))}</p>`
    + `<p class="oa-akcio-al" data-oa-panel-al>${esc(panelAl(megj))}</p>`
    + `</div>${visszaszamlaloHtml(tetelek, most)}</div>`
    + (csoM ? `<p class="oa-akcio-benne"><span data-oa-panel-valaszt>${esc(panelValaszt(tetelek.length))}</span>Az ár a klímaberendezést, a szerelést és ${esc(String(csoM))}${NBSP}méter csövet tartalmazza.</p>` : '')
    + `<ul class="oa-gepek" id="oa-gepek" tabindex="0" aria-label="Akciós klímaberendezések">${tetelek.map(gepKartyaHtml).join('')}</ul>`
    + lapozoHtml(tetelek.length) + masikGepHtml() + `</div>`;
}

export const MASIK_GEP = 'Másik klímaberendezés, segítsetek választani';
export function masikGepHtml() {
  return `<div class="oa-masik"><p><b>Másik klímaberendezést szeretnél?</b> Nagyobb teljesítményt, más márkát vagy több helyiséget: ugyanitt kérd, a felmérésen segítünk választani.</p>`
    + `<a class="gomb gomb-vonal gep-valaszt" href="#ajanlatkeres" data-gep="${esc(MASIK_GEP)}" data-gep-id="masik" data-cta-forras="akcio-masik-gep">Másik klímaberendezést szeretnék</a></div>`;
}

export function kartyaAdat(t) {
  const fj = futesJelzo(t.g);
  return { ar: t.a.ar, rendes: t.a.rendes, vege: t.a.vege, scop: t.g.scop == null ? '' : tized(t.g.scop),
    hatar: fj.fajta === 'fut' ? t.g.futesi_hatar_c : null, gar: t.g.garancia || '', wifi: !!t.g.wifi, megj: t.a.megjegyzes || '' };
}
export function ertekek(lista) {
  if (!lista.length) return null;
  const arak = lista.map((x) => x.ar), meg = lista.map((x) => x.rendes - x.ar);
  const tol = Math.min(...arak), legtobb = Math.max(...meg);
  const scop = [...new Set(lista.map((x) => x.scop).filter(Boolean))].sort((p, q) => parseFloat(p.replace(',', '.')) - parseFloat(q.replace(',', '.')));
  const hatarok = lista.map((x) => x.hatar);
  const gar = [...new Set(lista.map((x) => x.gar).filter(Boolean))].sort();
  const evek = gar.every((x) => /^\d+ év$/.test(x)) ? gar.map((x) => x.replace(' év', '')) : null;
  return {
    db: lista.length,
    tol: formazFt(tol), tolJel: arak.some((x) => x !== tol) ? '-tól' : '',
    meg: legtobb > 0 ? formazFt(legtobb) : '', akar: meg.some((x) => x !== legtobb) ? 'akár ' : '',
    ig: datumIg(Math.min(...lista.map((x) => x.vege))),
    scop: scop.length ? felsorol(scop) : '',
    hatar: hatarok.every((h) => h != null && h < 0) ? fok(Math.max(...hatarok)) : '',
    gar: gar.length ? (evek ? felsorol(evek, 'vagy') + ' év' : felsorol(gar, 'vagy')) : '',
    wifi: lista.every((x) => x.wifi) ? '1' : '',
    megj: [...new Set(lista.map((x) => x.megj).filter(Boolean))].join(', '),
    nyit: nyitSzoveg(lista.length),
  };
}

export const CIM_LEJART = 'Fűtő klíma felszerelve, ingyenes felméréssel | Nexus Klíma';
export function cimSzoveg(e) {
  if (!e) return CIM_LEJART;
  return e.meg ? `Fűtő klíma őszi akció, ${e.akar}${e.meg} kedvezménnyel | Nexus Klíma` : 'Fűtő klíma őszi akció | Nexus Klíma';
}
