import Phaser from 'phaser';
import { ComandiDirezionali } from '@condivisi/comandi/direzionale';
import { Partita, type Evento, type Fantasma } from '../logica/partita';
import { FANTASMI, REGOLE } from '../logica/costanti';
import { creaTexturePuntini, creaTextureScintilla, disegnaFantasma, disegnaFreccia, disegnaLabirinto, disegnaPacman } from '../grafica/disegno';
import { cuoci, preparaScena, pulsante, testo, testoNeon } from '../grafica/interfaccia';
import { ALTEZZA, ALTEZZA_HUD, CASELLA, COLORI, LARGHEZZA, pixel } from '../grafica/stile';
import { musica, suoni, synth } from '../suoni';
import type { Scelte } from './Menu';

/** La barra dei comandi sta subito sotto il labirinto; lo spazio restante è la zona del pollice. */
const ALTO_BARRA = ALTEZZA_HUD + 21 * CASELLA;
const Y_BARRA = ALTO_BARRA + 44;
/** Le scritte dell'HUD stanno appoggiate sul bordo inferiore della fascia superiore. */
const Y_HUD = ALTEZZA_HUD - 60;

export class Gioco extends Phaser.Scene {
  private partita!: Partita;
  private scelte!: Scelte;
  private comandi!: ComandiDirezionali;
  private azione = false;
  private inPausa = false;
  private t = 0;

  private gPuntini!: Phaser.GameObjects.Graphics;
  private puntini = new Map<number, Phaser.GameObjects.Image>();
  private gPacman!: Phaser.GameObjects.Graphics;
  private gNebbia!: Phaser.GameObjects.Graphics;
  private gFantasmi!: Phaser.GameObjects.Graphics;
  private gEffetti!: Phaser.GameObjects.Graphics;
  private gHud!: Phaser.GameObjects.Graphics;
  private nebbia!: Float32Array;
  private scoppi!: Phaser.GameObjects.Particles.ParticleEmitter;
  private coloreScoppio = 0xffffff;
  private anelli: Array<{ x: number; y: number; nato: number; colore: number; raggio: number }> = [];
  private scia: Array<{ x: number; y: number; nato: number }> = [];

  private testoTempo!: Phaser.GameObjects.Text;
  private testoPuntini!: Phaser.GameObjects.Text;
  private testoPotere!: Phaser.GameObjects.Text;
  private testoStato!: Phaser.GameObjects.Text;
  private testoTu!: Phaser.GameObjects.Text;
  private testoDubbio!: Phaser.GameObjects.Text;
  private messaggio!: Phaser.GameObjects.Text;
  private sovrapposto: Phaser.GameObjects.Container | null = null;

  constructor() { super('Gioco'); }

  init(scelte: Scelte): void {
    this.scelte = scelte;
    this.azione = false;
    this.inPausa = false;
    this.anelli = [];
    this.scia = [];
    this.sovrapposto = null;
  }

