import Phaser from 'phaser';
import type { Labirinto } from '../logica/labirinto';
import { CASELLA, COLORI, pixel } from './stile';

type G = Phaser.GameObjects.Graphics;

// Su, sinistra, giù, destra (stesso ordine delle direzioni del gioco).
const ANGOLI = [-Math.PI / 2, Math.PI, Math.PI / 2, 0];

/**
 * Muri al neon: per ogni lato di un muro che affaccia su uno spazio aperto si traccia una
 * linea rientrata. Le estremità si allungano o si accorciano secondo gli angoli (convessi o
 * concavi), così le linee dei muri vicini si saldano in un contorno continuo.
 */
export function disegnaLabirinto(g: G, lab: Labirinto): void {
  const W = lab.larghezza, H = lab.altezza;
  const muro = (x: number, y: number) =>
    x >= 0 && x < W && y >= 0 && y < H && lab.muro[y * W + x] && !lab.vuoto[y * W + x] && !lab.casa[y * W + x] && !(x === lab.porta.x && y === lab.porta.y);
  const rientro = 7;
  const segmenti: Array<[number, number, number, number]> = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!muro(x, y)) continue;
      const x0 = x * CASELLA, y0 = pixel(0, y).y - CASELLA / 2;
      const x1 = x0 + CASELLA, y1 = y0 + CASELLA;
      g.fillStyle(COLORI.muroRiempimento, 1);
      g.fillRect(x0, y0, CASELLA, CASELLA);
      // Lato superiore / inferiore: estremi sinistro e destro.
      for (const [dy, yy] of [[-1, y0 + rientro], [1, y1 - rientro]] as const) {
        if (muro(x, y + dy)) continue;
        const inizio = !muro(x - 1, y) ? x0 + rientro : muro(x - 1, y + dy) ? x0 - rientro : x0;
        const fine = !muro(x + 1, y) ? x1 - rientro : muro(x + 1, y + dy) ? x1 + rientro : x1;
        segmenti.push([inizio, yy, fine, yy]);
      }
      // Lato sinistro / destro: estremi superiore e inferiore.
      for (const [dx, xx] of [[-1, x0 + rientro], [1, x1 - rientro]] as const) {
        if (muro(x + dx, y)) continue;
        const inizio = !muro(x, y - 1) ? y0 + rientro : muro(x + dx, y - 1) ? y0 - rientro : y0;
        const fine = !muro(x, y + 1) ? y1 - rientro : muro(x + dx, y + 1) ? y1 + rientro : y1;
        segmenti.push([xx, inizio, xx, fine]);
      }
    }
  }

  // Tre passate: alone largo, alone medio, linea viva.
  for (const [spessore, colore, alfa] of [[12, COLORI.muroAlone, 0.12], [6, COLORI.muroAlone, 0.35], [2.5, COLORI.muroLinea, 1]] as const) {
    g.lineStyle(spessore, colore, alfa);
    for (const [a, b, c, d] of segmenti) g.lineBetween(a, b, c, d);
    g.fillStyle(colore, alfa);
    for (const [a, b, c, d] of segmenti) { g.fillCircle(a, b, spessore / 2); g.fillCircle(c, d, spessore / 2); }
  }

  const p = pixel(lab.porta.x, lab.porta.y);
  g.fillStyle(COLORI.porta, 0.25);
  g.fillRect(p.x - CASELLA / 2, p.y - 5, CASELLA, 10);
  g.fillStyle(COLORI.porta, 1);
  g.fillRect(p.x - CASELLA / 2, p.y - 2, CASELLA, 4);
}

