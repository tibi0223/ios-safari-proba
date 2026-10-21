
export const AJANLAS_VERZIO = 'kategoria-harmas-v1-2026-09-02';

export const ALLANDOK = {
  MERET_TURES: 0.4,
  ZAJ_ALAP_DB: 60,
  SULY: {
    seer: 1,
    meretKozelseg: -2,
    garanciaEv: 0.5,
    zajDb: 1,
    halk: 2,
    ejszakai: 1,
    scop: 2,
    futesiHatar: 0.2,
    hatasfokSzorzo: 2,
  },
  KATEGORIA_SORREND: ['1. Alap modellek', '2. Középkategória', '3. Prémium modellek'],
  MAX_DB: 3,
};

export const FUNKCIO_RAG = {
  'Halk üzemmód': 'halk üzemmódja',
  'Halk ventilátorfokozat': 'halk ventilátorfokozata',
  'Éjszakai üzemmód': 'éjszakai üzemmódja',
  'Alvási programok': 'alvási programja',
  'Alvás üzemmód': 'alvás üzemmódja',
};
const HALK = /^halk\b/i;
const EJSZAKAI = /^(éjszakai|alvás)/i;

export const HELYISEG_SZOVEG = {
  haloszoba:   { ba: 'Hálószobába' },
  nappali:     { ba: 'Nappaliba' },
  gyerekszoba: { ba: 'Gyerekszobába' },
  iroda:       { ba: 'Irodába' },
  egyeb:       { ba: 'Ide' },
};

export function kwSzoveg(n) { return String(n).replace('.', ','); }
export function tizedSzoveg(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }

function garanciaEv(g) {
  const m = /(\d+)\s*év/.exec(g.garancia || '');
  return m ? Number(m[1]) : null;
}
function funkcio(g, minta) {
  return (g.funkciok || []).find((f) => minta.test(f)) || null;
}

export function meretIllik(g, e) {
  if (e.tobbGep || e.gep == null) return false;
  const kw = Number(g.hutesi_kw);
  if (!Number.isFinite(kw)) return false;
  return kw >= e.kwSzukseges && Math.abs(kw - e.gep) <= ALLANDOK.MERET_TURES + 1e-9;
}

export function pontoz(g, be, e) {
  const S = ALLANDOK.SULY;
  const halo = be.helyiseg === 'haloszoba' || be.helyiseg === 'gyerekszoba';
  const hosszuJaras = be.helyiseg === 'iroda' || be.nap === 'egesznap';
  const resz = {};
  resz.seer = (Number(g.seer) || 0) * S.seer * (hosszuJaras ? S.hatasfokSzorzo : 1);
  const tobblet = Number(g.hutesi_kw) - e.kwSzukseges;
  resz.meret = tobblet * (be.helyiseg === 'iroda' ? -S.meretKozelseg : S.meretKozelseg);
  const ev = garanciaEv(g);
  resz.garancia = ev == null ? 0 : (ev - 3) * S.garanciaEv;
  if (halo) {
    resz.zaj = (g.zaj_forras === 'eprel' && g.zajszint_db != null)
      ? (ALLANDOK.ZAJ_ALAP_DB - Number(g.zajszint_db)) * S.zajDb : 0;
    resz.halk = funkcio(g, HALK) ? S.halk : 0;
    resz.ejszakai = funkcio(g, EJSZAKAI) ? S.ejszakai : 0;
  }
  if (be.futes) {
    resz.scop = (Number(g.scop) || 0) * S.scop;
    const hatar = Number(g.futesi_hatar_c);
    resz.futesiHatar = Number.isFinite(hatar) && hatar < 0 ? Math.max(0, -hatar - 20) * S.futesiHatar : 0;
  }
  const pont = Object.values(resz).reduce((a, b) => a + b, 0);
  return { pont: Math.round(pont * 1000) / 1000, resz };
}

