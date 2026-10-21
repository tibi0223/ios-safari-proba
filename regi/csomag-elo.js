import { katalogusLeker, felszereltFt, formazFt, akcio } from './katalogus-elo.js?v=419ac543';
import { arAllit, jelAllit, savTetelek, savAllit, akcioTerkep, lejaratFigyel } from './akcio-elo.js?v=80aac8ec';

document.addEventListener('click', (ev) => {
  const a = ev.target.closest && ev.target.closest('a[data-csom-cel]');
  if (!a) return;
  const [marka, meret] = String(a.dataset.csomCel).split(':');
  const markaR = document.querySelector(`input[name="csom-marka"][value="${marka}"]`);
  const meretR = document.getElementById(`csom-${marka}-${meret}`);
  const kartya = document.getElementById(`csom-${marka}`);
  if (!meretR || !kartya) return;
  ev.preventDefault();
  if (markaR) markaR.checked = true;
  meretR.checked = true;
  const lassu = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  kartya.scrollIntoView({ behavior: lassu ? 'auto' : 'smooth', block: 'start' });
  meretR.focus({ preventScroll: true });
});

function blokkTerkep() {
  const m = new Map();
  document.querySelectorAll('.csom-kartya').forEach((k) => {
    const img = k.querySelector('.csom-kep source');
    k.querySelectorAll('.csom-sor[data-id]').forEach((s) => {
      const opc = k.querySelector(`.csom-meret-opc[data-id="${s.dataset.id}"]`);
      const meret = opc ? [opc.querySelector('.csom-meret-nev'), opc.querySelector('.csom-meret-m2')].map((x) => x ? x.textContent : '').filter(Boolean).join(', ') : null;
      m.set(s.dataset.id, { cel: `${s.dataset.marka}:${s.dataset.meret}`, kep: img ? img.getAttribute('srcset') : '', href: '#' + k.id, meret });
    });
  });
  return m;
}

(async function () {
  lejaratFigyel();
  const sorok = document.querySelectorAll('.csom-sor[data-id]');
  const el = document.getElementById('katalogus-beallitas-csomag');
  if (!sorok.length || !el) return;
  let b;
  try { b = JSON.parse(el.textContent); } catch (e) { return; }
  const gepek = await katalogusLeker(b);
  if (!gepek) return;
  const elo = new Map(gepek.map((g) => [g.id, g]));
  let valt = 0, akciok = 0;
  sorok.forEach((s) => {
    const g = elo.get(s.dataset.id);
    const arEl = s.querySelector('[data-mezo="ar"]');
    const ar = g ? felszereltFt(g, b) : null;
    if (!arEl || ar == null) return;
    const a = akcio(g, b);
    const elotte = arEl.textContent;
    arAllit(arEl, a, ar, formazFt, arEl.closest('.csom-ar'));
    document.querySelectorAll(`.csom-meret-opc[data-id="${s.dataset.id}"]`).forEach((o) => jelAllit(o, a));
    if (arEl.textContent !== elotte) valt++;
    if (a) akciok++;
  });
  let lapok = {};
  try { lapok = JSON.parse((document.getElementById('akcio-lapok') || {}).textContent || '{}'); } catch (_) {   }
  savAllit(document.querySelector('[data-akcio-hely]'), savTetelek(gepek, b, lapok, blokkTerkep()));
  akcioTerkep(gepek, b);
  document.documentElement.dataset.csomagAr = 'elo ar=' + valt + ' akcio=' + akciok;
})();