export function disegnaPacman(g: G, x: number, y: number, dir: number, t: number, raggio = 13, alfa = 1): void {
  const bocca = 0.05 + 0.32 * Math.abs(Math.sin(t * 14));
  const a = ANGOLI[dir < 0 ? 3 : dir];
  g.fillStyle(COLORI.pacman, 0.12 * alfa);
  g.fillCircle(x, y, raggio * 1.9);
  g.fillStyle(COLORI.pacman, 0.25 * alfa);
  g.fillCircle(x, y, raggio * 1.35);
  g.fillStyle(COLORI.pacman, alfa);
  g.slice(x, y, raggio, a + bocca * Math.PI, a - bocca * Math.PI + Math.PI * 2, false);
  g.fillPath();
  // Riflesso e occhio: un antagonista deve avere uno sguardo.
  g.fillStyle(0xffffff, 0.35 * alfa);
  g.fillCircle(x - raggio * 0.35, y - raggio * 0.45, raggio * 0.22);
  const occhio = a - Math.PI / 2 * (dir === 1 ? -1 : 1);
  g.fillStyle(0x221a00, alfa);
  g.fillCircle(x + Math.cos(occhio) * raggio * 0.5 + Math.cos(a) * 2, y + Math.sin(occhio) * raggio * 0.5 + Math.sin(a) * 2, raggio * 0.14);
}

export interface AspettoFantasma {
  colore: number;
  dir: number;
  t: number;
  spaventato?: boolean;
  lampeggia?: boolean;
  alfa?: number;
  scala?: number;
}

export function disegnaFantasma(g: G, x: number, y: number, a: AspettoFantasma): void {
  const s = a.scala ?? 1;
  const r = 13 * s;
  const alfa = a.alfa ?? 1;
  const colore = a.spaventato ? (a.lampeggia ? COLORI.spaventatoFine : COLORI.spaventato) : a.colore;

  g.fillStyle(colore, 0.12 * alfa);
  g.fillCircle(x, y, r * 2);
  g.fillStyle(colore, 0.22 * alfa);
  g.fillCircle(x, y, r * 1.4);

  // Corpo: cupola, fianchi, orlo ondulato animato.
  const base = y + r * 0.95;
  const onde = 4;
  g.fillStyle(colore, alfa);
  g.beginPath();
  g.arc(x, y - r * 0.15, r, Math.PI, 0, false);
  g.lineTo(x + r, base);
  for (let i = 0; i <= onde * 2; i++) {
    const px = x + r - (i / (onde * 2)) * r * 2;
    const su = i % 2 === 1;
    const fase = Math.sin(a.t * 12 + i) * 1.6 * s;
    g.lineTo(px, base - (su ? 4 * s : 0) + fase);
  }
  g.lineTo(x - r, base);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xffffff, 0.22 * alfa);
  g.fillEllipse(x - r * 0.4, y - r * 0.6, r * 0.5, r * 0.3);

  if (a.spaventato) {
    const viso = a.lampeggia ? 0xff3b5c : 0xffd9b0;
    g.fillStyle(viso, alfa);
    g.fillRect(x - r * 0.4, y - r * 0.3, r * 0.22, r * 0.22);
    g.fillRect(x + r * 0.18, y - r * 0.3, r * 0.22, r * 0.22);
    g.lineStyle(2 * s, viso, alfa);
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const px = x - r * 0.6 + (i / 6) * r * 1.2;
      const py = y + r * 0.35 + (i % 2 ? -3 : 0) * s;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    return;
  }

  const dx = a.dir === 1 ? -1 : a.dir === 3 ? 1 : 0;
  const dy = a.dir === 0 ? -1 : a.dir === 2 ? 1 : 0;
  for (const lato of [-1, 1]) {
    const ox = x + lato * r * 0.38 + dx * 2 * s;
    const oy = y - r * 0.2 + dy * 2 * s;
    g.fillStyle(0xffffff, alfa);
    g.fillEllipse(ox, oy, r * 0.56, r * 0.7);
    g.fillStyle(0x1b2a9e, alfa);
    g.fillCircle(ox + dx * r * 0.14, oy + dy * r * 0.17, r * 0.16);
  }
}

