
import { meretez } from './meretezes.js?v=9202a0a2';
import { meretIllik } from './ajanlas.js?v=e570a26c';

const AR_SZERU = /beszerz|beszallit|netto|brutto|price|cikkszam/i;

export function beallitas() {
  const el = document.getElementById('katalogus-beallitas');
  if (!el) return null;
  try {
    const b = JSON.parse(el.textContent);
    if (!b || typeof b.vegpont !== 'string' || !Number.isInteger(b.telepites_ft)) return null;
    return b;
  } catch (_) { return null; }
}

export function kapu(valasz, b) {
  if (!valasz || valasz.ok !== true) throw new Error('a valasz nem ok=true');
  const gepek = valasz.gepek;
  if (!Array.isArray(gepek) || !gepek.length) throw new Error('nincs gepek lista');
  if (valasz.darab !== gepek.length) throw new Error('darab != gepek.length');
  const engedett = new Set(b.engedett_mezok || []);
  const tiltott = new Set(b.tiltott_mezok || []);
  for (const g of gepek) {
    if (!g || typeof g !== 'object') throw new Error('nem objektum sor');
    for (const k of Object.keys(g)) {
      if (tiltott.has(k) || !engedett.has(k) || AR_SZERU.test(k)) throw new Error('nem engedett mezo: ' + k);
    }
    if (typeof g.id !== 'string' || typeof g.termeknev !== 'string') throw new Error('sor id/termeknev nelkul');
    if (g.ar_ft != null && !(Number.isInteger(g.ar_ft) && g.ar_ft > 0)) throw new Error('ar_ft nem pozitiv egesz: ' + g.termeknev);
    if (g.akcios_ar_ft != null && !(Number.isInteger(g.akcios_ar_ft) && g.akcios_ar_ft > 0)) throw new Error('akcios_ar_ft nem pozitiv egesz: ' + g.termeknev);
    if (g.akcio_vege != null && !Number.isFinite(Date.parse(g.akcio_vege))) throw new Error('akcio_vege nem datum: ' + g.termeknev);
  }
  return gepek;
}

export async function katalogusLeker(b, fetchFn) {
  const f = fetchFn || ((u, o) => fetch(u, o));
  try {
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ac ? setTimeout(() => ac.abort(), 10000) : null;
    let res;
    try {
      res = await f(b.vegpont, { method: 'GET', headers: { accept: 'application/json' }, signal: ac ? ac.signal : undefined });
    } finally { if (t) clearTimeout(t); }
    if (!res || !res.ok) { console.info('katalogus: a vegpont nem valaszolt (' + (res && res.status) + '), marad a sult tartalom'); return null; }
    const adat = await res.json();
    return rendez(kapu(adat, b));
  } catch (e) {
    console.info('katalogus: nem frissult, marad a sult tartalom: ' + (e && e.message));
    return null;
  }
}

export function rendez(gepek) {
  const k = (g) => [g.kategoria || '', g.marka || '', g.hutesi_kw || 0, g.termeknev];
  return gepek.slice().sort((a, b) => {
    const x = k(a), y = k(b);
    for (let i = 0; i < 4; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; }
    return 0;
  });
}

