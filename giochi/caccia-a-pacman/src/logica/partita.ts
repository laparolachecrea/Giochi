import type { Direzione } from '@condivisi/comandi/direzionale';
import { Labirinto, DX, DY, opposta, type Casella } from './labirinto';
import { DIFFICOLTA, FANTASMI, REGOLE, type Difficolta, type LivelloDifficolta } from './costanti';
import { decidiPacman } from './cervello-pacman';
import { decidiFantasma, vuoleUsarePotere } from './cervello-fantasmi';

/**
 * Simulazione completa della partita, senza grafica: la scena la legge e la disegna.
 * Separarla dal disegno permette di collaudarla, simulare migliaia di partite per il
 * bilanciamento e, in futuro, farla girare sul dispositivo che ospita la partita online.
 */

export interface Mobile {
  /** Ultima casella di cui si è passato il centro. */
  t: Casella;
  dir: Direzione;
  /** Avanzamento verso la casella successiva, da 0 a 1. */
  prog: number;
  deciso: boolean;
}

export interface PacMan extends Mobile {
  obiettivo: number | null;
}

export type StatoFantasma = 'casa' | 'uscita' | 'caccia' | 'mangiato';

export interface Fantasma extends Mobile {
  id: number;
  umano: boolean;
  stato: StatoFantasma;
  /** Secondi all'uscita (in casa) o alla rinascita (mangiato). */
  timer: number;
  spaventato: boolean;
  /** Secondi prima di poter riusare il potere. */
  ricarica: number;
  /** Durata dell'ultima ricarica (dipende dall'energia), per disegnarne l'avanzamento. */
  ricaricaTotale: number;
  /** Secondi di effetto del potere ancora attivi. */
  attivo: number;
  precedente: Casella | null;
  richiesta: Direzione;
  pattuglia: number | null;
  /** Posizione libera usata in casa e durante l'uscita. */
  px: number;
  py: number;
  tappa: number;
}

export type Evento =
  | { tipo: 'puntino'; x: number; y: number }
  | { tipo: 'superpillola'; x: number; y: number; energiaPersa: boolean }
  | { tipo: 'cattura'; id: number; energiaRecuperata: boolean }
  | { tipo: 'mangiato'; id: number }
  | { tipo: 'potere'; id: number }
  | { tipo: 'potereNegato'; id: number }
  | { tipo: 'via' }
  | { tipo: 'fine' };

export type Fase = 'pronti' | 'gioco' | 'presa' | 'fine';

export interface Esito {
  vincitore: 'fantasmi' | 'pacman';
  motivo: 'catture' | 'puntini' | 'tempo';
}

export interface OpzioniPartita {
  difficolta: LivelloDifficolta;
  /** Indice del fantasma controllato dal giocatore; null = tutti controllati dal computer. */
  umano: number | null;
  /** Il posto del giocatore è guidato dal computer (per collaudi e bilanciamento). */
  autopilota?: boolean;
  seme?: number;
}

