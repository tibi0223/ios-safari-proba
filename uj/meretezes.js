
export const MODSZER_VERZIO = 'terfogat-v2-szigetelessel-2026-09-04';
export const ALLANDOK = {
  belmagassag: {
    alacsony: { meter: 2.6, cimke: 'Átlagos, 2,5-2,7 m' },
    kozepes:  { meter: 2.7, cimke: 'Új építésű, 2,7 m' },
    magas:    { meter: 3.5, cimke: 'Régi bérház, 3,5 m felett' },
  },

  tajolas: {
    eszak:  { cimke: 'Északra vagy árnyékba' },
    vegyes: { cimke: 'Keletre vagy nyugatra' },
    del:    { cimke: 'Délre, sokat süti a nap' },
  },

  szigeteles: {
    igen:      { cimke: 'Igen, szigetelve van', lepes: -1 },
    nem:       { cimke: 'Nincs szigetelve',     lepes: +1 },
    nem_tudom: { cimke: 'Nem tudom',            lepes:  0 },
  },

  szint: {
    kozbenso: { cimke: 'Van fölötte fűtött lakás' },
    felso:    { cimke: 'Legfelső emelet' },
    tetoter:  { cimke: 'Tetőtér vagy lapostető alatt' },
  },

  gepek: [2.5, 3.5, 5.0, 5.4, 7.3],
};

const WM3_FOKOZATOK = [30, 35, 40];

function wattM3(tajolas, szint, szigeteles) {
  let i = 1;
  if (tajolas === 'del' || szint === 'tetoter') i += 1;
  if (szigeteles === 'nem') i += 1;
  if (szigeteles === 'igen' && tajolas === 'eszak' && szint === 'kozbenso') i -= 1;
  return WM3_FOKOZATOK[Math.max(0, Math.min(WM3_FOKOZATOK.length - 1, i))];
}

function szamHu(n) {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

export const BELMAG_MIN = 2.2;
export const BELMAG_MAX = 4.0;

export function belmagassagMeter(ertek) {
  if (typeof ertek === 'number' || (typeof ertek === 'string' && ertek !== '' && !Number.isNaN(Number(ertek)))) {
    const m = Number(ertek);
    if (!Number.isFinite(m)) throw new Error(`belmagassag: nem szam (${ertek})`);
    if (m < BELMAG_MIN || m > BELMAG_MAX) {
      throw new Error(`belmagassag: ${m} m a ${BELMAG_MIN}-${BELMAG_MAX} m tartomanyon kivul`);
    }
    return m;
  }
  const t = ALLANDOK.belmagassag[ertek];
  if (!t) throw new Error(`belmagassag: ismeretlen kulcs (${JSON.stringify(ertek)})`);
  return t.meter;
}

export function belmagassagKulcs(meter) {
  const p = Object.entries(ALLANDOK.belmagassag);
  let jo = p[0][0], d = Infinity;
  for (const [k, v] of p) { const e = Math.abs(v.meter - meter); if (e < d) { d = e; jo = k; } }
  return jo;
}

export function meretez(v) {
  const A = ALLANDOK;
  const m2 = Math.max(6, Math.min(120, Number(v.m2) || 0));
  const meter = belmagassagMeter(v.belmagassag);
  const bm = { meter };
  const terfogat = m2 * bm.meter;
  const wm3 = wattM3(v.tajolas, v.szint, v.szigeteles || 'nem_tudom');
  const watt = terfogat * wm3;

  const indoklas = [
    `${m2} m² × ${szamHu(bm.meter)} m belmagasság = ${szamHu(terfogat)} m³`,
    `${szamHu(terfogat)} m³ × ${wm3} W/m³ = ${Math.round(watt)} W`,
  ];

  const megjegyzesek = [];

  if (v.futes) {
    megjegyzesek.push('Fűtésre is: a szükséges teljesítményt az épület hővesztesége adja, ezt a helyszíni felmérésen nézzük meg.');
  }

  const kwSzukseges = Math.round((watt / 1000) * 10) / 10;
  const gep = A.gepek.find((g) => g >= kwSzukseges) ?? null;

  return { watt: Math.round(watt), kwSzukseges, gep, tobbGep: gep === null, indoklas, megjegyzesek };
}