export function slug(s) {
  return String(s).normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
export function horgony(g) { return 'gep-' + slug(g.termeknev); }
export function lathatoNev(g, b) { return (b.lathato_nev && b.lathato_nev[g.termeknev]) || g.termeknev; }

export function felszereltFt(g, b) {
  return (Number.isInteger(g.ar_ft) && g.ar_ft > 0) ? g.ar_ft + b.telepites_ft : null;
}
export function akcio(g, b, most) {
  const rendes = felszereltFt(g, b);
  if (rendes == null || !g) return null;
  const a = g.akcios_ar_ft;
  if (!Number.isInteger(a) || a <= 0 || a >= g.ar_ft) return null;
  const vege = Date.parse(g.akcio_vege);
  if (!Number.isFinite(vege) || vege <= (most == null ? Date.now() : most)) return null;
  const min = (Number.isInteger(g.ar_30_nap_min) && g.ar_30_nap_min > 0) ? Math.min(g.ar_30_nap_min, g.ar_ft) : g.ar_ft;
  const m = typeof g.akcio_megjegyzes === 'string' ? g.akcio_megjegyzes.trim() : '';
  const ath = (Number.isInteger(g.akcio_athuzott_ar_ft) && g.akcio_athuzott_ar_ft > a) ? g.akcio_athuzott_ar_ft : g.ar_ft;
  const sajat = typeof g.akcio_sajat_sor === 'string' ? g.akcio_sajat_sor.trim() : '';
  const also = g.akcio_also_sor === 'nincs' ? null
    : g.akcio_also_sor === 'sajat' ? (sajat || null)
    : `Az elmúlt 30 nap legalacsonyabb ára: ${formazFt(min + b.telepites_ft).replace(/ /g, '\u00a0')}.`;
  return { ar: a + b.telepites_ft, rendes: ath + b.telepites_ft, vege, vegeIso: new Date(vege).toISOString(), megjegyzes: m || null, min30: min + b.telepites_ft, also };
}

const IG_UTOLSO = { 1: 'éig', 2: 'éig', 3: 'áig', 4: 'éig', 5: 'éig', 6: 'áig', 7: 'éig', 8: 'áig', 9: 'éig' };
const IG_KEREK = { 10: 'éig', 20: 'áig', 30: 'áig' };
function budapestReszek(ms) {
  const r = {};
  for (const x of new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms))) r[x.type] = x.value;
  return r;
}
export function datumIg(ms) {
  const r = budapestReszek(ms);
  const nap = Number(r.day);
  const ido = `${r.hour}:${r.minute}`;
  if (ido !== '23:59') return `${r.month} ${nap}., ${ido}-ig`;
  const rag = nap === 1 ? 'jéig' : nap === 2 ? 'áig' : (IG_KEREK[nap] || IG_UTOLSO[nap % 10]);
  return `${r.month} ${nap}-${rag}`;
}
export function datumIso(ms) {
  const r = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms))) r[x.type] = x.value;
  return `${r.year}-${r.month}-${r.day}`;
}
export function akcioSorSzoveg(a) {
  return `Akció ${datumIg(a.vege)}${a.megjegyzes ? ', ' + a.megjegyzes : ''}.${a.also ? ' ' + a.also : ''}`;
}
export function akcioSorHtml(a) {
  return `<p class="akcio-sor" data-akcio-vege="${a.vegeIso}">${esc(akcioSorSzoveg(a))}</p>`;
}
export function akcioArAttr(a, rendesSzoveg) {
  return `data-akcio-vege="${a.vegeIso}" data-rendes="${esc(rendesSzoveg)}"`;
}
export function arDobozHtml(g, b, osztaly, utotag, most) {
  const ar = felszereltFt(g, b);
  if (ar == null) return '';
  const a = akcio(g, b, most);
  if (!a) return `<div class="${osztaly}"><b data-mezo="ar">${esc(formazFt(ar))}</b> <span>${esc(utotag)}</span></div>`;
  return `<div class="${osztaly}"><s class="akcio-regi">${esc(formazFt(a.rendes))}</s> <b data-mezo="ar" ${akcioArAttr(a, formazFt(a.rendes))}>${esc(formazFt(a.ar))}</b> <span>${esc(utotag)}</span></div>`
    + akcioSorHtml(a);
}

