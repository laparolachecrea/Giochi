import type { Direzione } from '@condivisi/comandi/direzionale';
import { opposta, type Casella } from './labirinto';
import { REGOLE } from './costanti';
import type { Fantasma, Partita } from './partita';

/**
 * Fantasmi controllati dal computer. Rispettano la nebbia: conoscono Pac-Man solo
 * quando la squadra lo vede, altrimenti usano l'ultima posizione nota o pattugliano.
 * Quando c'è un giocatore sono "battitori", come in una battuta di caccia: invece di
 * inseguire Pac-Man si piazzano dalla parte opposta rispetto al giocatore e lo spingono
 * verso di lui. Senza giocatore (simulazioni) conservano la personalità dell'originale.
 */
export function decidiFantasma(p: Partita, f: Fantasma): Direzione {
  const { lab, rng } = p;
  const uscite = lab.uscite(f.t);
  const avanti = uscite.filter((d) => d !== opposta(f.dir));
  const scelte = avanti.length ? avanti : uscite;
  if (scelte.length === 0) return -1;

  if (f.spaventato) {
    if (!p.pacVisibile) return scelte[Math.floor(rng() * scelte.length)];
    const dpac = lab.distanze([p.casellaDi(p.pacman)]);
    return migliore(scelte, (d) => -dpac[indiceVicina(p, f.t, d)] + rng() * 0.5);
  }

  const meta = bersaglio(p, f);
  const dm = lab.distanze([meta]);
  return migliore(scelte, (d) => dm[indiceVicina(p, f.t, d)] + rng() * 0.3, true);
}

export function bersaglio(p: Partita, f: Fantasma): Casella {
  const { lab } = p;
  const pac = p.casellaDi(p.pacman);
  const qui = p.casellaDi(f);
  const fiuto = p.nebbia && f.id === 1 && f.attivo > 0;
  // Richiamo di Pinky (senza nebbia): tutti i compagni puntano dritti su Pac-Man.
  if (!p.nebbia && !f.umano && p.fantasmi[1].attivo > 0) return pac;

  if (p.pacVisibile || fiuto) {
    if (f.umano || Math.hypot(pac.x - qui.x, pac.y - qui.y) <= 2) return pac;
    const g = p.umano !== null ? p.fantasmi[p.umano] : null;
    if (g && g.stato === 'caccia') {
      // Battitore: si mette oltre Pac-Man, sul lato opposto al giocatore, a distanze diverse.
      const h = p.casellaDi(g);
      const dx = pac.x - h.x, dy = pac.y - h.y;
      const l = Math.hypot(dx, dy) || 1;
      const compagni = p.fantasmi.filter((x) => !x.umano);
      const k = 3 + 2 * compagni.indexOf(f);
      return lab.piuVicinaLibera(pac.x + (dx / l) * k, pac.y + (dy / l) * k);
    }
    switch (f.id) {
      case 1: return avanti(p, pac, p.pacman.dir, 4);
      case 2: {
        // Tenaglia: il punto simmetrico a Blinky rispetto a Pac-Man.
        const b = p.casellaDi(p.fantasmi[0]);
        return lab.piuVicinaLibera(pac.x * 2 - b.x, pac.y * 2 - b.y);
      }
      case 3: {
        // Clyde presidia la superpillola più vicina a Pac-Man.
        const pillola = pilloleNote(p).sort((a, b) => dist2(a, pac) - dist2(b, pac))[0];
        if (pillola && dist2(qui, pac) > 49) return pillola;
        return pac;
      }
      default: return pac;
    }
  }

  const u = p.ultimaPosizione;
  if (u && u.eta < REGOLE.memoriaPosizione && (f.umano || f.id !== 3)) {
    const nota = { x: u.x, y: u.y };
    return !f.umano && f.id === 1 && u.dir >= 0 ? avanti(p, nota, u.dir, 4) : nota;
  }
  return pattuglia(p, f);
}

