import { describe, expect, it } from 'vitest';
import { Partita } from '../src/logica/partita';
import { DESTRA, SINISTRA } from '@condivisi/comandi/direzionale';

const passo = 1 / 60;
const avanza = (p: Partita, secondi: number, dir: number = -1, azione = false) => {
  for (let t = 0; t < secondi; t += passo) p.aggiorna(passo, dir as never, azione);
};

describe('partita', () => {
  it('inizia con "pronti", poi parte', () => {
    const p = new Partita({ difficolta: 'normale', umano: 0, seme: 1 });
    expect(p.fase).toBe('pronti');
    avanza(p, 2.1);
    expect(p.fase).toBe('gioco');
  });

  it('il fantasma del giocatore segue i comandi', () => {
    const p = new Partita({ difficolta: 'normale', umano: 0, seme: 1 });
    avanza(p, 2.1);
    const blinky = p.fantasmi[0];
    expect(blinky.stato).toBe('caccia');
    avanza(p, 0.5, SINISTRA);
    expect(p.posizione(blinky).x).toBeLessThan(9);
    avanza(p, 0.2, DESTRA);
    expect(blinky.dir).toBe(DESTRA);
  });

  it('Pac-Man mangia i puntini', () => {
    const p = new Partita({ difficolta: 'normale', umano: 0, seme: 2 });
    const prima = p.rimasti.size;
    avanza(p, 4);
    expect(p.rimasti.size).toBeLessThan(prima);
  });

  it('i fantasmi del computer escono dalla casa', () => {
    // Una cattura riporta tutti in casa: si verifica che ognuno esca almeno una volta.
    const p = new Partita({ difficolta: 'normale', umano: 0, seme: 3 });
    const usciti = new Set<number>();
    for (let t = 0; t < 20; t += passo) {
      p.aggiorna(passo);
      p.fantasmi.forEach((f) => { if (f.stato === 'caccia') usciti.add(f.id); });
    }
    expect(usciti.size).toBe(4);
  });

  it('il potere ha una ricarica', () => {
    const p = new Partita({ difficolta: 'normale', umano: 3, seme: 4 });
    avanza(p, 2.1);
    p.aggiorna(passo, -1, true);
    expect(p.fantasmi[3].ricarica).toBeGreaterThan(17);
    expect(p.pacVisibile).toBe(true);
  });

  it('ogni superpillola indebolisce i poteri, ogni cattura li ricarica', () => {
    const p = new Partita({ difficolta: 'normale', umano: 0, seme: 5 });
    let minimo = p.energia;
    for (let t = 0; t < 200 && p.fase !== 'fine'; t += passo) {
      p.aggiorna(passo);
      for (const e of p.eventi) {
        if (e.tipo === 'superpillola' && e.energiaPersa) expect(p.energia).toBeLessThan(4);
        if (e.tipo === 'cattura' && e.energiaRecuperata) expect(p.energia).toBeGreaterThan(minimo);
      }
      minimo = Math.min(minimo, p.energia);
    }
    expect(p.energia).toBeGreaterThanOrEqual(0);
    expect(p.energia).toBeLessThanOrEqual(4);
  });

  it.each(['facile', 'normale', 'difficile'] as const)('una partita intera (%s) arriva sempre a una conclusione', (difficolta) => {
    for (let seme = 0; seme < 5; seme++) {
      const p = new Partita({ difficolta, umano: seme % 4, autopilota: true, seme });
      avanza(p, 200);
      expect(p.fase).toBe('fine');
      expect(p.esito).not.toBeNull();
    }
  });
});