export function visszaszamlaloReszek(ms, most) {
  const s = Math.max(0, Math.floor((ms - (most == null ? Date.now() : most)) / 1000));
  const t = Math.floor(s / 60);
  return { nap: Math.floor(t / 1440), ora: Math.floor((t % 1440) / 60), perc: t % 60, mp: s % 60 };
}
export const AKCIO_CIM = 'Akciós klíma\u00ADberendezések';
export function akcioCim(db) { return db === 1 ? 'Akciós klíma\u00ADberendezés' : AKCIO_CIM; }
export function akcioNyitSzoveg(db) { return db === 1 ? 'Megnézem az akciós klímaberendezést' : 'Megnézem az akciós klímaberendezéseket'; }
export function akcioAlcim(elso, megj) {
  return `Olcsóbban ${datumIg(elso)}${megj ? ', ' + megj : ''}.`;
}
export function akcioAjanlatHtml(tetelek, { csakKedvezmeny = false } = {}) {
  const arak = tetelek.map((t) => t.ar), meg = tetelek.map((t) => t.rendes - t.ar);
  const tol = Math.min(...arak), legtobb = Math.max(...meg);
  const tolJel = arak.some((x) => x !== tol) ? '<small>-tól</small>' : '';
  const akar = meg.some((x) => x !== legtobb);
  if (csakKedvezmeny) {
    return legtobb > 0 ? `<span class="akcio-sav-kedv" data-akcio-meg><b>${akar ? '<small>Akár</small> ' : ''}${esc(formazFt(legtobb))}</b><span>kedvezmény</span></span>` : '';
  }
  return `<span class="akcio-sav-tol"><b data-akcio-tol>${esc(formazFt(tol))}${tolJel}</b><span>klímaberendezéssel és szereléssel</span></span>`
    + (legtobb > 0 ? `<span class="akcio-sav-meg" data-akcio-meg>${akar ? 'Akár ' : ''}${esc(formazFt(legtobb))} kedvezmény</span>` : '');
}
export const AKCIO_KEP_DB = 3;
export function akcioKepekHtml(tetelek) {
  const kepes = tetelek.filter((t) => t.kep);
  if (!kepes.length) return '';
  const n = tetelek.length, ketto = Math.min(kepes.length, 2), harom = Math.min(kepes.length, AKCIO_KEP_DB);
  return kepes.slice(0, AKCIO_KEP_DB).map((t, i) => `<span class="akcio-sav-kep${i >= 2 ? ' akcio-sav-kep--szeles' : ''}" data-href="${esc(t.href)}"><img src="${esc(t.kep)}" alt="" width="160" height="160" decoding="async"></span>`).join('')
    + (n > ketto ? `<span class="akcio-sav-tobb akcio-sav-tobb--telefon">+${n - ketto}</span>` : '')
    + (n > harom ? `<span class="akcio-sav-tobb akcio-sav-tobb--szeles">+${n - harom}</span>` : '');
}
export function akcioSavHtml(tetelek, most) {
  if (!tetelek.length) return '';
  tetelek = tetelek.slice().sort((x, y) => (y.rendes - y.ar) - (x.rendes - x.ar) || x.ar - y.ar);
  const elso = Math.min(...tetelek.map((t) => t.vege));
  const r = visszaszamlaloReszek(elso, most);
  const elsoNap = datumIso(elso);
  const megj = [...new Set(tetelek.map((t) => t.megjegyzes).filter(Boolean))].join(', ');
  const sorok = tetelek.map((t) => {
    const kulon = datumIso(t.vege) !== elsoNap ? `<span class="akcio-tetel-ig">${esc(datumIg(t.vege))}</span>` : '';
    const kep = t.kep ? `<span class="akcio-tetel-kep"><img src="${esc(t.kep)}" alt="" width="160" height="160" loading="lazy" decoding="async"></span>` : '';
    return `<li data-akcio-vege="${t.vegeIso}" data-sav-ar="${t.ar}" data-sav-rendes="${t.rendes}"${t.kep ? ` data-sav-kep="${esc(t.kep)}"` : ''}><a class="akcio-tetel" href="${esc(t.href)}"${t.cel ? ` data-csom-cel="${esc(t.cel)}"` : ''}>`
      + (t.rendes > t.ar ? `<span class="akcio-tetel-megtak">${esc(formazFt(t.rendes - t.ar))} kedvezmény</span>` : '') + kep
      + `<span class="akcio-tetel-adat"><span class="akcio-tetel-nev">${esc(t.nev)}</span>`
      + (t.meret ? `<span class="akcio-tetel-meret">${esc(t.meret)}</span>` : '') + kulon
      + `<span class="akcio-tetel-ar"><s class="akcio-regi">${esc(formazFt(t.rendes))}</s> <b>${esc(formazFt(t.ar))}</b></span>`
      + (t.also ? `<span class="akcio-tetel-min">${esc(t.also)}</span>` : '')
      + `<span class="akcio-tetel-gomb" aria-hidden="true">Ezt választom</span>`
      + `</span></a></li>`;
  }).join('');
  const kepek = akcioKepekHtml(tetelek);
  return `<details class="akcio-sav" id="akcio" data-akcio-sav data-db="${tetelek.length}" data-megj="${esc(megj)}">
    <summary class="akcio-sav-fej">
      <span class="akcio-sav-szoveg"><h3 class="akcio-sav-cim" data-akcio-fejcim>${esc(akcioCim(tetelek.length))}</h3><span class="akcio-sav-alcim" data-akcio-cim>${esc(akcioAlcim(elso, megj))}</span></span>
      <span class="akcio-sav-ajanlat" data-akcio-ajanlat="kedvezmeny">${akcioAjanlatHtml(tetelek, { csakKedvezmeny: true })}</span>
      <span class="akcio-sav-kepek" aria-hidden="true" data-akcio-kepek${kepek ? '' : ' hidden'}>${kepek}</span>
      <span class="akcio-ora" aria-live="off"><span class="akcio-ora-elo">Még</span> <span class="akcio-ora-db"${r.nap ? '' : ' hidden'}><b data-ido="nap">${r.nap}</b> nap</span> <span class="akcio-ora-db"><b data-ido="ora">${r.ora}</b> óra</span> <span class="akcio-ora-db"><b data-ido="perc">${r.perc}</b> perc</span> <span class="akcio-ora-db"><b data-ido="mp">${r.mp}</b> mp</span></span>
      <span class="akcio-sav-nyito" aria-hidden="true"><span class="akcio-nyit" data-akcio-nyit>${esc(akcioNyitSzoveg(tetelek.length))}</span><span class="akcio-zar">Elrejtem</span></span>
    </summary>
    <ul class="akcio-sav-lista">${sorok}</ul>
  </details>`;
}

