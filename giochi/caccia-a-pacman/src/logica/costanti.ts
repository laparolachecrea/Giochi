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

export const FANTASMI: DefinizioneFantasma[] = [
  { nome: 'Blinky', colore: 0xff3b5c, potere: 'Scatto', descrizione: 'Corri più veloce per 1,5 secondi', ricarica: 12, durata: 1.5 },
  { nome: 'Pinky', colore: 0xff8ae2, potere: 'Fiuto', descrizione: 'Una freccia ti indica Pac-Man per 3 secondi', ricarica: 14, durata: 3 },
  { nome: 'Inky', colore: 0x3ff0ff, potere: 'Muro', descrizione: 'Chiudi il corridoio alle tue spalle per 3 secondi', ricarica: 14, durata: 3 },
  { nome: 'Clyde', colore: 0xffa63b, potere: 'Radar', descrizione: 'Mostra Pac-Man a tutta la squadra per 1 secondo', ricarica: 18, durata: 1 },
];

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
  facile: { etichetta: 'Facile', velocitaPacman: 5.0, visione: 7, errore: 0.12, pericolo: 4 },
  normale: { etichetta: 'Normale', velocitaPacman: 5.3, visione: 12, errore: 0.05, pericolo: 5 },
  difficile: { etichetta: 'Difficile', velocitaPacman: 5.4, visione: 99, errore: 0, pericolo: 6 },
};

export const REGOLE = {
  durataPartita: 180,
  vitePacman: 3,
  velocitaFantasma: 5.0,
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
  raggioVicino: 2.3,
  /** Quante caselle un fantasma vede lungo un corridoio dritto. */
  raggioCorridoio: 8,
  /** Secondi in cui Pac-Man resta visibile dopo aver mangiato una superpillola. */
  rivelaSuperpillola: 1.5,
  distanzaCattura: 0.75,
  durataPronti: 2,
  durataPresa: 1.6,
};
