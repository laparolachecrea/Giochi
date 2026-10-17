import { Sequencer, Sintetizzatore, type Traccia } from '@condivisi/audio/sintetizzatore';

export const synth = new Sintetizzatore();

/**
 * Musica originale in La minore (La–Fa–Sol–Mi): basso pulsante, arpeggio e charleston.
 * Il Mi maggiore finale (con il Sol diesis) crea la tensione che riporta all'inizio.
 */
const ACCORDI = [
  { basso: 45, arpeggio: [69, 72, 76, 72] },
  { basso: 41, arpeggio: [65, 69, 72, 69] },
  { basso: 43, arpeggio: [67, 71, 74, 71] },
  { basso: 40, arpeggio: [64, 68, 71, 68] },
];

function costruisciTracce(): Traccia[] {
  const basso: Array<number | null> = [];
  const arpeggio: Array<number | null> = [];
  const melodia: Array<number | null> = [];
  const ritmo: Array<number | null> = [];
  const temi = [
    [81, null, null, 79, 76, null, 74, null, 76, null, null, null, null, null, null, null],
    [77, null, null, 76, 72, null, 69, null, 72, null, 74, null, null, null, null, null],
    [79, null, null, 77, 74, null, 71, null, 74, null, 79, null, 77, null, 74, null],
    [76, null, 74, null, 71, null, 68, null, 71, null, null, null, 64, null, null, null],
  ];
  ACCORDI.forEach(({ basso: b, arpeggio: a }, battuta) => {
    for (let i = 0; i < 16; i++) {
      basso.push(i % 2 === 0 ? (i % 4 === 0 ? b : b + 12) : null);
      arpeggio.push(a[i % 4]);
      ritmo.push(i % 4 === 2 ? -1 : null);
    }
    melodia.push(...temi[battuta]);
  });
  return [
    { onda: 'triangle', volume: 0.32, durataPasso: 1.8, passi: basso },
    { onda: 'square', volume: 0.035, durataPasso: 0.9, passi: arpeggio },
    { onda: 'square', volume: 0.07, durataPasso: 1.9, passi: melodia },
    { onda: 'square', volume: 0.05, durataPasso: 1, passi: ritmo },
  ];
}

export const musica = new Sequencer(synth, costruisciTracce(), 124, 0.55);

export const suoni = {
  clic: () => synth.nota({ onda: 'square', da: 880, a: 1320, durata: 0.06, volume: 0.08 }),
  /** Pac-Man che mangia: più forte quanto più è vicino a te. È un indizio, non solo un effetto. */
  waka: (vicinanza: number) => {
    if (vicinanza <= 0.02) return;
    synth.nota({ onda: 'triangle', da: 520, a: 260, durata: 0.09, volume: 0.22 * vicinanza });
  },
  superpillola: () => {
    for (let i = 0; i < 3; i++) synth.nota({ onda: 'sawtooth', da: 220, a: 880, durata: 0.18, volume: 0.09, ritardo: i * 0.2 });
  },
  cattura: () => {
    [72, 76, 79, 84].forEach((n, i) => synth.nota({ onda: 'square', da: 440 * 2 ** ((n - 69) / 12), durata: 0.12, volume: 0.13, ritardo: i * 0.08 }));
    synth.rumore(0.4, 0.15, 3000);
  },
  mangiato: () => synth.nota({ onda: 'square', da: 900, a: 90, durata: 0.5, volume: 0.13 }),
  potere: (id: number) => {
    switch (id) {
      case 0: synth.rumore(0.3, 0.12, 5000); synth.nota({ onda: 'sawtooth', da: 200, a: 1200, durata: 0.25, volume: 0.07 }); break;
      case 1: [0, 0.12].forEach((r) => synth.nota({ onda: 'sine', da: 1400, a: 1700, durata: 0.07, volume: 0.12, ritardo: r })); break;
      case 2: synth.nota({ onda: 'square', da: 130, a: 70, durata: 0.3, volume: 0.15 }); synth.rumore(0.2, 0.15, 900); break;
      case 3: [0, 0.18, 0.36].forEach((r, i) => synth.nota({ onda: 'sine', da: 1250, durata: 0.25, volume: 0.13 / (i + 1), ritardo: r })); break;
    }
  },
  negato: () => synth.nota({ onda: 'square', da: 110, durata: 0.15, volume: 0.1 }),
  via: () => [64, 69, 76].forEach((n, i) => synth.nota({ onda: 'square', da: 440 * 2 ** ((n - 69) / 12), durata: 0.14, volume: 0.1, ritardo: i * 0.15 })),
  vittoria: () => [69, 72, 76, 81, 76, 81].forEach((n, i) => synth.nota({ onda: 'square', da: 440 * 2 ** ((n - 69) / 12), durata: 0.2, volume: 0.12, ritardo: i * 0.13 })),
  sconfitta: () => [69, 68, 67, 66].forEach((n, i) => synth.nota({ onda: 'triangle', da: 440 * 2 ** ((n - 69) / 12), durata: 0.3, volume: 0.2, ritardo: i * 0.25 })),
};
