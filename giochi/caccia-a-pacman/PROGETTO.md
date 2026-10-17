# Caccia a Pac-Man — documento di progetto

> Stato: **versione 0.1 in sviluppo** (giocatore singolo). Titolo provvisorio.

## 1. Idea in una frase

Pac-Man rovesciato: **i giocatori sono i fantasmi** e collaborano per catturare un Pac-Man
controllato dal computer, prima che lui mangi tutti i puntini.

## 2. Perché l'idea funziona (e dove può rompersi)

Il Pac-Man originale è un gioco di **fuga**: la tensione nasce dal sentirsi braccati.
Rovesciarlo lo trasforma in un gioco di **accerchiamento**, che è per natura cooperativo:
un fantasma da solo non chiude mai Pac-Man in un labirinto con più vie di fuga; due o tre
coordinati sì. La meccanica obbliga quindi a parlarsi e dividersi i corridoi.

Il rischio è lo **squilibrio**, e va in due direzioni opposte:

| Situazione | Problema | Conseguenza |
|---|---|---|
| 1 fantasma umano | Non può accerchiare | Frustrazione: impossibile vincere |
| 4 fantasmi umani coordinati | Il labirinto classico ha poche vie di fuga | Vittoria facile in pochi secondi: noia |

Il progetto deve quindi prevedere **leve di bilanciamento** che si regolano in base al
numero di giocatori (§5).

## 3. Regole di base

- **Partita**: 1 Pac-Man (computer) contro 4 fantasmi. I posti non occupati da umani sono
  presi da fantasmi-bot, così la partita è sempre completa.
- **Vincono i fantasmi** se catturano Pac-Man tante volte quante sono le sue vite
  (❓ proposta: 3 vite).
- **Vince Pac-Man** se mangia tutti i puntini oppure se scade il tempo
  (❓ proposta: 3 minuti).
- **Superpillola** (4 nel labirinto, come nell'originale): per alcuni secondi i ruoli si
  invertono, i fantasmi diventano blu e se toccati tornano alla base per qualche secondo.
  È il momento in cui i giocatori devono *scappare*: recupera la sensazione dell'originale.
- **Ingresso in corsa**: chi si collega a partita iniziata prende il posto di un bot.
  Chi si disconnette viene sostituito da un bot. La partita non si ferma mai.

## 4. Il cervello di Pac-Man

È il vero avversario, quindi la parte di progettazione più delicata. Proposta a priorità:

1. **Pericolo imminente** (un fantasma a pochi passi): fugge verso la direzione che
   massimizza la distanza dal fantasma più vicino, calcolata sul percorso nel labirinto
   e non in linea d'aria.
2. **Minaccia media e superpillola raggiungibile**: va a prenderla.
3. **Nessuna minaccia**: mangia i puntini più vicini, preferendo zone lontane dai fantasmi.

Tre livelli di difficoltà cambiano quanto lontano "vede" e quanto spesso sbaglia.
Un Pac-Man perfetto non è divertente: deve fare errori credibili.

## 5. Leve di bilanciamento

| Leva | Effetto | ❓ Da decidere |
|---|---|---|
| **Velocità** | Pac-Man leggermente più veloce dei fantasmi | Di quanto, in base ai giocatori umani |
| **Nebbia di guerra** | Ogni fantasma vede solo un raggio attorno a sé; Pac-Man compare solo quando un fantasma lo ha in vista | Sì / no |
| **Tunnel laterali** | I fantasmi rallentano nei tunnel, Pac-Man no | Come nell'originale |
| **Durata superpillola** | Più lunga se gli umani sono molti | Valori |

La **nebbia di guerra** è la leva che propongo di più: rende giocabile anche la partita
in solitario (Pac-Man non è sempre visibile, quindi il bot non può prevederlo facilmente)
e premia la comunicazione ("è passato da me, va verso destra!").

## 6. Poteri dei fantasmi (proposta, ❓ fase 2)

Ogni fantasma richiama la "personalità" che aveva nell'originale e ha un potere con
tempo di ricarica:

| Fantasma | Personalità originale | Potere proposto |
|---|---|---|
| Blinky (rosso) | Insegue direttamente | **Scatto**: velocità doppia per 2 secondi |
| Pinky (rosa) | Punta davanti a Pac-Man | **Fiuto**: vede la direzione di Pac-Man per 3 secondi |
| Inky (azzurro) | Imprevedibile | **Muro**: chiude un corridoio per 4 secondi |
| Clyde (arancione) | Va e viene | **Radar**: rivela Pac-Man a tutta la squadra per un istante |

I poteri creano ruoli complementari: la squadra funziona meglio se li usa in sequenza.

## 7. Multigiocatore online

### Come si gioca

1. Un giocatore crea una stanza e riceve un **codice** (es. `KX7P`) e un link.
2. Gli altri aprono il link o inseriscono il codice e scelgono il loro fantasma.
3. Si può giocare anche nella stessa stanza fisica, ognuno dal proprio telefono.

### Architettura tecnica

Il browser di chi crea la stanza (**host**) calcola la partita: posizioni, Pac-Man,
catture. Gli altri inviano solo i propri comandi e ricevono lo stato aggiornato.
Questo modello evita che un giocatore possa barare modificando la propria copia.

| | Fase 1: peer-to-peer | Fase 2: server Cloudflare |
|---|---|---|
| Collegamento | Diretto tra browser (WebRTC) | Tutti verso un server |
| Account necessari | **Nessuno** | Uno, gratuito, creato dal titolare |
| Se l'host esce | La partita termina (o si passa l'host a un altro) | Nessun effetto |
| Reti restrittive (scuole, aziende, alcuni operatori mobili) | Il collegamento diretto può fallire | Funziona |