  create(): void {
    this.partita = new Partita({ difficolta: this.scelte.difficolta, umano: this.scelte.fantasma });
    preparaScena(this);
    creaTextureScintilla(this);
    this.cameras.main.fadeIn(300, 4, 5, 13);

    const { lab } = this.partita;
    cuoci(this, (g) => disegnaLabirinto(g, lab)).setDepth(0);
    creaTexturePuntini(this);
    this.puntini.clear();
    for (const i of [...lab.puntini, ...lab.superpillole]) {
      const c = pixel(i % lab.larghezza, Math.floor(i / lab.larghezza));
      const pillola = lab.superpillole.includes(i);
      this.puntini.set(i, this.add.image(c.x, c.y, pillola ? 'pillola' : 'puntino').setScale(0.5).setDepth(1));
    }
    this.gPuntini = this.add.graphics().setDepth(1);
    this.gPacman = this.add.graphics().setDepth(2);
    this.gNebbia = this.add.graphics().setDepth(3);
    this.gEffetti = this.add.graphics().setDepth(4);
    this.gFantasmi = this.add.graphics().setDepth(5);
    this.gHud = this.add.graphics().setDepth(10);
    this.nebbia = new Float32Array(this.partita.visibili.length).fill(0.8);

    this.scoppi = this.add.particles(0, 0, 'scintilla', {
      emitting: false,
      lifespan: { min: 300, max: 800 },
      speed: { min: 40, max: 260 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: { onEmit: () => this.coloreScoppio },
      blendMode: 'ADD',
    }).setDepth(6);

    this.creaHud();
    this.messaggio = testo(this, LARGHEZZA / 2, pixel(9, 11).y, '', 22, COLORI.accento).setDepth(20);
    this.messaggio.setShadow(0, 0, '#000', 8, true, true);
    this.mostraMessaggio('PRONTI!', COLORI.accento, REGOLE.durataPronti * 1000);

    this.comandi = new ComandiDirezionali(this.game.canvas, {
      onAzione: () => { this.azione = true; },
      onPausa: () => this.pausa(!this.inPausa),
    });
    const nascosto = () => { if (document.hidden) this.pausa(true); };
    document.addEventListener('visibilitychange', nascosto);
    this.events.once('shutdown', () => {
      this.comandi.distruggi();
      musica.ferma();
      document.removeEventListener('visibilitychange', nascosto);
    });

    musica.bpm = 124;
    musica.avvia();
  }

  update(_: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    const p = this.partita;
    if (!this.inPausa && p.fase !== 'fine') {
      p.aggiorna(dt, this.comandi.direzione, this.azione);
      this.azione = false;
      p.eventi.forEach((e) => this.gestisci(e));
      musica.bpm = p.tempo < 30 ? 144 : 124;
    }
    this.disegna(dt);
  }

  // ————————————————————————————— eventi —————————————————————————————

  private get io(): Fantasma {
    return this.partita.fantasmi[this.scelte.fantasma];
  }

  private gestisci(e: Evento): void {
    const p = this.partita;
    const pacPx = () => { const q = p.posizione(p.pacman); return pixel(q.x, q.y); };
    switch (e.tipo) {
      case 'puntino': {
        const mio = p.posizione(this.io);
        suoni.waka(Math.max(0, 1 - Math.hypot(mio.x - e.x, mio.y - e.y) / 9));
        if (p.pacVisibile) this.scoppio(pixel(e.x, e.y), COLORI.puntino, 4);
        break;
      }
      case 'superpillola':
        suoni.superpillola();
        this.scoppio(pixel(e.x, e.y), COLORI.pillola, 30);
        this.cameras.main.flash(250, 40, 60, 255);
        this.mostraMessaggio('SUPERPILLOLA!\n\nSCAPPA!', 0x6f8bff, 1600);
        break;
      case 'cattura': {
        suoni.cattura();
        const c = pacPx();
        this.scoppio(c, COLORI.pacman, 60);
        this.scoppio(c, FANTASMI[e.id].colore, 30);
        this.cameras.main.shake(300, 0.012);
        this.cameras.main.flash(200, 255, 230, 120);
        if (p.vite > 0) {
          const chi = e.id === this.scelte.fantasma ? 'L\'HAI PRESO!' : `PRESO DA ${FANTASMI[e.id].nome.toUpperCase()}!`;
          this.mostraMessaggio(`${chi}\n\nANCORA ${p.vite}`, FANTASMI[e.id].colore, 1800);
        }
        break;
      }
      case 'mangiato': {
        suoni.mangiato();
        this.scoppio(pacPx(), FANTASMI[e.id].colore, 25);
        if (e.id === this.scelte.fantasma) this.mostraMessaggio('TI HA MANGIATO!', COLORI.spaventatoFine, 1500);
        break;
      }
      case 'potere': {
        suoni.potere(e.id);
        const f = p.fantasmi[e.id];
        const c = pixel(p.posizione(f).x, p.posizione(f).y);
        if (e.id === 3) this.anelli.push({ ...c, nato: this.t, colore: FANTASMI[3].colore, raggio: 420 });
        else this.anelli.push({ ...c, nato: this.t, colore: FANTASMI[e.id].colore, raggio: 60 });
        if (e.id === this.scelte.fantasma) this.mostraMessaggio(FANTASMI[e.id].potere.toUpperCase() + '!', FANTASMI[e.id].colore, 700);
        break;
      }
      case 'potereNegato':
        suoni.negato();
        break;
      case 'via':
        suoni.via();
        this.mostraMessaggio('VIA!', 0x7dff9a, 600);
        break;
      case 'fine':
        this.fine();
        break;
    }
  }

  private scoppio(c: { x: number; y: number }, colore: number, quanti: number): void {
    this.coloreScoppio = colore;
    this.scoppi.explode(quanti, c.x, c.y);
  }

  private mostraMessaggio(contenuto: string, colore: number, durataMs: number): void {
    const m = this.messaggio;
    this.tweens.killTweensOf(m);
    m.setText(contenuto).setColor(`#${colore.toString(16).padStart(6, '0')}`).setAlpha(1).setScale(0.6);
    m.setShadow(0, 0, `#${colore.toString(16).padStart(6, '0')}`, 12, true, true);
    this.tweens.add({ targets: m, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: m, alpha: 0, delay: durataMs, duration: 300 });
  }

  // ————————————————————————————— disegno —————————————————————————————

  private disegna(dt: number): void {
    const p = this.partita;
    const { lab } = p;
    const t = this.t;

    // Puntini secondo ciò che la squadra sa: dove nessuno guarda, restano "come li ricordi".
    const pulsazione = 0.5 * (1 + Math.sin(t * 6) * 0.2);
    for (const [i, img] of this.puntini) {
      const v = p.conosciuti[i];
      img.setVisible(v > 0);
      if (v === 2) img.setScale(pulsazione);
    }
    const gp = this.gPuntini;
    gp.clear();
    for (const [i, resto] of lab.muriTemporanei) {
      const c = pixel(i % lab.larghezza, Math.floor(i / lab.larghezza));
      const alfa = resto < 1 ? 0.5 + 0.5 * Math.sin(t * 30) : 1;
      gp.fillStyle(FANTASMI[2].colore, 0.25 * alfa);
      gp.fillRect(c.x - CASELLA / 2, c.y - CASELLA / 2, CASELLA, CASELLA);
      gp.lineStyle(2, FANTASMI[2].colore, alfa);
      for (let k = -2; k <= 2; k++) gp.lineBetween(c.x - 14, c.y + k * 6 + Math.sin(t * 20 + k) * 2, c.x + 14, c.y + k * 6 - Math.sin(t * 20 + k) * 2);
    }

    // Pac-Man: visibile solo se la squadra lo vede; altrimenti un segno dove è stato visto.
    const g = this.gPacman;
    g.clear();
    const mostraPac = p.pacVisibile || p.fase === 'presa' || p.fase === 'fine' || p.fase === 'pronti';
    if (mostraPac) {
      const q = p.posizione(p.pacman);
      const c = pixel(q.x, q.y);
      disegnaPacman(g, c.x, c.y, p.pacman.dir, p.fase === 'gioco' ? t : 0.1, 13);
      this.testoDubbio.setVisible(false);
    } else if (p.ultimaPosizione && p.ultimaPosizione.eta < 8) {
      const u = p.ultimaPosizione;
      const c = pixel(u.x, u.y);
      const alfa = 1 - u.eta / 8;
      g.lineStyle(2, COLORI.pacman, 0.6 * alfa);
      for (let k = 0; k < 10; k++) {
        const a0 = (k / 10) * Math.PI * 2 + t;
        g.beginPath();
        g.arc(c.x, c.y, 13, a0, a0 + 0.35);
        g.strokePath();
      }
      this.testoDubbio.setVisible(true).setPosition(c.x + 1, c.y + 1).setAlpha(alfa);
    } else {
      this.testoDubbio.setVisible(false);
    }

    // Nebbia: sfuma casella per casella verso il buio.
    const gn = this.gNebbia;
    gn.clear();
    const velocita = Math.min(1, dt * 7);
    for (let i = 0; i < this.nebbia.length; i++) {
      const meta = p.visibili[i] || p.fase === 'fine' ? 0 : 0.78;
      this.nebbia[i] += (meta - this.nebbia[i]) * velocita;
      if (this.nebbia[i] < 0.01) continue;
      const c = pixel(i % lab.larghezza, Math.floor(i / lab.larghezza));
      gn.fillStyle(COLORI.nebbia, this.nebbia[i]);
      gn.fillRect(c.x - CASELLA / 2 - 0.5, c.y - CASELLA / 2 - 0.5, CASELLA + 1, CASELLA + 1);
    }

    // Effetti: anelli dei poteri e scia dello Scatto.
    const ge = this.gEffetti;
    ge.clear();
    this.anelli = this.anelli.filter((a) => t - a.nato < 0.9);
    for (const a of this.anelli) {
      const k = (t - a.nato) / 0.9;
      ge.lineStyle(4 * (1 - k) + 1, a.colore, 1 - k);
      ge.strokeCircle(a.x, a.y, 10 + a.raggio * k);
    }
    const blinky = p.fantasmi[0];
    if (blinky.attivo > 0 && blinky.stato === 'caccia') {
      const q = p.posizione(blinky);
      this.scia.push({ ...pixel(q.x, q.y), nato: t });
    }
    this.scia = this.scia.filter((s) => t - s.nato < 0.3);
    for (const s of this.scia) {
      ge.fillStyle(FANTASMI[0].colore, 0.25 * (1 - (t - s.nato) / 0.3));
      ge.fillCircle(s.x, s.y, 12);
    }

    // Fantasmi (sempre visibili: sono la tua squadra).
    const gf = this.gFantasmi;
    gf.clear();
    for (const f of p.fantasmi) {
      const q = p.posizione(f);
      const c = pixel(q.x, q.y);
      const lampeggia = f.spaventato && p.spavento < 2 && Math.floor(t * 8) % 2 === 0;
      const alfa = f.stato === 'mangiato' ? 0.35 : f.stato === 'casa' ? 0.75 : 1;
      if (f.umano) {
        const r = 19 + Math.sin(t * 5) * 2;
        gf.lineStyle(5, 0xffffff, 0.12);
        gf.strokeCircle(c.x, c.y, r);
        gf.lineStyle(1.5, 0xffffff, 0.7);
        gf.strokeCircle(c.x, c.y, r);
        this.testoTu.setPosition(c.x, c.y - 28 + Math.sin(t * 5) * 2);
      }
      disegnaFantasma(gf, c.x, c.y, { colore: FANTASMI[f.id].colore, dir: f.dir, t: t + f.id, spaventato: f.spaventato, lampeggia, alfa });
      if (f.id === 1 && f.umano && f.attivo > 0) {
        const pq = p.posizione(p.pacman);
        const pc = pixel(pq.x, pq.y);
        disegnaFreccia(gf, c.x, c.y, Math.atan2(pc.y - c.y, pc.x - c.x), FANTASMI[1].colore, Math.min(1, f.attivo));
      }
      if (f.umano && f.stato === 'mangiato') {
        this.testoTu.setText(String(Math.ceil(f.timer)));
      } else if (f.umano) {
        this.testoTu.setText('TU');
      }
    }

    this.disegnaHud();
  }

  // ————————————————————————————— HUD e barra comandi —————————————————————————————

  private creaHud(): void {
    const prof = 11;
    testo(this, 70, Y_HUD + 18, 'TEMPO', 8, COLORI.testoTenue).setDepth(prof);
    this.testoTempo = testo(this, 70, Y_HUD + 40, '3:00', 16, COLORI.testo).setDepth(prof);
    testo(this, LARGHEZZA / 2, Y_HUD + 18, 'VITE DI PAC-MAN', 8, COLORI.testoTenue).setDepth(prof);
    testo(this, LARGHEZZA - 90, Y_HUD + 18, 'PUNTINI', 8, COLORI.testoTenue).setDepth(prof);
    this.testoPuntini = testo(this, LARGHEZZA - 90, Y_HUD + 46, '', 8, COLORI.testo).setDepth(prof);

    const def = FANTASMI[this.scelte.fantasma];
    this.testoPotere = testo(this, 112, Y_BARRA - 12, def.potere.toUpperCase(), 12, def.colore).setOrigin(0, 0.5).setDepth(prof);
    this.testoStato = testo(this, 112, Y_BARRA + 12, '', 8, COLORI.testoTenue).setOrigin(0, 0.5).setDepth(prof);
    const zona = this.add.zone(56, Y_BARRA, 84, 84).setInteractive({ useHandCursor: true }).setDepth(prof);
    zona.on('pointerdown', () => { this.azione = true; });

    pulsante(this, LARGHEZZA - 110, Y_BARRA, 52, 44, 'II', COLORI.testoTenue, () => this.pausa(!this.inPausa), 12).contenitore.setDepth(prof);
    const audio = pulsante(this, LARGHEZZA - 46, Y_BARRA, 52, 44, '♪', COLORI.testoTenue, () => {
      synth.muto = !synth.muto;
      audio.imposta(!synth.muto);
    }, 14);
    audio.contenitore.setDepth(prof);
    audio.imposta(!synth.muto);

    const spazio = ALTEZZA - (ALTO_BARRA + 88);
    if (this.sys.game.device.input.touch && spazio > 70) {
      const y = ALTO_BARRA + 88 + spazio / 2;
      const guida = testo(this, LARGHEZZA / 2, y, '← ↑ ↓ →\n\nscorri il dito ovunque', 9, COLORI.testoTenue).setDepth(prof).setAlpha(0.5);
      this.tweens.add({ targets: guida, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1 });
    }
    this.testoTu = testo(this, 0, 0, 'TU', 8, 0xffffff).setDepth(12);
    this.testoDubbio = testo(this, 0, 0, '?', 12, COLORI.pacman).setDepth(2).setVisible(false);
  }

  private disegnaHud(): void {
    const p = this.partita;
    const g = this.gHud;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, LARGHEZZA, ALTEZZA_HUD - 4);
    g.fillRect(0, ALTO_BARRA + 4, LARGHEZZA, 84);
    g.lineStyle(1, COLORI.muroLinea, 0.25);
    g.lineBetween(0, ALTEZZA_HUD - 4, LARGHEZZA, ALTEZZA_HUD - 4);
    g.lineBetween(0, ALTO_BARRA + 4, LARGHEZZA, ALTO_BARRA + 4);
    g.lineBetween(0, ALTO_BARRA + 88, LARGHEZZA, ALTO_BARRA + 88);

    const s = Math.ceil(p.tempo);
    this.testoTempo.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    this.testoTempo.setColor(p.tempo < 30 && Math.floor(this.t * 2) % 2 === 0 ? '#ff3b5c' : '#e8ecff');

    for (let i = 0; i < REGOLE.vitePacman; i++) {
      const viva = i < p.vite;
      disegnaPacman(g, LARGHEZZA / 2 - 30 + i * 30, Y_HUD + 40, 3, 0.12, 9, viva ? 1 : 0.15);
    }

    const totale = p.puntiniTotali;
    const rimasti = p.rimasti.size;
    const x0 = LARGHEZZA - 150, l = 120;
    g.fillStyle(0xffffff, 0.08);
    g.fillRoundedRect(x0, Y_HUD + 28, l, 8, 4);
    g.fillStyle(COLORI.puntino, 1);
    g.fillRoundedRect(x0, Y_HUD + 28, Math.max(8, (l * rimasti) / totale), 8, 4);
    this.testoPuntini.setText(`${rimasti} / ${totale}`);

    // Pulsante del potere con la ricarica disegnata come un settore che si svuota.
    const f = this.io;
    const def = FANTASMI[f.id];
    const pronto = f.ricarica <= 0 && f.stato === 'caccia' && !f.spaventato;
    const cx = 56, cy = Y_BARRA, r = 30;
    g.fillStyle(def.colore, pronto ? 0.25 + Math.sin(this.t * 6) * 0.08 : 0.08);
    g.fillCircle(cx, cy, r + 8);
    g.fillStyle(def.colore, pronto ? 0.9 : 0.25);
    g.fillCircle(cx, cy, r);
    if (f.ricarica > 0) {
      const k = f.ricarica / def.ricarica;
      g.fillStyle(0x000000, 0.55);
      g.slice(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false);
      g.fillPath();
    }
    disegnaFantasma(g, cx, cy + 2, { colore: pronto ? 0xffffff : def.colore, dir: 2, t: this.t, scala: 0.9, alfa: pronto ? 0.95 : 0.5 });
    const tocco = this.sys.game.device.input.touch;
    this.testoStato.setText(
      f.stato === 'mangiato' ? `TORNI TRA ${Math.ceil(f.timer)}s`
        : f.attivo > 0 ? 'ATTIVO!'
        : f.ricarica > 0 ? `PRONTO TRA ${Math.ceil(f.ricarica)}s`
        : tocco ? 'TOCCA IL CERCHIO' : 'PREMI SPAZIO',
    );
    this.testoPotere.setAlpha(pronto ? 1 : 0.6);
  }

