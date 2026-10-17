# Giochi

Laboratorio di giochi web progettati insieme e programmati da Claude.
Ogni gioco vive in una propria sottocartella; il codice riusabile tra giochi sta in `condivisi/`.

## Struttura

```
Giochi/
├── README.md              ← questo file
├── docs/
│   └── ECOSISTEMA.md      ← strumenti scelti e perché
├── condivisi/             ← codice comune (menu, audio, comandi touch, rete…)
└── giochi/
    └── caccia-a-pacman/   ← Pac-Man rovesciato: i giocatori sono i fantasmi
        └── PROGETTO.md    ← documento di progetto (in discussione)
```

## Metodo di lavoro

1. **Idea** – chi propone descrive il gioco a parole.
2. **Progetto** – Claude scrive `PROGETTO.md` nella cartella del gioco; si discute e si corregge.
3. **Prototipo** – Claude costruisce la versione minima giocabile e la collauda con un browser automatico.
4. **Prova** – si gioca e si dice cosa non convince.
5. **Iterazione** – un elemento alla volta, fino alla versione desiderata.

## Giochi

| Gioco | Stato | Cartella |
|---|---|---|
| Caccia a Pac-Man | Progettazione | [`giochi/caccia-a-pacman`](giochi/caccia-a-pacman/PROGETTO.md) |
