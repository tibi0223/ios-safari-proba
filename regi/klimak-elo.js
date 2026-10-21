
import { beallitas, katalogusLeker, felszereltFt, formazFt, kepJpg, kartyaHtml, rendez, akcio } from './katalogus-elo.js?v=419ac543';
import { arAllit, akcioTerkep, lejaratFigyel } from './akcio-elo.js?v=80aac8ec';

const gyoker = document.documentElement;
gyoker.dataset.katalogus = 'sult';

function kartyak() { return Array.prototype.slice.call(document.querySelectorAll('.gep-kartya[data-id]')); }

function szakaszFrissit() {
  document.querySelectorAll('.szakasz[data-kategoria]').forEach((sz) => {
    const db = sz.querySelectorAll('.gep-kartya[data-id]').length;
    const jel = sz.querySelector('[data-mezo="szakasz-db"]');
    if (jel) jel.textContent = db + ' gép';
    sz.hidden = db === 0;
  });
  const osszes = kartyak().length;
  document.querySelectorAll('[data-mezo="darab"]').forEach((el) => { el.textContent = String(osszes); });
}

function kartyaBeszur(g, b, elem) {
  const szakasz = document.querySelector('.szakasz[data-kategoria="' + CSS.escape(g.kategoria || '') + '"]');
  if (!szakasz) return false;
  const racs = szakasz.querySelector('.gep-racs');
  if (!racs) return false;
  const kulcs = (x) => [x.kategoria || '', x.marka || '', x.hutesi_kw || 0, x.termeknev];
  const uj = kulcs(g);
  const utana = Array.prototype.slice.call(racs.querySelectorAll('.gep-kartya[data-id]')).find((k) => {
    const m = elem.get(k.dataset.id);
    if (!m) return false;
    const y = kulcs(m);
    for (let i = 0; i < 4; i++) { if (uj[i] < y[i]) return true; if (uj[i] > y[i]) return false; }
    return false;
  });
  const t = document.createElement('template');
  t.innerHTML = kartyaHtml(g, b);
  const k = t.content.firstElementChild;
  if (utana) racs.insertBefore(k, utana); else racs.appendChild(k);
  return true;
}

function alkalmaz(gepek, b) {
  const elo = new Map(gepek.map((g) => [g.id, g]));
  let arValt = 0, kepValt = 0, levett = 0, uj = 0;

  kartyak().forEach((k) => {
    const g = elo.get(k.dataset.id);
    if (!g) { k.remove(); levett++; return; }
    const arEl = k.querySelector('[data-mezo="ar"]');
    const ar = felszereltFt(g, b);
    if (arEl && ar != null) {
      const elotte = arEl.textContent;
      arAllit(arEl, akcio(g, b), ar, formazFt, arEl.closest('.csom-ar'));
      if (arEl.textContent !== elotte) arValt++;
    }
    const pic = k.querySelector('[data-mezo="kep"]');
    if (pic && g.kep_url) {
      const src = pic.querySelector('source'), img = pic.querySelector('img');
      if (src && src.getAttribute('srcset') !== g.kep_url) {
        src.setAttribute('srcset', g.kep_url);
        if (img) img.setAttribute('src', kepJpg(g.kep_url));
        kepValt++;
      }
    }
  });

  const megvan = new Set(kartyak().map((k) => k.dataset.id));
  rendez(gepek).forEach((g) => { if (!megvan.has(g.id) && kartyaBeszur(g, b, elo)) uj++; });

  szakaszFrissit();
  gyoker.dataset.katalogus = 'elo';
  gyoker.dataset.katalogusValtozas = 'ar=' + arValt + ' kep=' + kepValt + ' levett=' + levett + ' uj=' + uj;
  document.dispatchEvent(new CustomEvent('katalogus-frissult'));
}

(async function () {
  lejaratFigyel();
  const b = beallitas();
  if (!b || !kartyak().length) return;
  const gepek = await katalogusLeker(b);
  if (!gepek) return;
  akcioTerkep(gepek, b);
  try { alkalmaz(gepek, b); }
  catch (e) { console.info('katalogus: a frissites felbeszakadt, marad a sult tartalom: ' + (e && e.message)); }
})();