  // ————————————————————————————— pausa e fine —————————————————————————————

  private pausa(attiva: boolean): void {
    const p = this.partita;
    if (p.fase === 'fine' || attiva === this.inPausa) return;
    this.inPausa = attiva;
    this.sovrapposto?.destroy();
    this.sovrapposto = null;
    if (!attiva) { musica.avvia(); return; }
    musica.ferma();
    const c = this.pannello(260);
    c.add(testoNeon(this, LARGHEZZA / 2, ALTEZZA / 2 - 70, 'PAUSA', 26, COLORI.accento));
    c.add(pulsante(this, LARGHEZZA / 2, ALTEZZA / 2 + 10, 240, 52, 'RIPRENDI', 0x7dff9a, () => this.pausa(false)).contenitore);
    c.add(pulsante(this, LARGHEZZA / 2, ALTEZZA / 2 + 76, 240, 52, 'MENU', COLORI.testoTenue, () => this.alMenu()).contenitore);
    this.sovrapposto = c;
  }

  private fine(): void {
    const p = this.partita;
    const vinto = p.esito?.vincitore === 'fantasmi';
    musica.ferma();
    (vinto ? suoni.vittoria : suoni.sconfitta)();
    this.time.delayedCall(900, () => {
      const c = this.pannello(400);
      const motivo = vinto ? 'La squadra ha preso Pac-Man 3 volte.'
        : p.esito?.motivo === 'puntini' ? 'Pac-Man ha mangiato tutti i puntini.' : 'Il tempo è scaduto.';
      c.add(testoNeon(this, LARGHEZZA / 2, ALTEZZA / 2 - 140, vinto ? 'VITTORIA!' : 'È SCAPPATO!', 28, vinto ? 0x7dff9a : 0xff3b5c));
      c.add(testo(this, LARGHEZZA / 2, ALTEZZA / 2 - 88, motivo, 9, COLORI.testo));
      const mangiati = p.puntiniTotali - p.rimasti.size;
      const usato = Math.round(REGOLE.durataPartita - p.tempo);
      const righe = [
        ['Catture', `${p.statistiche.catture} / ${REGOLE.vitePacman}`],
        ['Puntini mangiati da Pac-Man', `${mangiati} / ${p.puntiniTotali}`],
        ['Fantasmi mangiati', `${p.statistiche.fantasmiMangiati}`],
        ['Durata', `${Math.floor(usato / 60)}:${String(usato % 60).padStart(2, '0')}`],
      ];
      righe.forEach(([etichetta, valore], i) => {
        c.add(testo(this, 120, ALTEZZA / 2 - 40 + i * 28, etichetta, 8, COLORI.testoTenue).setOrigin(0, 0.5));
        c.add(testo(this, LARGHEZZA - 120, ALTEZZA / 2 - 40 + i * 28, valore, 10, COLORI.testo).setOrigin(1, 0.5));
      });
      c.add(pulsante(this, LARGHEZZA / 2 - 100, ALTEZZA / 2 + 128, 180, 54, 'RIGIOCA', COLORI.accento, () => {
        suoni.clic();
        this.scene.restart(this.scelte);
      }, 12).contenitore);
      c.add(pulsante(this, LARGHEZZA / 2 + 100, ALTEZZA / 2 + 128, 180, 54, 'MENU', COLORI.testoTenue, () => this.alMenu(), 12).contenitore);
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 300 });
      this.sovrapposto = c;
    });
  }

  private pannello(altezza: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.6);
    g.fillRect(0, 0, LARGHEZZA, ALTEZZA);
    const l = LARGHEZZA - 64, y = ALTEZZA / 2 - altezza / 2;
    g.fillStyle(0x0b0f2e, 0.95);
    g.fillRoundedRect(32, y, l, altezza, 16);
    g.lineStyle(8, COLORI.muroAlone, 0.25);
    g.strokeRoundedRect(32, y, l, altezza, 16);
    g.lineStyle(2, COLORI.muroLinea, 1);
    g.strokeRoundedRect(32, y, l, altezza, 16);
    const blocco = this.add.zone(LARGHEZZA / 2, ALTEZZA / 2, LARGHEZZA, ALTEZZA).setInteractive();
    return this.add.container(0, 0, [g, blocco]).setDepth(30);
  }

  private alMenu(): void {
    suoni.clic();
    this.scene.start('Menu');
  }
}
