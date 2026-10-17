import Phaser from 'phaser';
import { DIFFICOLTA, FANTASMI, potereDi, type LivelloDifficolta } from '../logica/costanti';
import { disegnaFantasma, disegnaPacman } from '../grafica/disegno';
import { preparaScena, pulsante, testo, testoNeon, type Pulsante } from '../grafica/interfaccia';
import { ALTEZZA_BASE, COLORI, LARGHEZZA } from '../grafica/stile';
import { suoni, synth } from '../suoni';

export interface Scelte {
  fantasma: number;
  difficolta: LivelloDifficolta;
  nebbia: boolean;
}

const CHIAVE = 'caccia-a-pacman:scelte';

function leggiScelte(): Scelte {
  try {
    const s = JSON.parse(localStorage.getItem(CHIAVE) ?? '');
    if (FANTASMI[s.fantasma] && DIFFICOLTA[s.difficolta as LivelloDifficolta]) return { ...s, nebbia: s.nebbia === true };
  } catch { /* prima visita o archiviazione non disponibile */ }
  return { fantasma: 0, difficolta: 'facile', nebbia: false };
}

function salvaScelte(s: Scelte): void {
  try { localStorage.setItem(CHIAVE, JSON.stringify(s)); } catch { /* facoltativo */ }
}

export class Menu extends Phaser.Scene {
  private scelte!: Scelte;
  private animazione!: Phaser.GameObjects.Graphics;
  private schede: Array<{ g: Phaser.GameObjects.Graphics; x: number; y: number }> = [];
  private ritratti!: Phaser.GameObjects.Graphics;
  private testiPotere: Array<{ nome: Phaser.GameObjects.Text; descrizione: Phaser.GameObjects.Text }> = [];

  constructor() { super('Menu'); }

  create(): void {
    this.scelte = leggiScelte();
    this.schede = [];
    this.testiPotere = [];
    preparaScena(this, ALTEZZA_BASE / 2);

    testo(this, LARGHEZZA / 2, 52, 'CACCIA A', 18, COLORI.testoTenue);
    testoNeon(this, LARGHEZZA / 2, 100, 'PAC-MAN', 48, COLORI.pacman);
    testo(this, LARGHEZZA / 2, 146, 'Questa volta il fantasma sei tu.', 10, COLORI.testo);

    this.animazione = this.add.graphics();

    testo(this, LARGHEZZA / 2, 254, 'SCEGLI IL TUO FANTASMA', 12, COLORI.testoTenue);
    this.ritratti = this.add.graphics().setDepth(2);
    FANTASMI.forEach((def, id) => {
      const x = id % 2 === 0 ? 24 : 312;
      const y = id < 2 ? 274 : 394;
      const g = this.add.graphics();
      this.schede.push({ g, x, y });
      testo(this, x + 168, y + 22, def.nome.toUpperCase(), 13, def.colore);
      this.testiPotere.push({
        nome: testo(this, x + 168, y + 48, '', 10, 0xffffff),
        descrizione: testo(this, x + 168, y + 80, '', 8, COLORI.testoTenue, { wordWrap: { width: 170 }, lineSpacing: 6 }),
      });
      const zona = this.add.zone(x + 136, y + 55, 272, 110).setInteractive({ useHandCursor: true });
      zona.on('pointerdown', () => { this.scelte.fantasma = id; suoni.clic(); this.aggiornaSchede(); });
    });
    this.aggiornaSchede();

    testo(this, LARGHEZZA / 2, 528, 'DIFFICOLTÀ', 12, COLORI.testoTenue);
    const livelli = Object.keys(DIFFICOLTA) as LivelloDifficolta[];
    const bottoni: Pulsante[] = livelli.map((liv, i) =>
      pulsante(this, 112 + i * 192, 560, 176, 42, DIFFICOLTA[liv].etichetta.toUpperCase(), [0x3ff0ff, 0xffe14d, 0xff3b5c][i], () => {
        this.scelte.difficolta = liv;
        suoni.clic();
        bottoni.forEach((b, j) => b.imposta(livelli[j] === liv));
      }, 11));
    bottoni.forEach((b, j) => b.imposta(livelli[j] === this.scelte.difficolta));

    testo(this, LARGHEZZA / 2, 608, 'NEBBIA', 12, COLORI.testoTenue);
    const opzioniNebbia = [false, true];
    const nebbia: Pulsante[] = opzioniNebbia.map((v, i) =>
      pulsante(this, LARGHEZZA / 2 - 90 + i * 180, 640, 164, 42, v ? 'SÌ' : 'NO', 0x8a93c9, () => {
        this.scelte.nebbia = v;
        suoni.clic();
        nebbia.forEach((b, j) => b.imposta(opzioniNebbia[j] === v));
        this.aggiornaSchede();
      }, 11));
    nebbia.forEach((b, j) => b.imposta(opzioniNebbia[j] === this.scelte.nebbia));

    const gioca = pulsante(this, LARGHEZZA / 2, 712, 300, 62, 'GIOCA', COLORI.pacman, () => this.avvia(), 22);
    this.tweens.add({ targets: gioca.contenitore, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    testo(this, LARGHEZZA / 2, 770, 'PC: frecce o WASD · SPAZIO = potere', 8, COLORI.testoTenue);
    testo(this, LARGHEZZA / 2, 792, 'Telefono: scorri il dito · tocca il cerchio = potere', 8, COLORI.testoTenue);

    this.input.keyboard?.once('keydown-ENTER', () => this.avvia());
  }

  update(tempo: number): void {
    const t = tempo / 1000;
    const g = this.animazione;
    g.clear();
    // Inseguimento decorativo: Pac-Man scappa, i quattro fantasmi lo braccano.
    const giro = LARGHEZZA + 360;
    const x = ((t * 140) % giro) - 60;
    const y = 200;
    disegnaPacman(g, x, y, 3, t, 15);
    FANTASMI.forEach((def, i) => disegnaFantasma(g, x - 60 - i * 44, y, { colore: def.colore, dir: 3, t: t + i, scala: 1.1 }));

    this.ritratti.clear();
    this.schede.forEach(({ x, y }, id) => {
      const scelto = id === this.scelte.fantasma;
      disegnaFantasma(this.ritratti, x + 48, y + 55 + (scelto ? Math.sin(t * 4) * 4 : 0), {
        colore: FANTASMI[id].colore, dir: scelto ? 2 : 3, t: t + id, scala: 1.9,
      });
    });
  }

  private aggiornaSchede(): void {
    this.testiPotere.forEach(({ nome, descrizione }, id) => {
      const potere = potereDi(id, this.scelte.nebbia);
      nome.setText(`Potere: ${potere.nome}`);
      descrizione.setText(potere.descrizione);
    });
    this.schede.forEach(({ g, x, y }, id) => {
      const scelto = id === this.scelte.fantasma;
      const c = FANTASMI[id].colore;
      g.clear();
      g.fillStyle(c, scelto ? 0.14 : 0.04);
      g.fillRoundedRect(x, y, 272, 110, 12);
      if (scelto) {
        g.lineStyle(8, c, 0.18);
        g.strokeRoundedRect(x, y, 272, 110, 12);
      }
      g.lineStyle(2, c, scelto ? 1 : 0.3);
      g.strokeRoundedRect(x, y, 272, 110, 12);
    });
  }

  private avvia(): void {
    synth.avvia();
    suoni.clic();
    salvaScelte(this.scelte);
    this.cameras.main.fadeOut(250, 4, 5, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Gioco', this.scelte));
  }
}
