import { describe, expect, it } from 'vitest';
import { IRRAGGIUNGIBILE, Labirinto, MAPPA } from '../src/logica/labirinto';

describe('labirinto', () => {
  const lab = new Labirinto();

  it('è simmetrico rispetto all\'asse verticale', () => {
    for (const riga of MAPPA) expect(riga).toBe([...riga].reverse().join(''));
  });

  it('ogni corridoio è raggiungibile dalla partenza di Pac-Man', () => {
    const dist = lab.distanze([lab.partenzaPacman]);
    for (const i of lab.percorribili) expect(dist[i], `casella ${JSON.stringify(lab.casella(i))}`).toBeLessThan(IRRAGGIUNGIBILE);
  });

  it('non ha vicoli ciechi (Pac-Man non deve finire in trappola per colpa della mappa)', () => {
    for (const i of lab.percorribili) expect(lab.uscite(lab.casella(i)).length).toBeGreaterThanOrEqual(2);
  });

  it('il tunnel collega i due lati', () => {
    expect(lab.libera(-1, 9)).toBe(true);
    expect(lab.vicina({ x: 0, y: 9 }, 1)).toEqual({ x: 18, y: 9 });
  });

  it('ha 4 superpillole e la casa con porta', () => {
    expect(lab.superpillole).toHaveLength(4);
    expect(lab.postiCasa).toHaveLength(3);
    expect(lab.uscitaCasa).toEqual({ x: 9, y: 7 });
  });
});