/** Decide se un fantasma del computer (o il giocatore simulato) usa ora il suo potere. */
export function vuoleUsarePotere(p: Partita, f: Fantasma): boolean {
  if (f.ricarica > 0 || f.stato !== 'caccia' || f.spaventato || p.fase !== 'gioco') return false;
  const u = p.ultimaPosizione;
  const pac = p.casellaDi(p.pacman);
  const qui = p.casellaDi(f);
  switch (f.id) {
    // Lo Scatto lo usa solo il giocatore: un compagno che scatta gli ruberebbe la cattura.
    case 0: return f.umano && p.pacVisibile && dist2(pac, qui) <= 16;
    case 1: {
      if (p.nebbia) return !p.pacVisibile && (!u || u.eta > 2);
      // Richiamo: quando Pac-Man è vicino al giocatore, i compagni accorrono.
      const g = p.umano !== null ? p.fantasmi[p.umano] : f;
      return dist2(pac, p.casellaDi(g)) <= 49;
    }
    case 2: {
      const dietro = f.prog > 0 ? f.t : f.precedente;
      if (!p.pacVisibile || !dietro || dist2(pac, qui) > 64) return false;
      // Chiude il corridoio solo se Pac-Man è più vicino a quello che a Inky: gli taglia la strada.
      const dpac = p.lab.distanze([pac]);
      return dpac[p.lab.indice(dietro.x, dietro.y)] < dpac[p.lab.indice(qui.x, qui.y)];
    }
    case 3: {
      if (p.nebbia) return !p.pacVisibile && (!u || u.eta > 4);
      // Onda: rallenta Pac-Man quando un fantasma gli è addosso.
      return p.fantasmi.some((g) => g.stato === 'caccia' && dist2(pac, p.casellaDi(g)) <= 25);
    }
  }
  return false;
}

function pattuglia(p: Partita, f: Fantasma): Casella {
  const { lab, rng } = p;
  const qui = p.casellaDi(f);
  if (f.pattuglia !== null && lab.indice(qui.x, qui.y) !== f.pattuglia && p.conosciuti[f.pattuglia]) {
    return lab.casella(f.pattuglia);
  }
  // Ogni fantasma tiene d'occhio un quarto del labirinto, dove la squadra sa che restano puntini.
  const metaX = lab.larghezza / 2, metaY = lab.altezza / 2;
  const destra = f.id === 0 || f.id === 2;
  const sopra = f.id === 0 || f.id === 1;
  const noti: number[] = [];
  const nelQuarto: number[] = [];
  p.conosciuti.forEach((v, i) => {
    if (!v) return;
    noti.push(i);
    const c = lab.casella(i);
    if (c.x >= metaX === destra && c.y < metaY === sopra) nelQuarto.push(i);
  });
  const lista = nelQuarto.length ? nelQuarto : noti.length ? noti : lab.percorribili;
  f.pattuglia = lista[Math.floor(rng() * lista.length)];
  return lab.casella(f.pattuglia);
}

function avanti(p: Partita, da: Casella, dir: Direzione, passi: number): Casella {
  if (dir < 0) return da;
  let c = da;
  for (let k = 0; k < passi; k++) {
    const v = p.lab.vicina(c, dir);
    if (!p.lab.libera(v.x, v.y)) break;
    c = v;
  }
  return c;
}

function pilloleNote(p: Partita): Casella[] {
  return p.lab.superpillole.filter((i) => p.conosciuti[i] === 2).map((i) => p.lab.casella(i));
}

const dist2 = (a: Casella, b: Casella) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

function indiceVicina(p: Partita, c: Casella, d: Direzione): number {
  const v = p.lab.vicina(c, d);
  return p.lab.indice(v.x, v.y);
}

function migliore(scelte: Direzione[], costo: (d: Direzione) => number, minimo = false): Direzione {
  let scelta = scelte[0];
  let best = minimo ? Infinity : -Infinity;
  for (const d of scelte) {
    const v = costo(d);
    if (minimo ? v < best : v > best) { best = v; scelta = d; }
  }
  return scelta;
}