/** Generatore pseudo-casuale con seme: stesse scelte, stessa partita (utile nei collaudi). */
export function mulberry32(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Partita {
  readonly lab = new Labirinto();
  readonly diff: Difficolta;
  readonly rng: () => number;
  readonly pacman: PacMan;
  readonly fantasmi: Fantasma[];
  readonly umano: number | null;
  readonly autopilota: boolean;

  fase: Fase = 'pronti';
  timerFase = REGOLE.durataPronti;
  tempo = REGOLE.durataPartita;
  vite = REGOLE.vitePacman;
  spavento = 0;
  rivelato = 0;
  /** Energia dei poteri della squadra (vedi REGOLE.energiaMassima). */
  energia = REGOLE.energiaMassima;
  esito: Esito | null = null;
  eventi: Evento[] = [];
  /** Puntini e superpillole ancora presenti (indici di casella). */
  readonly rimasti = new Set<number>();
  /** Ciò che la squadra sa dei puntini: 0 niente, 1 puntino, 2 superpillola. */
  readonly conosciuti: Uint8Array;
  /** Caselle viste dalla squadra in questo istante. */
  readonly visibili: Uint8Array;
  pacVisibile = false;
  ultimaPosizione: { x: number; y: number; dir: Direzione; eta: number } | null = null;
  readonly statistiche = { catture: 0, fantasmiMangiati: 0, superpillole: 0, catturePerFantasma: [0, 0, 0, 0] };

  constructor(opzioni: OpzioniPartita) {
    this.diff = DIFFICOLTA[opzioni.difficolta];
    this.rng = mulberry32(opzioni.seme ?? Math.floor(Math.random() * 2 ** 31));
    this.umano = opzioni.umano;
    this.autopilota = opzioni.autopilota ?? false;
    const n = this.lab.larghezza * this.lab.altezza;
    this.conosciuti = new Uint8Array(n);
    this.visibili = new Uint8Array(n);
    for (const i of this.lab.puntini) { this.rimasti.add(i); this.conosciuti[i] = 1; }
    for (const i of this.lab.superpillole) { this.rimasti.add(i); this.conosciuti[i] = 2; }
    this.pacman = { t: { ...this.lab.partenzaPacman }, dir: -1, prog: 0, deciso: false, obiettivo: null };
    this.fantasmi = FANTASMI.map((_, id) => ({
      id, umano: id === opzioni.umano, stato: 'casa', timer: 0, spaventato: false, ricarica: 0, ricaricaTotale: 1, attivo: 0,
      precedente: null, richiesta: -1, pattuglia: null, px: 0, py: 0, tappa: 0,
      t: { x: 0, y: 0 }, dir: -1, prog: 0, deciso: false,
    }));
    this.posizionaTutti();
    this.calcolaVisione();
  }

  get puntiniTotali(): number {
    return this.lab.puntini.length + this.lab.superpillole.length;
  }

  /** Avanza la simulazione di `dt` secondi. `direzione` e `azione` sono i comandi del giocatore. */
  aggiorna(dt: number, direzione: Direzione = -1, azione = false): void {
    this.eventi = [];
    if (this.fase === 'fine') return;
    dt = Math.min(dt, 1 / 30);
    const umano = this.umano !== null ? this.fantasmi[this.umano] : null;
    if (umano && direzione >= 0) umano.richiesta = direzione;

    if (this.fase !== 'gioco') {
      this.timerFase -= dt;
      if (this.timerFase > 0) return;
      if (this.fase === 'presa') {
        this.posizionaTutti();
        this.fase = 'pronti';
        this.timerFase = REGOLE.durataPronti * 0.75;
        return;
      }
      this.fase = 'gioco';
      this.eventi.push({ tipo: 'via' });
    }

    this.tempo -= dt;
    if (this.tempo <= 0) { this.tempo = 0; return this.termina('pacman', 'tempo'); }

    this.lab.aggiornaMuri(dt);
    this.spavento = Math.max(0, this.spavento - dt);
    if (this.spavento === 0) this.fantasmi.forEach((f) => (f.spaventato = false));
    this.rivelato = Math.max(0, this.rivelato - dt);
    if (this.ultimaPosizione) this.ultimaPosizione.eta += dt;

    for (const f of this.fantasmi) {
      f.ricarica = Math.max(0, f.ricarica - dt);
      f.attivo = Math.max(0, f.attivo - dt);
      const vuole = f.umano && !this.autopilota ? azione : vuoleUsarePotere(this, f);
      if (vuole) this.usaPotere(f);
    }

    this.muovi(this.pacman, this.diff.velocitaPacman * dt, () => {
      this.pacman.dir = decidiPacman(this);
    }, () => this.mangia());
    if (this.fase !== 'gioco') return;

    for (const f of this.fantasmi) this.muoviFantasma(f, dt);
    this.controllaContatti();
    this.calcolaVisione();
  }

  /** Casella occupata (quella più vicina al centro dell'entità). */
  casellaDi(m: Mobile): Casella {
    return m.prog < 0.5 || m.dir < 0 ? m.t : this.lab.vicina(m.t, m.dir);
  }

  /** Posizione continua in caselle, per il disegno. */
  posizione(m: Mobile | Fantasma): { x: number; y: number } {
    if ('stato' in m && m.stato !== 'caccia') return { x: m.px, y: m.py };
    if (m.dir < 0) return { x: m.t.x, y: m.t.y };
    return { x: m.t.x + DX[m.dir] * m.prog, y: m.t.y + DY[m.dir] * m.prog };
  }

  // ————————————————————————————— movimento —————————————————————————————

  private muovi(m: Mobile, distanza: number, decidi: () => void, arrivo?: () => void): void {
    let resto = distanza;
    for (let giri = 0; resto > 1e-9 && giri < 8; giri++) {
      if (m.prog === 0) {
        if (!m.deciso) { decidi(); m.deciso = true; }
        const v = m.dir >= 0 ? this.lab.vicina(m.t, m.dir) : null;
        if (!v || !this.lab.libera(v.x, v.y)) { m.deciso = false; return; }
      }
      const passo = Math.min(resto, 1 - m.prog);
      m.prog += passo;
      resto -= passo;
      if (m.prog >= 1 - 1e-9) {
        if ('precedente' in m) (m as Fantasma).precedente = m.t;
        m.t = this.lab.vicina(m.t, m.dir);
        m.prog = 0;
        m.deciso = false;
        arrivo?.();
        if (this.fase !== 'gioco') return;
      }
    }
  }

  private inverti(m: Mobile): void {
    if (m.dir < 0) return;
    if (m.prog > 0) {
      m.t = this.lab.vicina(m.t, m.dir);
      m.prog = 1 - m.prog;
    }
    m.dir = opposta(m.dir);
  }

  private muoviFantasma(f: Fantasma, dt: number): void {
    if (f.stato === 'casa' || f.stato === 'mangiato') {
      f.timer -= dt;
      f.py = this.lab.postiCasa[0].y + Math.sin(this.tempo * 6 + f.id) * 0.15;
      if (f.timer <= 0) { f.stato = 'uscita'; f.tappa = 0; }
      return;
    }
    if (f.stato === 'uscita') {
      const { porta, uscitaCasa } = this.lab;
      const tappe = [{ x: porta.x, y: porta.y + 1 }, porta, uscitaCasa];
      let resto = 3 * dt;
      while (resto > 0 && f.tappa < tappe.length) {
        const meta = tappe[f.tappa];
        const dx = meta.x - f.px, dy = meta.y - f.py;
        const d = Math.hypot(dx, dy);
        if (d <= resto) { f.px = meta.x; f.py = meta.y; resto -= d; f.tappa++; }
        else { f.px += (dx / d) * resto; f.py += (dy / d) * resto; resto = 0; }
      }
      if (f.tappa >= tappe.length) this.entraInCaccia(f);
      return;
    }

    let velocita = REGOLE.velocitaFantasma * (f.umano ? 1 : REGOLE.fattoreCompagni);
    if (f.spaventato) velocita *= REGOLE.fattoreSpavento;
    if (f.id === 0 && f.attivo > 0) velocita *= REGOLE.fattoreScatto;
    const c = this.casellaDi(f);
    if (c.y === 9 && (c.x <= 3 || c.x >= this.lab.larghezza - 4)) velocita *= REGOLE.fattoreTunnel;

    const manuale = f.umano && !this.autopilota;
    if (manuale && f.richiesta >= 0 && f.richiesta === opposta(f.dir) && f.prog > 0) this.inverti(f);
    this.muovi(f, velocita * dt, () => {
      f.dir = manuale ? this.direzioneUmano(f) : decidiFantasma(this, f);
    });
  }

  private direzioneUmano(f: Fantasma): Direzione {
    if (f.richiesta >= 0) {
      const v = this.lab.vicina(f.t, f.richiesta);
      if (this.lab.libera(v.x, v.y)) return f.richiesta;
    }
    // La richiesta resta in memoria: si applicherà al primo incrocio utile.
    return f.dir;
  }

  private entraInCaccia(f: Fantasma): void {
    f.stato = 'caccia';
    f.t = { ...this.lab.uscitaCasa };
    f.prog = 0;
    f.deciso = false;
    f.dir = f.umano ? f.richiesta : -1;
    f.precedente = null;
  }

  // ————————————————————————————— regole —————————————————————————————

  private mangia(): void {
    const c = this.pacman.t;
    const i = this.lab.indice(c.x, c.y);
    if (!this.rimasti.has(i)) return;
    this.rimasti.delete(i);
    if (this.lab.superpillole.includes(i)) {
      this.statistiche.superpillole++;
      this.spavento = REGOLE.durataSpavento;
      const energiaPersa = this.energia > 0;
      this.energia = Math.max(0, this.energia - 1);
      this.rivelato = Math.max(this.rivelato, REGOLE.rivelaSuperpillola);
      for (const f of this.fantasmi) {
        if (f.stato !== 'caccia') continue;
        f.spaventato = true;
        if (!f.umano) this.inverti(f);
      }
      this.eventi.push({ tipo: 'superpillola', x: c.x, y: c.y, energiaPersa });
    } else {
      this.eventi.push({ tipo: 'puntino', x: c.x, y: c.y });
    }
    if (this.rimasti.size === 0) this.termina('pacman', 'puntini');
  }

  private controllaContatti(): void {
    const p = this.posizione(this.pacman);
    const L = this.lab.larghezza;
    for (const f of this.fantasmi) {
      if (f.stato !== 'caccia') continue;
      const q = this.posizione(f);
      let dx = Math.abs(p.x - q.x);
      dx = Math.min(dx, L - dx);
      if (Math.hypot(dx, p.y - q.y) > REGOLE.distanzaCattura) continue;
      if (f.spaventato) {
        this.statistiche.fantasmiMangiati++;
        this.rimandaACasa(f, REGOLE.attesaRinascita);
        f.stato = 'mangiato';
        this.eventi.push({ tipo: 'mangiato', id: f.id });
      } else {
        this.statistiche.catture++;
        this.statistiche.catturePerFantasma[f.id]++;
        this.vite--;
        const energiaRecuperata = this.energia < REGOLE.energiaMassima;
        this.energia = Math.min(REGOLE.energiaMassima, this.energia + 1);
        this.eventi.push({ tipo: 'cattura', id: f.id, energiaRecuperata });
        if (this.vite <= 0) return this.termina('fantasmi', 'catture');
        this.fase = 'presa';
        this.timerFase = REGOLE.durataPresa;
        return;
      }
    }
  }

  private usaPotere(f: Fantasma): void {
    if (f.ricarica > 0 || f.stato !== 'caccia' || f.spaventato) {
      if (f.umano) this.eventi.push({ tipo: 'potereNegato', id: f.id });
      return;
    }
    if (f.id === 2 && !this.piazzaMuro(f)) {
      this.eventi.push({ tipo: 'potereNegato', id: f.id });
      return;
    }
    const def = FANTASMI[f.id];
    const perso = REGOLE.energiaMassima - this.energia;
    f.ricarica = def.ricarica * (f.umano ? 1 : REGOLE.ricaricaCompagni) * (1 + REGOLE.penalitaRicarica * perso);
    f.ricaricaTotale = f.ricarica;
    f.attivo = def.durata * (1 - REGOLE.penalitaDurata * perso);
    if (f.id === 3) this.rivelato = Math.max(this.rivelato, f.attivo);
    this.eventi.push({ tipo: 'potere', id: f.id });
  }

  /** Inky: chiude la casella appena lasciata. Fallisce se è occupata. */
  private piazzaMuro(f: Fantasma): boolean {
    const dietro = f.prog > 0 ? f.t : f.precedente;
    if (!dietro || !this.lab.libera(dietro.x, dietro.y)) return false;
    const i = this.lab.indice(dietro.x, dietro.y);
    const tutti: Mobile[] = [this.pacman, ...this.fantasmi.filter((g) => g.stato === 'caccia')];
    if (tutti.some((m) => { const c = this.casellaDi(m); return this.lab.indice(c.x, c.y) === i; })) return false;
    this.lab.muriTemporanei.set(i, FANTASMI[2].durata * (1 - REGOLE.penalitaDurata * (REGOLE.energiaMassima - this.energia)));
    // Chi stava entrando in quella casella torna indietro.
    for (const m of tutti) {
      if (m.prog > 0 && m.dir >= 0) {
        const v = this.lab.vicina(m.t, m.dir);
        if (this.lab.indice(v.x, v.y) === i) this.inverti(m);
      }
    }
    return true;
  }

  private termina(vincitore: Esito['vincitore'], motivo: Esito['motivo']): void {
    this.esito = { vincitore, motivo };
    this.fase = 'fine';
    this.eventi.push({ tipo: 'fine' });
  }

  private rimandaACasa(f: Fantasma, attesa: number): void {
    const posti = this.lab.postiCasa;
    const posto = posti[f.id % posti.length];
    f.px = posto.x;
    f.py = posto.y;
    f.timer = attesa;
    f.spaventato = false;
    f.dir = -1;
    f.prog = 0;
    f.tappa = 0;
    f.pattuglia = null;
  }

  private posizionaTutti(): void {
    this.pacman.t = { ...this.lab.partenzaPacman };
    this.pacman.dir = -1;
    this.pacman.prog = 0;
    this.pacman.deciso = false;
    this.pacman.obiettivo = null;
    this.spavento = 0;
    this.rivelato = 0;
    this.ultimaPosizione = null;
    this.lab.muriTemporanei.clear();
    let slot = 0;
    for (const f of this.fantasmi) {
      f.attivo = 0;
      if (f.umano) {
        f.px = this.lab.uscitaCasa.x;
        f.py = this.lab.uscitaCasa.y;
        f.spaventato = false;
        f.pattuglia = null;
        this.entraInCaccia(f);
      } else {
        this.rimandaACasa(f, REGOLE.usciteBot[slot++] ?? 0);
        f.stato = 'casa';
      }
    }
  }

  // ————————————————————————————— visione (nebbia) —————————————————————————————

  private calcolaVisione(): void {
    const { lab, visibili } = this;
    visibili.fill(0);
    const r = REGOLE.raggioVicino;
    const ri = Math.ceil(r);
    for (const f of this.fantasmi) {
      if (f.stato !== 'caccia' && f.stato !== 'uscita') continue;
      const c = f.stato === 'caccia' ? this.casellaDi(f) : { x: Math.round(f.px), y: Math.round(f.py) };
      for (let dy = -ri; dy <= ri; dy++) {
        for (let dx = -ri; dx <= ri; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const y = c.y + dy;
          if (y < 0 || y >= lab.altezza) continue;
          visibili[lab.indice(c.x + dx, y)] = 1;
        }
      }
      for (let d = 0 as Direzione; d < 4; d++) {
        let p = c;
        for (let k = 0; k < REGOLE.raggioCorridoio; k++) {
          p = lab.vicina(p, d);
          if (p.y < 0 || p.y >= lab.altezza) break;
          visibili[lab.indice(p.x, p.y)] = 1;
          if (!lab.libera(p.x, p.y)) break;
        }
      }
    }
    for (let i = 0; i < visibili.length; i++) {
      if (!visibili[i]) continue;
      this.conosciuti[i] = this.rimasti.has(i) ? (lab.superpillole.includes(i) ? 2 : 1) : 0;
    }
    const pc = this.casellaDi(this.pacman);
    this.pacVisibile = this.rivelato > 0 || visibili[lab.indice(pc.x, pc.y)] === 1;
    if (this.pacVisibile) {
      this.ultimaPosizione = { x: pc.x, y: pc.y, dir: this.pacman.dir, eta: 0 };
    }
  }
}