export function indokol(g, be, e, fokozat) {
  const halo = be.helyiseg === 'haloszoba' || be.helyiseg === 'gyerekszoba';
  const hosszuJaras = be.helyiseg === 'iroda' || be.nap === 'egesznap';
  const elso = `${kwSzoveg(g.hutesi_kw)} kW hűtőteljesítmény, a méretező ${kwSzoveg(e.gep)} kW-os fokozatában.`;

  let fej = `${HELYISEG_SZOVEG[be.helyiseg]?.ba || 'Ide'} kérted`;
  if (be.helyiseg === 'iroda') fej += ', ahol egész nap megy a hűtés';
  else if (be.nap === 'egesznap' && !halo) fej += ', egész napos napsütésre';
  if (be.futes) fej += ', fűtésre is';
  fej += ': ';

  const tag = [];
  if (halo) {
    const h = funkcio(g, HALK), ej = funkcio(g, EJSZAKAI);
    const van = h ? FUNKCIO_RAG[h] : (ej ? FUNKCIO_RAG[ej] : null);
    if (g.zaj_forras === 'eprel' && g.zajszint_db != null) {
      const db = Number(g.zajszint_db);
      const hivatalos = fokozat.filter((x) => x.zaj_forras === 'eprel' && x.zajszint_db != null);
      const legalacsonyabb = hivatalos.length > 1 && hivatalos.every((x) => Number(x.zajszint_db) >= db);
      let z = `${db} dB a beltéri egység hangteljesítménye`;
      if (legalacsonyabb) z += ' (a legalacsonyabb hivatalos érték ebben a fokozatban)';
      if (van) z += `, van ${van}`;
      tag.push(z);
    } else {
      if (van) tag.push(`van ${van}`);
      if (g.zaj_forras === 'forgalmazo' && g.zajszint_db != null) {
        tag.push(`a zajszintjére csak forgalmazói adat van (${Number(g.zajszint_db)} dB), nem hivatalos érték`);
      }
    }
  }
  if (be.futes && g.futesre_optimalizalt && Number(g.futesi_hatar_c) < 0) {
    let f = `${kwSzoveg(g.futesi_hatar_c)} °C-ig fűt`;
    if (g.scop != null) f += ` (SCOP ${tizedSzoveg(g.scop)})`;
    tag.push(f);
  }
  if (g.seer != null && (tag.length === 0 || (hosszuJaras && !halo && tag.length < 2))) {
    let s = `a hűtési hatásfoka (SEER) ${tizedSzoveg(g.seer)}`;
    if (g.energia_osztaly) s += `, energiaosztálya ${g.energia_osztaly}`;
    tag.push(s);
  }
  const ev = garanciaEv(g);
  if (ev != null && ev > 3 && tag.length < 2) tag.push(`a garancia ${ev} év`);

  const tagok = tag.slice(0, 2);
  const masodik = fej + (tagok.length > 1
    ? tagok.slice(0, -1).join(', ') + ', és ' + tagok[tagok.length - 1]
    : tagok[0]) + '.';
  return elso + ' ' + masodik;
}

export function ajanl(be, e, gepek) {
  if (e.tobbGep || e.gep == null) return { ajanlatok: [], fokozat: [], jeloltek: [], ok: 'tobb-gep' };

  const fokozat = gepek.filter((g) => meretIllik(g, e));
  let jeloltek = be.futes ? fokozat.filter((g) => !g.csak_huto) : fokozat.slice();
  if (!jeloltek.length) return { ajanlatok: [], fokozat, jeloltek: [], ok: 'nincs-jelolt' };

  const pontozott = jeloltek.map((g) => ({ gep: g, ...pontoz(g, be, e), feltoltes: false }));
  const rendez = (a, b) => b.pont - a.pont
    || Number(a.gep.hutesi_kw) - Number(b.gep.hutesi_kw)
    || a.gep.nev.localeCompare(b.gep.nev, 'hu');
  pontozott.sort(rendez);

  const valasztott = [];
  for (const kat of ALLANDOK.KATEGORIA_SORREND) {
    const elso = pontozott.find((p) => p.gep.kategoria === kat && !valasztott.includes(p));
    if (elso) valasztott.push(elso);
  }
  while (valasztott.length < ALLANDOK.MAX_DB) {
    const markak = new Set(valasztott.map((p) => p.gep.marka));
    const kov = pontozott.find((p) => !valasztott.includes(p) && !markak.has(p.gep.marka));
    if (!kov) break;
    kov.feltoltes = true;
    valasztott.push(kov);
  }
  valasztott.sort(rendez);
  const legjobb = valasztott[0];
  const tobbi = valasztott.slice(1).sort((a, b) =>
    ALLANDOK.KATEGORIA_SORREND.indexOf(a.gep.kategoria)
    - ALLANDOK.KATEGORIA_SORREND.indexOf(b.gep.kategoria) || rendez(a, b));
  valasztott.length = 0;
  valasztott.push(legjobb, ...tobbi);

  const ajanlatok = valasztott.map((p) => ({ ...p, indok: indokol(p.gep, be, e, fokozat) }));
  const ok = ['nincs-jelolt', 'egy', 'ketto', 'harom'][ajanlatok.length];
  return { ajanlatok, fokozat, jeloltek, ok };
}

export function ajanlasCim(db) {
  return { 3: 'Három gép, ami ide illik', 2: 'Két gép, ami ide illik', 1: 'Egy gép, ami ide illik' }[db] || '';
}