/** Freccia (per il Fiuto di Pinky) che punta da (x, y) verso un angolo. */
export function disegnaFreccia(g: G, x: number, y: number, angolo: number, colore: number, alfa: number): void {
  const d = 26;
  const cx = x + Math.cos(angolo) * d, cy = y + Math.sin(angolo) * d;
  const punta = (k: number, off: number) => ({ x: cx + Math.cos(angolo + off) * k, y: cy + Math.sin(angolo + off) * k });
  const a = punta(10, 0), b = punta(8, 2.4), c = punta(8, -2.4);
  g.fillStyle(colore, 0.3 * alfa);
  g.fillCircle(cx, cy, 12);
  g.fillStyle(colore, alfa);
  g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
}

/** Texture morbida per le particelle (generata da codice). */
export function creaTextureScintilla(scena: Phaser.Scene): void {
  if (scena.textures.exists('scintilla')) return;
  const g = scena.make.graphics({ x: 0, y: 0 }, false);
  for (let r = 16; r > 0; r -= 2) {
    g.fillStyle(0xffffff, 0.08 + (1 - r / 16) * 0.5);
    g.fillCircle(16, 16, r);
  }
  g.generateTexture('scintilla', 32, 32);
  g.destroy();
}

/** Texture dei puntini e delle superpillole, disegnate al doppio della risoluzione. */
export function creaTexturePuntini(scena: Phaser.Scene): void {
  if (scena.textures.exists('puntino')) return;
  const g = scena.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(COLORI.puntino, 0.18);
  g.fillCircle(12, 12, 12);
  g.fillStyle(COLORI.puntino, 1);
  g.fillCircle(12, 12, 5.2);
  g.generateTexture('puntino', 24, 24);
  g.clear();
  g.fillStyle(COLORI.pillola, 0.15);
  g.fillCircle(32, 32, 31);
  g.fillStyle(COLORI.pillola, 0.3);
  g.fillCircle(32, 32, 20);
  g.fillStyle(COLORI.pillola, 1);
  g.fillCircle(32, 32, 14);
  g.generateTexture('pillola', 64, 64);
  g.destroy();
}

/** Frutta disegnata da codice, con alone; `resta` (0–1) disegna il tempo rimasto come anello. */
export function disegnaFrutto(g: G, x: number, y: number, tipo: string, t: number, resta: number): void {
  const colore = tipo === 'arancia' ? 0xffa63b : tipo === 'fragola' ? 0xff5f8f : 0xff3b5c;
  const s = 1 + Math.sin(t * 5) * 0.06;
  g.fillStyle(colore, 0.12);
  g.fillCircle(x, y, 22 * s);
  g.fillStyle(colore, 0.22);
  g.fillCircle(x, y, 15 * s);
  g.lineStyle(2, 0xffffff, 0.5);
  g.beginPath();
  g.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * resta, false);
  g.strokePath();
  const verde = 0x5dd16a;
  if (tipo === 'ciliegia') {
    g.lineStyle(2, verde, 1);
    g.lineBetween(x - 4, y + 2, x + 3, y - 9);
    g.lineBetween(x + 5, y + 1, x + 3, y - 9);
    g.fillStyle(colore, 1);
    g.fillCircle(x - 5, y + 4, 5.5);
    g.fillCircle(x + 5, y + 3, 5.5);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(x - 7, y + 2, 1.6);
    g.fillCircle(x + 3, y + 1, 1.6);
  } else if (tipo === 'fragola') {
    g.fillStyle(colore, 1);
    g.fillTriangle(x - 8, y - 3, x + 8, y - 3, x, y + 10);
    g.fillCircle(x - 4, y - 3, 4.5);
    g.fillCircle(x + 4, y - 3, 4.5);
    g.fillStyle(0xfff1a8, 1);
    for (const [dx, dy] of [[-4, -1], [3, -2], [0, 3], [-2, 6], [3, 5]]) g.fillCircle(x + dx, y + dy, 0.9);
    g.fillStyle(verde, 1);
    g.fillTriangle(x - 6, y - 8, x + 6, y - 8, x, y - 4);
  } else {
    g.fillStyle(colore, 1);
    g.fillCircle(x, y + 1, 8);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(x - 3, y - 2, 2.2);
    g.fillStyle(verde, 1);
    g.fillEllipse(x + 4, y - 8, 7, 3.5);
  }
}
