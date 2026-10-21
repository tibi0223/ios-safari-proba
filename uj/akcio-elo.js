
import { akcio, akcioSorSzoveg, akcioSavHtml, akcioCim, akcioNyitSzoveg, akcioAjanlatHtml, akcioKepekHtml, akcioAlcim, visszaszamlaloReszek, formazFt, lathatoNev, horgony } from './katalogus-elo.js?v=419ac543';

function athuzott(el) {
  const s = el.previousElementSibling;
  return s && s.matches('s.akcio-regi') ? s : null;
}
function athuzottLevesz(el) {
  const s = athuzott(el);
  if (!s) return;
  const koz = s.nextSibling;
  if (koz && koz.nodeType === 3 && koz.textContent === ' ') koz.remove();
  s.remove();
}

export function arAllit(el, a, rendes, fmt, sorUtan) {
  const f = fmt || formazFt;
  if (a) {
    let s = athuzott(el);
    if (!s) { s = document.createElement('s'); s.className = 'akcio-regi'; el.before(s, ' '); }
    s.textContent = formazFt(a.rendes);
    el.textContent = f(a.ar);
    el.dataset.akcioVege = a.vegeIso;
    el.dataset.rendes = f(a.rendes);
  } else {
    athuzottLevesz(el);
    if (rendes != null) el.textContent = f(rendes);
    else if (el.dataset.rendes != null) el.textContent = el.dataset.rendes;
    delete el.dataset.akcioVege;
    delete el.dataset.rendes;
  }
  if (sorUtan) sorAllit(sorUtan, a);
}

export function sorAllit(utan, a) {
  const kov = utan.nextElementSibling;
  let p = kov && kov.matches('p.akcio-sor') ? kov : null;
  if (a) {
    if (!p) { p = document.createElement('p'); p.className = 'akcio-sor'; utan.after(p); }
    p.textContent = akcioSorSzoveg(a);
    p.dataset.akcioVege = a.vegeIso;
  } else if (p) p.remove();
}

export function savTetelek(gepek, b, lapok, blokk) {
  const most = Date.now();
  const ki = [];
  for (const g of gepek) {
    const a = akcio(g, b, most);
    if (!a) continue;
    const k = blokk && blokk.get(g.id);
    ki.push({
      nev: lathatoNev(g, b), href: k ? k.href : ((lapok && lapok[g.id]) || '/klimak#' + horgony(g)),
      kep: k ? k.kep : (g.kep_url || ''), cel: k ? k.cel : null, meret: k ? k.meret : null,
      rendes: a.rendes, ar: a.ar, min30: a.min30, also: a.also, vege: a.vege, vegeIso: a.vegeIso, megjegyzes: a.megjegyzes,
    });
  }
  return ki;
}
export function savAllit(hely, tetelek) {
  if (!hely) return;
  const elotte = hely.querySelector('details[data-akcio-sav]');
  const nyitva = !!(elotte && elotte.open);
  hely.innerHTML = akcioSavHtml(tetelek);
  const most = hely.querySelector('details[data-akcio-sav]');
  if (most && nyitva) most.open = true;
  tick();
}

export function jelAllit(opc, a) {
  let j = opc.querySelector('.csom-akciojel');
  if (a) {
    if (!j) { j = document.createElement('span'); j.className = 'csom-akciojel'; j.textContent = 'Akció'; opc.appendChild(j); }
    j.dataset.akcioVege = a.vegeIso;
  } else if (j) j.remove();
}

export function akcioTerkep(gepek, b) {
  const t = {};
  for (const g of gepek) {
    const a = akcio(g, b);
    t[g.id] = a ? { athuzott: formazFt(a.rendes), ar: formazFt(a.ar), vege: a.vege, sor: akcioSorSzoveg(a) } : null;
  }
  window.nxAkcio = t;
}


function lejart(el) {
  if (el.matches('p.akcio-sor, [data-akcio-sav] li, .csom-akciojel')) { el.remove(); return; }
  if (el.dataset.rendes != null) {
    athuzottLevesz(el);
    el.textContent = el.dataset.rendes;
    delete el.dataset.rendes;
  }
  delete el.dataset.akcioVege;
}

