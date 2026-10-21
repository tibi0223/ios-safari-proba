
import { beallitas, katalogusLeker, felszereltFt, formazFt, akcio } from './katalogus-elo.js?v=419ac543';
import { arAllit, akcioTerkep, lejaratFigyel } from './akcio-elo.js?v=80aac8ec';

const gyoker = document.documentElement;
gyoker.dataset.katalogus = 'sult';

function sajatId() {
  const el = document.querySelector('[data-geplap-id]');
  return el ? el.getAttribute('data-geplap-id') : null;
}

function sajatArFrissit(g, b) {
  const ar = felszereltFt(g, b);
  if (ar == null) return 0;
  const a = akcio(g, b);
  const szamCsak = (n) => formazFt(n).replace(/\s*Ft$/, '');
  let valt = 0;
  document.querySelectorAll('[data-felszerelt-ar]').forEach((el) => {
    const elotte = el.textContent;
    arAllit(el, a, ar, formazFt, null);
    if (el.textContent !== elotte) valt++;
  });
  document.querySelectorAll('[data-mezo="ar"]').forEach((el) => {
    const elotte = el.textContent;
    arAllit(el, a, ar, szamCsak, el.closest('.arb-ar'));
    if (el.textContent !== elotte) valt++;
  });
  return valt;
}

function kartyaArFrissit(elo, b) {
  let valt = 0;
  document.querySelectorAll('a[data-gep-id]').forEach((a) => {
    const g = elo.get(a.getAttribute('data-gep-id'));
    if (!g) return;
    const ar = felszereltFt(g, b);
    if (ar == null) return;
    const el = a.querySelector('[data-kartya-ar]');
    if (!el) return;
    const elotte = el.textContent;
    arAllit(el, akcio(g, b), ar, formazFt, el.closest('p'));
    if (el.textContent !== elotte) valt++;
  });
  return valt;
}

(async function () {
  lejaratFigyel();
  const b = beallitas();
  const id = sajatId();
  if (!b || !id) return;
  const gepek = await katalogusLeker(b);
  if (!gepek) return;
  akcioTerkep(gepek, b);
  try {
    const elo = new Map(gepek.map((g) => [g.id, g]));
    const sajat = elo.get(id);
    if (!sajat) { gyoker.dataset.katalogusValtozas = 'nincs-a-vegpontban'; return; }
    const arValt = sajatArFrissit(sajat, b);
    const kartyaValt = kartyaArFrissit(elo, b);
    gyoker.dataset.katalogus = 'elo';
    gyoker.dataset.katalogusValtozas = 'ar=' + arValt + ' kartya=' + kartyaValt;
  } catch (e) {
    console.info('katalogus: a gep-lap frissitese felbeszakadt, marad a sult tartalom: ' + (e && e.message));
  }
})();
