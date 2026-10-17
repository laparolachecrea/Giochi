import type { Direzione } from '@condivisi/comandi/direzionale';

/**
 * Legenda: # muro, _ vuoto esterno (non disegnato), . puntino, o superpillola,
 * spazio = corridoio vuoto, G casa dei fantasmi, - porta della casa, P partenza di Pac-Man.
 * La riga 9 ha un tunnel: uscendo da un lato si rientra dall'altro.
 */
export const MAPPA = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '___#.#       #.#___',
  '####.# ##-## #.####',
  '    .  #GGG#  .    ',
  '####.# ##### #.####',
  '___#.#       #.#___',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];

export const DX = [0, -1, 0, 1];
export const DY = [-1, 0, 1, 0];
export const opposta = (d: Direzione): Direzione => (d < 0 ? -1 : ((d + 2) % 4) as Direzione);

export interface Casella {
  x: number;
  y: number;
}

export const IRRAGGIUNGIBILE = 9999;

export class Labirinto {
  readonly larghezza: number;
  readonly altezza: number;
  /** Muri fissi (incluso il vuoto esterno, la casa e la porta). */
  readonly muro: boolean[];
  readonly vuoto: boolean[];
  readonly casa: boolean[];
  readonly porta: Casella;
  readonly uscitaCasa: Casella;
  readonly postiCasa: Casella[];
  readonly puntini: number[];
  readonly superpillole: number[];
  readonly partenzaPacman: Casella;
  readonly percorribili: number[];
  /** Muri temporanei (potere di Inky): indice casella → secondi rimanenti. */
  readonly muriTemporanei = new Map<number, number>();

  constructor(mappa: string[] = MAPPA) {
    this.altezza = mappa.length;
    this.larghezza = mappa[0].length;
    const n = this.larghezza * this.altezza;
    this.muro = new Array(n).fill(false);
    this.vuoto = new Array(n).fill(false);
    this.casa = new Array(n).fill(false);
    this.puntini = [];
    this.superpillole = [];
    this.postiCasa = [];
    this.percorribili = [];
    let porta: Casella | null = null;
    let partenza: Casella | null = null;
    mappa.forEach((riga, y) => {
      if (riga.length !== this.larghezza) throw new Error(`Riga ${y} di lunghezza ${riga.length}`);
      [...riga].forEach((c, x) => {
        const i = y * this.larghezza + x;
        if (c === '#' || c === '_') this.muro[i] = true;
        if (c === '_') this.vuoto[i] = true;
        if (c === 'G') { this.casa[i] = true; this.muro[i] = true; this.postiCasa.push({ x, y }); }
        if (c === '-') { porta = { x, y }; this.muro[i] = true; }
        if (c === '.') this.puntini.push(i);
        if (c === 'o') this.superpillole.push(i);
        if (c === 'P') partenza = { x, y };
        if (!this.muro[i]) this.percorribili.push(i);
      });
    });
    if (!porta || !partenza) throw new Error('Mappa senza porta o partenza');
    this.porta = porta;
    this.partenzaPacman = partenza;
    this.uscitaCasa = { x: (porta as Casella).x, y: (porta as Casella).y - 1 };
  }

  indice(x: number, y: number): number {
    return y * this.larghezza + this.avvolgi(x);
  }

  avvolgi(x: number): number {
    return ((x % this.larghezza) + this.larghezza) % this.larghezza;
  }

  casella(i: number): Casella {
    return { x: i % this.larghezza, y: Math.floor(i / this.larghezza) };
  }

  /** Percorribile per chi è nel labirinto (Pac-Man e fantasmi fuori casa). */
  libera(x: number, y: number): boolean {
    if (y < 0 || y >= this.altezza) return false;
    const i = this.indice(x, y);
    return !this.muro[i] && !this.muriTemporanei.has(i);
  }

  vicina(c: Casella, d: Direzione): Casella {
    return { x: this.avvolgi(c.x + DX[d]), y: c.y + DY[d] };
  }

  uscite(c: Casella): Direzione[] {
    const r: Direzione[] = [];
    for (let d = 0 as Direzione; d < 4; d++) {
      const v = this.vicina(c, d);
      if (this.libera(v.x, v.y)) r.push(d);
    }
    return r;
  }

  /** Distanze in passi (ricerca in ampiezza) da una o più caselle di partenza. */
  distanze(partenze: Casella[], bloccate?: Set<number>): Int16Array {
    const dist = new Int16Array(this.larghezza * this.altezza).fill(IRRAGGIUNGIBILE);
    const coda: number[] = [];
    for (const p of partenze) {
      const i = this.indice(p.x, p.y);
      if (dist[i] !== 0) { dist[i] = 0; coda.push(i); }
    }
    for (let testa = 0; testa < coda.length; testa++) {
      const i = coda[testa];
      const c = this.casella(i);
      for (let d = 0 as Direzione; d < 4; d++) {
        const v = this.vicina(c, d);
        if (!this.libera(v.x, v.y)) continue;
        const j = this.indice(v.x, v.y);
        if (dist[j] !== IRRAGGIUNGIBILE || bloccate?.has(j)) continue;
        dist[j] = dist[i] + 1;
        coda.push(j);
      }
    }
    return dist;
  }

  /** Casella percorribile più vicina (in linea d'aria) a un punto qualsiasi, anche fuori mappa. */
  piuVicinaLibera(x: number, y: number): Casella {
    let migliore = this.percorribili[0];
    let best = Infinity;
    for (const i of this.percorribili) {
      const c = this.casella(i);
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < best) { best = d; migliore = i; }
    }
    return this.casella(migliore);
  }

  aggiornaMuri(dt: number): void {
    for (const [i, t] of this.muriTemporanei) {
      if (t - dt <= 0) this.muriTemporanei.delete(i);
      else this.muriTemporanei.set(i, t - dt);
    }
  }
}