function savCel(sav) {
  const li = sav.querySelectorAll('li[data-akcio-vege]');
  let cel = Infinity;
  li.forEach((x) => { const v = Date.parse(x.dataset.akcioVege); if (v < cel) cel = v; });
  return cel;
}

function savLista(sav) {
  return [...sav.querySelectorAll('li[data-akcio-vege]')].map((x) => ({
    ar: Number(x.dataset.savAr), rendes: Number(x.dataset.savRendes), kep: x.dataset.savKep || '',
    href: (x.querySelector('a') || x).getAttribute('href') || '',
  }));
}
function fejAllit(sav) {
  const t = savLista(sav);
  if (String(t.length) === sav.dataset.db) return;
  sav.dataset.db = String(t.length);
  const ir = (sel, f) => { const e = sav.querySelector(sel); if (e) f(e); };
  ir('[data-akcio-fejcim]', (e) => { e.textContent = akcioCim(t.length); });
  ir('[data-akcio-nyit]', (e) => { e.textContent = akcioNyitSzoveg(t.length); });
  ir('[data-akcio-ajanlat]', (e) => { e.innerHTML = akcioAjanlatHtml(t, { csakKedvezmeny: e.dataset.akcioAjanlat === 'kedvezmeny' }); });
  ir('[data-akcio-kepek]', (e) => { e.innerHTML = akcioKepekHtml(t); e.hidden = !e.innerHTML; });
}
document.addEventListener('click', (ev) => {
  const k = ev.target.closest && ev.target.closest('[data-akcio-sav] .akcio-sav-kep[data-href]');
  if (!k) return;
  const sav = k.closest('[data-akcio-sav]');
  const a = [...sav.querySelectorAll('li a')].find((x) => x.getAttribute('href') === k.dataset.href);
  if (!a) return;
  ev.preventDefault();
  a.click();
});

function tick() {
  const most = Date.now();
  document.querySelectorAll('[data-akcio-vege]').forEach((el) => {
    if (!(Date.parse(el.dataset.akcioVege) > most)) lejart(el);
  });
  document.querySelectorAll('[data-akcio-sav]').forEach((sav) => {
    const cel = savCel(sav);
    if (!Number.isFinite(cel)) { sav.remove(); return; }
    fejAllit(sav);
    oraAllit(sav, visszaszamlaloReszek(cel, most));
    const cim = sav.querySelector('[data-akcio-cim]');
    const szoveg = akcioAlcim(cel, sav.dataset.megj || '');
    if (cim && cim.textContent !== szoveg) cim.textContent = szoveg;
  });
  const kovetok = document.querySelectorAll('[data-akcio-ora-kovet]');
  if (kovetok.length) {
    let cel = Infinity;
    document.querySelectorAll('[data-akcio-sav]').forEach((sav) => { cel = Math.min(cel, savCel(sav)); });
    kovetok.forEach((o) => {
      const van = Number.isFinite(cel);
      if (o.hidden === van) o.hidden = !van;
      if (van) oraAllit(o, visszaszamlaloReszek(cel, most));
    });
  }
  alsoSav();
}
const nyugodt = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
function lapot(b, regi, uj) {
  if (nyugodt.matches || !regi || (b.checkVisibility ? !b.checkVisibility() : b.parentElement.hidden)) return;
  const lap = document.createElement('span');
  lap.className = 'akcio-ora-lap';
  lap.setAttribute('aria-hidden', 'true');
  lap.dataset.regi = regi;
  for (const [resz, szam] of [['also-regi', regi], ['felso-regi', regi], ['also-uj', uj]]) {
    const f = document.createElement('span');
    f.className = 'akcio-ora-fel akcio-ora-fel--' + resz;
    f.dataset.szam = szam;
    lap.appendChild(f);
  }
  lap.lastChild.addEventListener('animationend', (ev) => { if (!ev.pseudoElement) lap.remove(); });
  b.appendChild(lap);
}
function oraAllit(gyoker, r) {
  for (const k of ['nap', 'ora', 'perc', 'mp']) {
    const e = gyoker.querySelector('[data-ido="' + k + '"]');
    if (!e || e.textContent === String(r[k])) continue;
    const regi = e.textContent;
    e.textContent = String(r[k]);
    lapot(e, regi, e.textContent);
  }
  const nap = gyoker.querySelector('[data-ido="nap"]');
  if (nap && nap.parentElement.hidden !== (r.nap === 0)) nap.parentElement.hidden = r.nap === 0;
}

