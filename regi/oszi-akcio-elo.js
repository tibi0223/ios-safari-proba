import { katalogusLeker } from './katalogus-elo.js?v=419ac543';
import { lejaratFigyel } from './akcio-elo.js?v=80aac8ec';
import { tetelekBol, panelHtml, heroOraHtml, ertekek, cimSzoveg, kedvezmenyHtml, panelCim, panelValaszt, panelAl } from './oszi-akcio-adat.js?v=4250de81';

const html = document.documentElement;
const hely = document.querySelector('[data-oa-hely]');

function kartyakAdata() {
  return [...document.querySelectorAll('[data-akcio-sav] li[data-akcio-vege]')].map((li) => ({
    ar: Number(li.dataset.savAr), rendes: Number(li.dataset.savRendes), vege: Date.parse(li.dataset.akcioVege),
    scop: li.dataset.oaScop || '', hatar: li.dataset.oaHatar === '' ? null : Number(li.dataset.oaHatar),
    gar: li.dataset.oaGar || '', wifi: li.dataset.oaWifi === '1', megj: li.dataset.oaMegj || '',
  })).filter((x) => x.vege > Date.now());
}

let elozo = null;
function allapot() {
  lapozo();
  const lista = kartyakAdata();
  const e = ertekek(lista);
  const jel = JSON.stringify(e);
  if (jel === elozo) return;
  elozo = jel;
  document.querySelectorAll('[data-oa]').forEach((el) => {
    const v = e ? (e[el.dataset.oa] || '') : '';
    if (el.textContent !== v) el.textContent = v;
  });
  document.querySelectorAll('[data-oa-ha]').forEach((el) => { el.hidden = !e || !e[el.dataset.oaHa]; });
  document.querySelectorAll('[data-oa-akcio]').forEach((el) => { el.hidden = !e; });
  document.querySelectorAll('[data-oa-lejart]').forEach((el) => { el.hidden = !!e; });
  const kedv = kedvezmenyHtml(lista);
  document.querySelectorAll('[data-oa-kedv]').forEach((el) => { el.innerHTML = kedv; });
  futoSebesseg();
  if (lista.length) {
    const cim = panelCim(lista.length);
    const al = panelAl([...new Set(lista.map((x) => x.megj).filter(Boolean))].join(', '));
    document.querySelectorAll('[data-oa-panel-cim]').forEach((el) => { if (el.textContent !== cim) el.textContent = cim; });
    const valaszt = panelValaszt(lista.length);
    document.querySelectorAll('[data-oa-panel-valaszt]').forEach((el) => { if (el.textContent !== valaszt) el.textContent = valaszt; });
    document.querySelectorAll('[data-oa-panel-al]').forEach((el) => { if (el.textContent !== al) el.textContent = al; });
  }
  document.title = cimSzoveg(e);
  mutat();
}

const lassan = window.matchMedia('(prefers-reduced-motion: reduce)');
function lapozoReszek() {
  const ul = document.querySelector('[data-akcio-sav] .oa-gepek');
  const doboz = document.querySelector('[data-akcio-sav] [data-oa-lapozo]');
  return ul && doboz ? { ul, doboz, li: [...ul.querySelectorAll(':scope > li')] } : null;
}
function snapHely(r, li) {
  return li.getBoundingClientRect().left - r.ul.getBoundingClientRect().left + r.ul.scrollLeft
    - (parseFloat(getComputedStyle(r.ul).scrollPaddingLeft) || 0);
}
function aktualis(r) {
  if (r.ul.scrollLeft >= r.ul.scrollWidth - r.ul.clientWidth - 2) return r.li.length - 1;
  let i = 0, legjobb = Infinity;
  r.li.forEach((li, j) => { const d = Math.abs(snapHely(r, li) - r.ul.scrollLeft); if (d < legjobb) { legjobb = d; i = j; } });
  return i;
}
const figyelt = new WeakSet();
function lapozo() {
  const r = lapozoReszek();
  if (!r) return;
  if (!figyelt.has(r.ul)) { figyelt.add(r.ul); r.ul.addEventListener('scroll', lapozo, { passive: true }); }
  const tul = r.ul.scrollWidth > r.ul.clientWidth + 2;
  r.doboz.hidden = !tul;
  if (tul) r.ul.setAttribute('tabindex', '0'); else r.ul.removeAttribute('tabindex');
  html.classList.toggle('oa-lapozhato', tul);
  if (!tul) return;
  const i = aktualis(r), max = r.ul.scrollWidth - r.ul.clientWidth;
  const hol = r.doboz.querySelector('[data-oa-lapozo-hol]');
  const szoveg = `${i + 1} / ${r.li.length}`;
  if (hol.textContent !== szoveg) hol.textContent = szoveg;
  const [elo, kov] = r.doboz.querySelectorAll('[data-oa-lapoz]');
  elo.disabled = r.ul.scrollLeft <= 2;
  kov.disabled = r.ul.scrollLeft >= max - 2;
}
document.addEventListener('click', (ev) => {
  const g = ev.target.closest && ev.target.closest('[data-oa-lapoz]');
  const r = g && lapozoReszek();
  if (!r) return;
  const cel = r.li[Math.max(0, Math.min(r.li.length - 1, aktualis(r) + Number(g.dataset.oaLapoz)))];
  if (!cel) return;
  r.ul.scrollTo({ left: snapHely(r, cel), behavior: lassan.matches ? 'auto' : 'smooth' });
});
window.addEventListener('resize', lapozo, { passive: true });

