import type { Direzione } from '@condivisi/comandi/direzionale';
import { IRRAGGIUNGIBILE, opposta, type Casella } from './labirinto';
import type { Partita } from './partita';

/**
 * Il cervello di Pac-Man, deciso a ogni incrocio con tre priorità:
 * 1. pericolo vicino → fuga verso la zona più ampia che raggiunge prima dei fantasmi;
 * 2. fantasmi spaventati raggiungibili in tempo → li insegue;
 * 3. altrimenti → il puntino più conveniente tra quelli "sicuri".
 * Una zona è sicura se Pac-Man ci arriva prima di qualunque fantasma: è il criterio
 * che rende la fuga credibile senza simulare il futuro passo per passo.
 */
export function decidiPacman(p: Partita): Direzione {
  const { lab, pacman: pm, diff, rng } = p;
  const qui = pm.t;
  const uscite = lab.uscite(qui);
  if (uscite.length === 0) return -1;

  if (rng() < diff.errore) {
    const avanti = uscite.filter((d) => d !== opposta(pm.dir));
    const scelte = avanti.length ? avanti : uscite;
    return scelte[Math.floor(rng() * scelte.length)];
  }

  const dp = lab.distanze([qui]);
  const minacce: Casella[] = [];
  for (const f of p.fantasmi) {
    if (f.spaventato) continue;
    let c: Casella | null = null;
    if (f.stato === 'caccia') c = p.casellaDi(f);
    else if (f.stato === 'uscita' || ((f.stato === 'casa' || f.stato === 'mangiato') && f.timer < 1)) c = lab.uscitaCasa;
    if (c && dp[lab.indice(c.x, c.y)] <= diff.visione) minacce.push(c);
  }
  const dg = minacce.length ? lab.distanze(minacce) : null;
  const distFantasma = (i: number) => (dg ? dg[i] : IRRAGGIUNGIBILE);
  const pericolo = distFantasma(lab.indice(qui.x, qui.y));

  if (pericolo <= diff.pericolo) return fuga(p, uscite, distFantasma);

  if (p.spavento > 1) {
    let preda: Casella | null = null;
    let migliore = IRRAGGIUNGIBILE;
    for (const f of p.fantasmi) {
      if (!f.spaventato || f.stato !== 'caccia') continue;
      const c = p.casellaDi(f);
      const d = dp[lab.indice(c.x, c.y)];
      if (d < migliore && d <= 10 && d / diff.velocitaPacman < p.spavento - 0.5) { migliore = d; preda = c; }
    }
    if (preda) return verso(p, preda, uscite, distFantasma);
  }

  const obiettivo = scegliObiettivo(p, dp, distFantasma, pericolo);
  if (obiettivo === null) return fuga(p, uscite, distFantasma);
  pm.obiettivo = obiettivo;
  return verso(p, lab.casella(obiettivo), uscite, distFantasma);
}

function scegliObiettivo(p: Partita, dp: Int16Array, distFantasma: (i: number) => number, pericolo: number): number | null {
  const { lab, pacman: pm } = p;
  const soloPillole = [...p.rimasti].every((i) => lab.superpillole.includes(i));
  const valuta = (i: number): number => {
    const margine = distFantasma(i) - dp[i];
    if (dp[i] >= IRRAGGIUNGIBILE || margine <= 2) return -Infinity;
    const pillola = lab.superpillole.includes(i);
    // Le superpillole si conservano per quando servono, come fa un buon giocatore.
    if (pillola && pericolo > 9 && !soloPillole) return -Infinity;
    return -dp[i] + Math.min(margine, 10) * 0.5 + (pillola ? 6 : 0);
  };
  let migliore: number | null = null;
  let punteggio = -Infinity;
  for (const i of p.rimasti) {
    const v = valuta(i);
    if (v > punteggio) { punteggio = v; migliore = i; }
  }
  // La frutta lo attira: è la sua arma contro i fantasmi.
  if (p.frutto) {
    const i = p.frutto.i;
    const margine = distFantasma(i) - dp[i];
    const v = -dp[i] + Math.min(margine, 10) * 0.5 + 10;
    if (margine > 2 && dp[i] / p.diff.velocitaPacman < p.frutto.resta && v > punteggio) { punteggio = v; migliore = i; }
  }
  // Isteresi: cambia obiettivo solo se il nuovo è nettamente migliore (evita i ripensamenti).
  if (pm.obiettivo !== null && p.rimasti.has(pm.obiettivo) && pm.obiettivo !== p.frutto?.i) {
    const attuale = valuta(pm.obiettivo);
    if (attuale > -Infinity && attuale + 2 >= punteggio) return pm.obiettivo;
  }
  return migliore;
}

function verso(p: Partita, meta: Casella, uscite: Direzione[], distFantasma: (i: number) => number): Direzione {
  const { lab, pacman: pm, rng } = p;
  const dm = lab.distanze([meta]);
  let scelta = uscite[0];
  let migliore = Infinity;
  for (const d of uscite) {
    const v = lab.vicina(pm.t, d);
    const i = lab.indice(v.x, v.y);
    const rischio = distFantasma(i) <= 1 ? 1000 : 0;
    const costo = dm[i] + rischio + (d === pm.dir ? -0.1 : 0) + rng() * 0.01;
    if (costo < migliore) { migliore = costo; scelta = d; }
  }
  return scelta;
}

/** Sceglie l'uscita che porta alla zona più ampia raggiungibile prima dei fantasmi. */
function fuga(p: Partita, uscite: Direzione[], distFantasma: (i: number) => number): Direzione {
  const { lab, pacman: pm, rng } = p;
  const qui = lab.indice(pm.t.x, pm.t.y);
  let scelta = uscite[0];
  let migliore = -Infinity;
  for (const d of uscite) {
    const v = lab.vicina(pm.t, d);
    const inizio = lab.indice(v.x, v.y);
    let punteggio: number;
    if (distFantasma(inizio) <= 1) {
      punteggio = -1000 + distFantasma(inizio);
    } else {
      const passi = new Map<number, number>([[inizio, 1]]);
      const coda = [inizio];
      let pillola = false;
      for (let testa = 0; testa < coda.length; testa++) {
        const i = coda[testa];
        if (lab.superpillole.includes(i) && p.rimasti.has(i)) pillola = true;
        const c = lab.casella(i);
        for (const u of lab.uscite(c)) {
          const w = lab.vicina(c, u);
          const j = lab.indice(w.x, w.y);
          if (j === qui || passi.has(j)) continue;
          const s = passi.get(i)! + 1;
          if (s >= distFantasma(j)) continue;
          passi.set(j, s);
          coda.push(j);
        }
      }
      punteggio = coda.length + (pillola ? 40 : 0);
    }
    punteggio += rng() * 0.5;
    if (punteggio > migliore) { migliore = punteggio; scelta = d; }
  }
  return scelta;
}