const ZARVA_KULCS = 'nx-akcio-also-zarva';
let also = null, zarvaMost = false;
function zarvaE(cel) {
  if (zarvaMost) return true;
  try { return localStorage.getItem(ZARVA_KULCS) === String(cel); } catch (_) { return false; }
}
function alsoSav() {
  const sav = document.querySelector('[data-akcio-sav]');
  const telefon = window.matchMedia && window.matchMedia('(max-width: 759px)').matches;
  const cel = sav ? savCel(sav) : Infinity;
  const kell = !!sav && telefon && Number.isFinite(cel) && !zarvaE(cel);
  if (!kell) { if (also) also.classList.remove('lathato'); document.documentElement.classList.remove('akcio-also-be'); return; }
  if (!also) {
    also = document.createElement('div');
    also.className = 'akcio-also';
    also.setAttribute('role', 'region');
    also.setAttribute('aria-label', 'Akció');
    also.innerHTML = '<a class="akcio-also-link" href="#akcio"><span class="akcio-also-cim" data-also-cim></span><span class="akcio-also-ido" data-also-szoveg></span></a>'
      + '<button type="button" class="akcio-also-zar" aria-label="Akció sáv bezárása">&times;</button>';
    also.querySelector('a').addEventListener('click', () => {
      const d = document.querySelector('details[data-akcio-sav]');
      if (d) d.open = true;
    });
    also.querySelector('button').addEventListener('click', () => {
      zarvaMost = true;
      try { localStorage.setItem(ZARVA_KULCS, String(savCel(document.querySelector('[data-akcio-sav]') || also))); } catch (_) {   }
      alsoSav();
    });
    document.body.appendChild(also);
  }
  const r = visszaszamlaloReszek(cel);
  const szoveg = `még ${r.nap ? r.nap + ' nap ' : ''}${r.ora} óra ${r.perc} perc`;
  const sz = also.querySelector('[data-also-szoveg]');
  if (sz.textContent !== szoveg) sz.textContent = szoveg;
  const ac = also.querySelector('[data-also-cim]');
  const cimSz = akcioCim(sav.querySelectorAll('li[data-akcio-vege]').length);
  if (ac.textContent !== cimSz) ac.textContent = cimSz;
  const latszik = (e) => { if (!e) return false; const t = e.getBoundingClientRect(); return t.height > 0 && t.bottom > 0 && t.top < window.innerHeight; };
  const mezoben = !!(document.activeElement && document.activeElement.matches('input:not([type]), input[type=text], input[type=email], input[type=tel], input[type=number], input[type=search], textarea'));
  const urlap = Array.prototype.some.call(document.querySelectorAll('form, #kalk'), latszik);
  const be = window.scrollY > 200 && !mezoben && !urlap && !latszik(sav) && !latszik(document.querySelector('.csom-lista'));
  also.classList.toggle('lathato', be);
  document.documentElement.classList.toggle('akcio-also-be', be);
}

let indult = false;
export function lejaratFigyel() {
  if (indult) return;
  indult = true;
  tick();
  setInterval(tick, 1000);
  window.addEventListener('scroll', alsoSav, { passive: true });
  document.addEventListener('focusin', alsoSav);
  document.addEventListener('focusout', () => setTimeout(alsoSav, 0));
  window.addEventListener('resize', alsoSav, { passive: true });
}