let valasztott = null;
const sor = document.getElementById('kert-gep');
const nevHely = document.getElementById('kert-gep-nev');
function aktualisAr(v) {
  const li = v && document.querySelector(`[data-akcio-sav] li[data-gep-id="${CSS.escape(v.id)}"]`);
  const a = li && li.querySelector('.gep-valaszt');
  return a ? (a.dataset.ar || '').replace(/ /g, ' ') : '';
}
function mutat() {
  if (!sor || !nevHely) return;
  if (!valasztott) { sor.hidden = true; return; }
  const ar = aktualisAr(valasztott);
  nevHely.textContent = valasztott.nev + (ar ? ', ' + ar : '');
  sor.hidden = false;
}
document.addEventListener('click', (ev) => {
  const g = ev.target.closest && ev.target.closest('.gep-valaszt');
  if (g) {
    valasztott = { nev: g.dataset.gep, id: g.dataset.gepId };
    try { sessionStorage.setItem('nx-kert-gep', valasztott.nev); } catch (_) {   }
    mutat();
    return;
  }
  if (ev.target.closest && ev.target.closest('#kert-gep-torol')) {
    valasztott = null;
    try { sessionStorage.removeItem('nx-kert-gep'); } catch (_) {   }
    mutat();
  }
});
window.nxUzenetElotag = function () {
  if (!valasztott) {
    let tarolt = '';
    try { tarolt = sessionStorage.getItem('nx-kert-gep') || ''; } catch (_) {   }
    return tarolt ? 'Őszi akció' : 'Őszi akció (gép nincs kiválasztva)';
  }
  const ar = aktualisAr(valasztott);
  return 'Kért gép: ' + valasztott.nev + (ar ? ' (őszi akció, ' + ar + ')' : '');
};

const also = document.querySelector('[data-oa-also]');
const heroGombok = document.querySelector('.oa-hero .oa-gombok');
function latszik(e) { if (!e) return false; const t = e.getBoundingClientRect(); return t.height > 0 && t.bottom > 0 && t.top < window.innerHeight; }
function alsoSav() {
  if (!also) return;
  const telefon = window.matchMedia('(max-width: 759px)').matches;
  const bd = document.getElementById('stcm-backdrop');
  const suti = !!bd && (bd.checkVisibility ? bd.checkVisibility() : getComputedStyle(bd).display !== 'none');
  const mezoben = !!(document.activeElement && document.activeElement.matches('input:not([type=radio]):not([type=checkbox]), textarea, select'));
  const lablec = [...document.querySelectorAll('footer')].find((f) => !f.closest('#stcm-wrapper'));
  const be = telefon && !suti && !mezoben && !latszik(heroGombok) && heroGombok && heroGombok.getBoundingClientRect().bottom < 0
    && !latszik(document.getElementById('ajanlatkeres')) && !latszik(lablec);
  also.classList.toggle('lathato', be);
  html.classList.toggle('oa-also-be', be);
}
window.addEventListener('scroll', alsoSav, { passive: true });
window.addEventListener('resize', alsoSav, { passive: true });
document.addEventListener('focusin', alsoSav);
document.addEventListener('focusout', () => setTimeout(alsoSav, 0));
setInterval(alsoSav, 1000);

lejaratFigyel();
allapot();
setInterval(allapot, 1000);
alsoSav();
function futoSebesseg() {
  const FUTO_PX_MP = 45;
  const cs = document.querySelector('.oa-futo-csomag');
  const sin = document.querySelector('.oa-futo-sin');
  if (!cs || !sin) return;
  const w = cs.getBoundingClientRect().width;
  if (w > 0) sin.style.setProperty('--oa-futo-ido', (w / FUTO_PX_MP).toFixed(2) + 's');
}
futoSebesseg();
addEventListener('resize', futoSebesseg);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(futoSebesseg);

html.dataset.oaAllapot = (document.querySelector('[data-akcio-sav]') ? 'sult db=' + kartyakAdata().length : 'nincs');

(async function () {
  const el = document.getElementById('katalogus-beallitas-oa');
  const kepEl = document.getElementById('oa-helyi-kepek');
  if (!el || !hely) return;
  let b, helyi = [];
  try { b = JSON.parse(el.textContent); } catch (_) { return; }
  try { helyi = JSON.parse(kepEl ? kepEl.textContent : '[]'); } catch (_) {   }
  const gepek = await katalogusLeker(b);
  if (!gepek) return;
  const most = Date.now();
  const t = tetelekBol(gepek, b, most, helyi);
  hely.innerHTML = panelHtml(t, most, b.cso_alap_fm);
  const ora = document.querySelector('[data-oa-ora-hely]');
  if (ora) ora.innerHTML = heroOraHtml(t, most);
  elozo = null;
  allapot();
  html.dataset.oaAllapot = t.length ? 'elo db=' + t.length : 'nincs';
})();
