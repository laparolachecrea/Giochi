export interface DefinizioneFantasma {
  nome: string;
  colore: number;
  potere: string;
  descrizione: string;
  /** Secondi tra un uso e il successivo. */
  ricarica: number;
  /** Secondi di effetto. */
  durata: number;
}

export interface Potere {
  nome: string;
  descrizione: string;
  ricarica: number;
  durata: number;
}

/**
 * Senza nebbia Pac-Man è sempre visibile: Fiuto e Radar (che servono a trovarlo) non
 * avrebbero senso, quindi Pinky e Clyde ricevono poteri adatti a quella modalità.
 */
const POTERI_SENZA_NEBBIA: Record<number, Potere> = {
  1: { nome: 'Richiamo', descrizione: 'I compagni puntano dritti su Pac-Man per 3 secondi', ricarica: 14, durata: 3 },
  3: { nome: 'Onda', descrizione: 'Pac-Man rallenta per 2 secondi', ricarica: 16, durata: 2 },
};

export function potereDi(id: number, nebbia: boolean): Potere {
  const def = FANTASMI[id];
  if (!nebbia && POTERI_SENZA_NEBBIA[id]) return POTERI_SENZA_NEBBIA[id];
  return { nome: def.potere, descrizione: def.descrizione, ricarica: def.ricarica, durata: def.durata };
}

export const FANTASMI: DefinizioneFantasma[] = [
  { nome: 'Blinky', colore: 0xff3b5c, potere: 'Scatto', descrizione: 'Corri più veloce per 1,5 secondi', ricarica: 12, durata: 1.5 },
  { nome: 'Pinky', colore: 0xff8ae2, potere: 'Fiuto', descrizione: 'Una freccia ti indica Pac-Man per 3 secondi', ricarica: 14, durata: 3 },
  { nome: 'Inky', colore: 0x3ff0ff, potere: 'Muro', descrizione: 'Chiudi il corridoio alle tue spalle per 3 secondi', ricarica: 14, durata: 3 },
  { nome: 'Clyde', colore: 0xffa63b, potere: 'Radar', descrizione: 'Mostra Pac-Man a tutta la squadra per 1 secondo', ricarica: 18, durata: 1 },
];

export type TipoFrutto = 'ciliegia' | 'fragola' | 'arancia';

export const FRUTTI: Record<TipoFrutto, { nome: string; colore: number; malus: string }> = {
  ciliegia: { nome: 'Ciliegia', colore: 0xff3b5c, malus: 'FANTASMI RALLENTATI' },
  fragola: { nome: 'Fragola', colore: 0xff5f8f, malus: 'POTERI SCARICATI' },
  arancia: { nome: 'Arancia', colore: 0xffa63b, malus: 'PAC-MAN ACCELERA' },
};

export type LivelloDifficolta = 'facile' | 'normale' | 'difficile';

export interface Difficolta {
  etichetta: string;
  velocitaPacman: number;
  /** Fino a quanti passi Pac-Man "vede" i fantasmi. */
  visione: number;
  /** Probabilità di una scelta sbagliata a ogni incrocio. */
  errore: number;
  /** Distanza (in passi) sotto la quale Pac-Man smette di mangiare e scappa. */
  pericolo: number;
}

export const DIFFICOLTA: Record<LivelloDifficolta, Difficolta> = {
  facile: { etichetta: 'Facile', velocitaPacman: 3.8, visione: 7, errore: 0.12, pericolo: 4 },
  normale: { etichetta: 'Normale', velocitaPacman: 4.03, visione: 12, errore: 0.05, pericolo: 5 },
  difficile: { etichetta: 'Difficile', velocitaPacman: 4.1, visione: 99, errore: 0, pericolo: 6 },
};

export const REGOLE = {
  durataPartita: 180,
  vitePacman: 3,
  /** Caselle al secondo. Ritmo rallentato dopo la prima prova (era 5,0). */
  velocitaFantasma: 3.8,
  fattoreSpavento: 0.6,
  fattoreTunnel: 0.5,
  fattoreScatto: 1.35,
  /** I compagni controllati dal computer sono più lenti: le catture decisive spettano al giocatore. */
  fattoreCompagni: 0.9,
  /** I compagni ricaricano i poteri più lentamente del giocatore. */
  ricaricaCompagni: 1.5,
  /** Energia dei poteri: ogni superpillola ne toglie un livello, ogni cattura ne restituisce uno. */
  energiaMassima: 4,
  /** Per ogni livello perso: ricarica più lenta del 15%, effetto più breve del 10%. */
  penalitaRicarica: 0.15,
  penalitaDurata: 0.1,
  durataSpavento: 6,
  attesaRinascita: 4,
  /** Secondi dopo l'inizio del round in cui escono i fantasmi controllati dal computer. */
  usciteBot: [1, 3, 5],
  /** Raggio (in caselle) in cui un fantasma vede tutto, anche oltre i muri. */
  raggioVicino: 3.2,
  /** Quante caselle un fantasma vede lungo un corridoio dritto. */
  raggioCorridoio: 12,
  /** Secondi in cui resta segnata l'ultima posizione nota di Pac-Man. */
  memoriaPosizione: 12,
  /** Effetto dell'Onda di Clyde sulla velocità di Pac-Man. */
  fattoreOnda: 0.7,
  /** Senza nebbia la squadra vede sempre Pac-Man: lui compensa con un po' di velocità. */
  bonusSenzaNebbia: 1.06,
  /** Frutta: compare a intervalli in un punto lontano da Pac-Man e resta per poco. */
  primoFrutto: 20,
  intervalloFrutto: 25,
  durataFrutto: 12,
  /** Malus quando Pac-Man mangia un frutto. */
  rallentaCiliegia: 0.8,
  durataCiliegia: 4,
  scaricaFragola: 5,
  turboArancia: 1.15,
  durataArancia: 4,
  /** Secondi in cui Pac-Man resta visibile dopo aver mangiato una superpillola. */
  rivelaSuperpillola: 1.5,
  distanzaCattura: 0.75,
  durataPronti: 2,
  durataPresa: 1.6,
};