Il codice di rete sarà isolato in un modulo (`condivisi/rete/`), così il passaggio dalla
fase 1 alla fase 2 non tocca il gioco.

## 8. Comandi

- **PC**: frecce o WASD; tasto spazio per il potere.
- **Telefono**: scorrimento del dito (swipe) per la direzione, pulsante a schermo per il
  potere. ❓ In alternativa un joystick virtuale.
- Il fantasma ricorda l'ultima direzione richiesta e svolta appena il corridoio lo
  permette (come nell'originale): rende i comandi touch tolleranti.

## 9. Stile

Grafica vettoriale "neon" su fondo scuro, generata da codice: nitida su ogni schermo,
nessun file grafico da gestire, coerente con l'estetica arcade. Effetti sonori generati
da codice. ❓ Musica sì/no.

## 10. Piano di rilascio

| Versione | Contenuto | Come si prova |
|---|---|---|
| **0.1** | Un labirinto, Pac-Man con cervello base, 1 fantasma umano + 3 bot, vittoria e sconfitta | Da solo, su PC e telefono |
| **0.2** | Stanze online con codice, ingresso in corsa | Con amici, ognuno dal suo dispositivo |
| **0.3** | Nebbia di guerra, bilanciamento in base ai giocatori, livelli di difficoltà | Partite ripetute |
| **0.4** | Poteri dei fantasmi, installazione come app (PWA) | — |

## 11. Decisioni prese (17 ottobre 2026)

| Tema | Decisione |
|---|---|
| Vite e durata | 3 vite, 3 minuti |
| Nebbia di guerra | Sì, già dalla 0.1 |
| Poteri dei fantasmi | Sì, quelli proposti, già dalla 0.1 |
| Comandi su telefono | Scorrimento del dito |
| Musica | Sì (originale, generata da codice) |
| Priorità | Prima la giocabilità per un giocatore; multigiocatore dopo |
| Dispositivi | Web app per telefono e PC; si punta a dispositivi recenti, senza rinunce grafiche |

## 12. Bilanciamento: cosa dicono i dati

Lo strumento `npm run bilanciamento` simula centinaia di partite con quattro fantasmi
controllati dal computer. Prima versione (Pac-Man veloce quanto i fantasmi):

| Difficoltà | Fantasmi vincono | Durata media |
|---|---|---|
| Facile | 100% | 32 s |
| Normale | 99% | 40 s |
| Difficile | 98% | 57 s |

Il rischio previsto al §2 si è verificato: quattro fantasmi coordinati vincono sempre.
La diagnosi ha mostrato due cause:

1. **Lo Scatto era sbilanciato**: 88 catture su 179 avvenivano con lo Scatto di Blinky
   attivo (velocità ×1,8 per 2 secondi = circa 8 caselle di vantaggio). Ridotto a ×1,4.
2. **Pac-Man deve essere più veloce dei fantasmi** (come nell'originale). Così non lo si
   prende inseguendolo, ma solo accerchiandolo: la meccanica premia la collaborazione.

Valori attuali (velocità di Pac-Man rispetto ai fantasmi: +12%, +18%, +24%):

| Difficoltà | Fantasmi vincono | Durata media | Puntini rimasti |
|---|---|---|---|
| Facile | 96% | 62 s | 24 |
| Normale | 63% | 82 s | 8 |
| Difficile | 40% | 89 s | 4 |

Da osservare nelle prove con persone vere: il limite di 3 minuti oggi non scatta quasi mai,
perché le partite finiscono prima (cattura o puntini finiti).

## 13. Scelte di progetto emerse durante lo sviluppo

- **Indizi sonori**: il "waka" di Pac-Man è tanto più forte quanto più è vicino al tuo
  fantasma. Nella nebbia l'udito diventa uno strumento di caccia.
- **Memoria della squadra**: i puntini fuori vista restano come la squadra li ricorda.
  Tornando in una zona si scopre dove Pac-Man è passato (le sue tracce).
- **Ultima posizione nota**: un cerchio tratteggiato con "?" indica dove Pac-Man è stato
  visto l'ultima volta, e sbiadisce in 8 secondi.
