/**
 * Simula molte partite con quattro fantasmi controllati dal computer e riporta chi vince.
 * Serve a regolare i parametri con dati, invece che a sensazione.
 * Uso: npm run bilanciamento -- [partite]
 */
import { Partita } from '../src/logica/partita';
import type { LivelloDifficolta } from '../src/logica/costanti';

const partite = Number(process.argv[2] ?? 200);
const passo = 1 / 30;

for (const difficolta of ['facile', 'normale', 'difficile'] as LivelloDifficolta[]) {
  const conta = { catture: 0, puntini: 0, tempo: 0 };
  let durata = 0, rimasti = 0, mangiati = 0;
  for (let seme = 0; seme < partite; seme++) {
    const p = new Partita({ difficolta, umano: null, seme });
    let t = 0;
    while (p.fase !== 'fine' && t < 400) { p.aggiorna(passo); t += passo; }
    conta[p.esito!.motivo]++;
    durata += t;
    rimasti += p.rimasti.size;
    mangiati += p.statistiche.fantasmiMangiati;
  }
  const pct = (n: number) => `${((n / partite) * 100).toFixed(0)}%`;
  console.log(
    `${difficolta.padEnd(9)} fantasmi vincono ${pct(conta.catture).padStart(4)} | Pac-Man: puntini ${pct(conta.puntini).padStart(4)}, tempo ${pct(conta.tempo).padStart(4)}` +
    ` | durata media ${(durata / partite).toFixed(0)}s, puntini rimasti ${(rimasti / partite).toFixed(0)}, fantasmi mangiati ${(mangiati / partite).toFixed(1)}`,
  );
}
