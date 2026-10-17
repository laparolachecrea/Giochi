/** Dimensioni logiche (in pixel "di progetto"); il gioco le disegna al doppio per gli schermi ad alta densità. */
export const CASELLA = 32;
export const LARGHEZZA = 19 * CASELLA;
/** Altezza minima del progetto; sui telefoni lo spazio in più va a HUD e barra dei comandi. */
export const ALTEZZA_BASE = 60 + 21 * CASELLA + 84;
const proporzione = typeof window === 'undefined' ? 0 : window.innerHeight / Math.max(1, window.innerWidth);
export const ALTEZZA = Math.round(Math.min(1500, Math.max(ALTEZZA_BASE, LARGHEZZA * proporzione)));
const extra = ALTEZZA - ALTEZZA_BASE;
export const ALTEZZA_HUD = 60 + Math.round(Math.min(extra * 0.3, 90));
export const ALTEZZA_BARRA = ALTEZZA - ALTEZZA_HUD - 21 * CASELLA;
export const ZOOM = 2;

export const COLORI = {
  sfondo: 0x04050d,
  muroAlone: 0x1e3cff,
  muroLinea: 0x6f9bff,
  muroRiempimento: 0x0a1235,
  porta: 0xff8ae2,
  puntino: 0xffd9b0,
  pillola: 0xfff1c9,
  pacman: 0xffe14d,
  spaventato: 0x2a3cff,
  spaventatoFine: 0xf2f2ff,
  nebbia: 0x020309,
  testo: 0xe8ecff,
  testoTenue: 0x8a93c9,
  accento: 0xffe14d,
};

export const CARATTERE = '"Press Start 2P", ui-monospace, monospace';

export const esadecimale = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** Centro in pixel di una casella (coordinate anche frazionarie). */
export const pixel = (x: number, y: number) => ({
  x: (x + 0.5) * CASELLA,
  y: ALTEZZA_HUD + (y + 0.5) * CASELLA,
});