export function formazFt(n) {
  const s = String(Math.trunc(Math.abs(n)));
  let ki = '';
  for (let i = 0; i < s.length; i++) { if (i && (s.length - i) % 3 === 0) ki += ' '; ki += s[i]; }
  return (n < 0 ? '-' : '') + ki + ' Ft';
}

export function szam(v) { return v == null ? null : String(Number(v)).replace('.', ','); }
export function tized(v) { return v == null ? null : (Math.round(Number(v) * 10) / 10).toFixed(1).replace('.', ','); }
export function funkcioLista(g) { return String(g.funkciok || '').split(/\s*[•·]\s*/).map((t) => t.trim()).filter(Boolean); }
export function kepJpg(kepUrl) { return String(kepUrl || '').replace(/\.webp$/, '.jpg'); }
export function merettartomany(kw) { return kw < 3.0 ? 'kicsi' : (kw < 4.5 ? 'kozepes' : 'nagy'); }

export const SZOBA_ALAP = { tajolas: 'vegyes', szint: 'kozbenso', szigeteles: 'nem_tudom', belmagassag: 'alacsony', futes: false };
const SZOBA_SZO = { kicsi: 'kis szoba, háló', kozepes: 'nappali', nagy: 'nagy nappali' };
export function szobaSav(g) {
  const kw = Number(g && g.hutesi_kw);
  if (!Number.isFinite(kw) || kw <= 0) return null;
  let tol = null, ig = null;
  for (let m2 = 6; m2 <= 120; m2++) {
    const illik = meretIllik(g, meretez({ ...SZOBA_ALAP, m2 }));
    if (illik) { if (tol === null) tol = m2; else if (ig !== m2 - 1) return null; ig = m2; }
  }
  if (tol === null) return null;
  return { tol, ig, szo: SZOBA_SZO[merettartomany(kw)] };
}
export function szobaSavSzoveg(g) {
  const s = szobaSav(g);
  return s ? `${s.tol}-${s.ig} m² · ${s.szo}` : null;
}
export function zajForras(g, b) {
  return g.zajszint_db == null ? null : ((b.zaj_forgalmazoi || []).includes(g.id) ? 'forgalmazo' : 'eprel');
}

