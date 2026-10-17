# Ecosistema di sviluppo

Criterio guida: **tutto deve essere testo e codice**, così che Claude possa scrivere, collaudare e
pubblicare ogni parte senza interventi manuali. Tutti gli strumenti sono gratuiti.

| Livello | Strumento | Ruolo |
|---|---|---|
| Motore 2D | Phaser | Disegno, animazioni, input, collisioni, mappe a tasselli, audio |
| Fisica | Matter.js (integrato in Phaser) | Corpi rigidi e gravità (giochi tipo Angry Birds) |
| 3D (se servirà) | Three.js / Babylon.js | Giochi tridimensionali |
| Linguaggio | TypeScript | Errori intercettati prima dell'esecuzione |
| Build | Vite | Compilazione e anteprima rapida |
| Collaudo | Playwright + Chromium | Screenshot e input simulati per verificare il gioco |
| Mappe | Formato JSON di Tiled | Livelli generati come testo, modificabili con l'editor Tiled |
| Grafica | SVG / disegno procedurale, asset CC0 | Nessun diritto da gestire |
| Suoni | jsfxr, Tone.js | Effetti e musica generati da codice |
| Versioni | Git + GitHub | Ogni modifica tracciata e reversibile |
| Multigiocatore | WebRTC peer-to-peer (fase 1), server su Cloudflare (fase 2, opzionale) | Vedi `giochi/caccia-a-pacman/PROGETTO.md` §6 |
| App | PWA (Progressive Web App) | Installabile dal browser su telefono e PC, senza store |

## Account e costi

| Servizio | Serve? | Costo | Chi lo crea |
|---|---|---|---|
| GitHub | Sì (già presente) | Gratuito | — |
| GitHub Pages (pubblicazione) | Sì | Gratuito **solo se il repository è pubblico**; per un repository privato serve un piano a pagamento | Si attiva dalle impostazioni del repository |
| Cloudflare (server di gioco) | Solo in fase 2 | Piano gratuito | Il titolare (registrazione con email e accettazione dei termini) |
| Google Play / App Store | No | A pagamento | — (sostituiti dalla PWA) |

Claude non può registrare account: le iscrizioni richiedono verifica email, CAPTCHA e
l'accettazione di termini di servizio, che è un atto giuridico del titolare.
