# Caccia a Pac-Man

Pac-Man rovesciato: sei un fantasma e, con la tua squadra, devi catturare Pac-Man prima che
mangi tutti i puntini. Progetto completo in [PROGETTO.md](PROGETTO.md).

## Come si gioca

| | PC | Telefono |
|---|---|---|
| Muoversi | Frecce o WASD | Scorri il dito in qualsiasi punto |
| Potere | Spazio | Tocca il cerchio in basso a sinistra |
| Pausa | Esc o P | Pulsante II |

## Sviluppo

Dalla cartella principale del repository: `npm install`. Poi, da questa cartella:

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia il gioco in locale con aggiornamento automatico |
| `npm test` | Esegue i collaudi della logica |
| `npm run bilanciamento` | Simula 200 partite per difficoltà e riporta chi vince |
| `npm run build` | Produce la versione da pubblicare in `dist/` |
| `npm run build:singolo` | Produce un unico file HTML autosufficiente |

## Struttura

```
src/
├── logica/      regole, labirinto, cervelli di Pac-Man e fantasmi (nessuna grafica)
├── grafica/     stile, disegno al neon, elementi d'interfaccia
├── scene/       Menu e Gioco (Phaser)
└── suoni.ts     effetti e musica generati da codice
test/            collaudi automatici
strumenti/       simulazione per il bilanciamento
```