export function adatsorok(g, b) {
  const sorok = [];
  const add = (c, e) => { if (e != null && e !== '' && e !== false) sorok.push([c, e]); };
  add('Hűtőteljesítmény', g.hutesi_kw ? szam(g.hutesi_kw) + ' kW' : null);
  add('Fűtőteljesítmény', g.futesi_kw ? szam(g.futesi_kw) + ' kW' : null);
  add('Energiaosztály', g.energia_osztaly);
  add('SEER (hűtési hatásfok)', tized(g.seer));
  add('SCOP (fűtési hatásfok)', tized(g.scop));
  if (zajForras(g, b) === 'forgalmazo') add('Zajszint (forgalmazói adat)', g.zajszint_db ? g.zajszint_db + ' dB' : null);
  else add('Hangteljesítmény, beltéri egység', g.zajszint_db ? g.zajszint_db + ' dB' : null);
  if (g.futesi_hatar_c != null && g.futesi_hatar_c < 0) add('Fűtés eddig a hőmérsékletig', szam(g.futesi_hatar_c) + ' °C');
  add('Hűtőközeg', g.hutokozeg);
  add('Wi-Fi vezérlés', g.wifi ? 'Igen' : null);
  add('Garancia', g.garancia);
  const t = funkcioLista(g);
  if (t.length) add('Funkciók', t.join(', '));
  return sorok;
}

export function keszletbol(gepek, b) {
  return rendez(gepek).map((g) => ({
    id: g.id,
    marka: g.marka,
    termeknev: g.termeknev,
    nev: lathatoNev(g, b),
    horgony: horgony(g),
    kategoria: g.kategoria,
    hutesi_kw: g.hutesi_kw,
    futesi_kw: g.futesi_kw == null ? null : g.futesi_kw,
    seer: g.seer == null ? null : g.seer,
    scop: g.scop == null ? null : g.scop,
    energia_osztaly: g.energia_osztaly == null ? null : g.energia_osztaly,
    zajszint_db: g.zajszint_db == null ? null : g.zajszint_db,
    zaj_forras: zajForras(g, b),
    futesi_hatar_c: g.futesi_hatar_c == null ? null : g.futesi_hatar_c,
    futesre_optimalizalt: !!g.futesre_optimalizalt,
    csak_huto: !!g.csak_huto,
    wifi: !!g.wifi,
    garancia: g.garancia == null ? null : g.garancia,
    funkciok: funkcioLista(g),
    hutokozeg: g.hutokozeg == null ? null : g.hutokozeg,
    ar_ft: (Number.isInteger(g.ar_ft) && g.ar_ft > 0) ? g.ar_ft : null,
    kep_url: g.kep_url == null ? null : g.kep_url,
    akcios_ar_ft: Number.isInteger(g.akcios_ar_ft) ? g.akcios_ar_ft : null,
    akcio_vege: typeof g.akcio_vege === 'string' ? g.akcio_vege : null,
    akcio_megjegyzes: typeof g.akcio_megjegyzes === 'string' ? g.akcio_megjegyzes : null,
    ar_30_nap_min: Number.isInteger(g.ar_30_nap_min) ? g.ar_30_nap_min : null,
    akcio_athuzott_ar_ft: Number.isInteger(g.akcio_athuzott_ar_ft) ? g.akcio_athuzott_ar_ft : null,
    akcio_also_sor: typeof g.akcio_also_sor === 'string' ? g.akcio_also_sor : null,
    akcio_sajat_sor: typeof g.akcio_sajat_sor === 'string' ? g.akcio_sajat_sor : null,
  }));
}

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export function futesJelzo(g) {
  const fut = g.futesi_hatar_c;
  const hasznalhato = fut != null && fut < 0;
  if (g.futesre_optimalizalt === true && hasznalhato) {
    return { fajta: 'fut', szoveg: `Fűtésre is, ${szam(fut)} °C-ig` };
  }
  if (g.csak_huto === true) return { fajta: 'hut', szoveg: 'Elsősorban hűtésre' };
  return { fajta: 'ismeretlen', szoveg: null };
}

export function kartyaHtml(g, b) {
  const nev = lathatoNev(g, b);
  const futOk = !!g.futesre_optimalizalt;
  const fj = futesJelzo(g);
  const jelzo = fj.szoveg == null ? ''
    : `<span class="gep-jel gep-jel-${fj.fajta}">${esc(fj.szoveg)}</span>`;
  const szoba = szobaSavSzoveg(g);
  const szobaHtml = szoba ? `<div class="csom-meret gep-szoba">${esc(szoba)}</div>` : '';
  const arHtml = arDobozHtml(g, b, 'csom-ar gep-ar', `géppel és szereléssel, ${b.cso_alap_fm} fm csőig`);
  const sorok = adatsorok(g, b).map(([c, e]) => `            <li><span>${esc(c)}</span><div>${esc(e)}</div></li>`).join('\n');
  const kerem = `<a class="gomb gomb-fo gep-kerem" href="/kapcsolat?gep=${esc(encodeURIComponent(nev))}#ajanlatkeres">Ezt kérem</a>`;
  const adatSav = (() => {
    const d = [];
    if (g.hutesi_kw) d.push(`<div class="gep-adat"><b>${esc(szam(g.hutesi_kw))} kW</b><span>hűtés</span></div>`);
    if (g.energia_osztaly) d.push(`<div class="gep-adat"><b>${esc(g.energia_osztaly)}</b><span>energiaosztály</span></div>`);
    if (g.zajszint_db) d.push(`<div class="gep-adat"><b>${esc(g.zajszint_db)} dB</b>`
      + `<span>${zajForras(g, b) === 'forgalmazo' ? 'forgalmazói adat' : 'hangteljesítmény'}</span></div>`);
    return d.length ? `<div class="gep-adatok">${d.join('')}</div>` : '';
  })();
  return `<article class="gep-kartya" data-id="${esc(g.id)}" data-marka="${esc(g.marka)}" data-meret="${merettartomany(g.hutesi_kw || 0)}" data-futes="${futOk ? 'igen' : 'nem'}">
        <div class="gep-kep">
          <picture data-mezo="kep">
            <source srcset="${esc(g.kep_url || '')}" type="image/webp">
            <img src="${esc(kepJpg(g.kep_url))}" width="800" height="800" loading="lazy" decoding="async"
                 alt="${esc(nev)} beltéri és kültéri egysége">
          </picture>
        </div>
        <div class="gep-torzs">
          <div class="gep-marka">${esc(g.marka)}</div>
          <h3 id="${esc(horgony(g))}">${esc(nev)}</h3>
          ${szobaHtml}
          ${jelzo}
          ${adatSav}
          ${arHtml}
          ${kerem}
          <details class="gep-reszlet">
            <summary>Minden adat</summary>
            <ul class="adatlista gep-adatlista">
${sorok}
            </ul>
          </details>
        </div>
      </article>`;
}
