import Phaser from 'phaser';
import { ALTEZZA, CARATTERE, COLORI, LARGHEZZA, ZOOM, esadecimale } from './stile';
import { creaTextureScintilla } from './disegno';

/**
 * Disegna una volta sola (a piena risoluzione) ciò che non cambia e lo trasforma in immagine.
 * Le forme di Phaser vengono altrimenti ricalcolate a ogni fotogramma: con centinaia di linee
 * e cerchi è il modo più rapido per consumare batteria e fluidità su un telefono.
 */
export function cuoci(scena: Phaser.Scene, disegna: (g: Phaser.GameObjects.Graphics) => void, y0 = 0): Phaser.GameObjects.RenderTexture {
  const rt = scena.add.renderTexture(0, y0, LARGHEZZA * ZOOM, ALTEZZA * ZOOM).setOrigin(0).setScale(1 / ZOOM);
  const g = scena.make.graphics({ x: 0, y: -y0 * ZOOM }, false).setScale(ZOOM);
  disegna(g);
  rt.draw(g);
  g.destroy();
  return rt;
}

/** Prepara la camera (disegno al doppio della risoluzione) e lo sfondo animato, centrati su `centroY`. */
export function preparaScena(scena: Phaser.Scene, centroY = ALTEZZA / 2): void {
  const cam = scena.cameras.main;
  cam.setZoom(ZOOM);
  cam.centerOn(LARGHEZZA / 2, centroY);
  cam.setBackgroundColor(COLORI.sfondo);
  // Bagliore reale (bloom) e vignettatura: calcolati dalla scheda grafica.
  if (scena.renderer.type === Phaser.WEBGL && cam.postFX) {
    cam.postFX.addBloom(0xffffff, 1, 1, 1.1, 1.25, 4);
    cam.postFX.addVignette(0.5, 0.5, 0.95, 0.35);
  }
  creaTextureScintilla(scena);
  const alto = centroY - ALTEZZA / 2;

  cuoci(scena, (fondo) => {
    // Bagliore diffuso dal centro: profondità senza distrarre.
    for (let i = 12; i > 0; i--) {
      fondo.fillStyle(0x1a1f6b, 0.018);
      fondo.fillEllipse(LARGHEZZA / 2, alto + ALTEZZA * 0.45, LARGHEZZA * (0.4 + i * 0.12), ALTEZZA * (0.3 + i * 0.07));
    }
    // Griglia prospettica in basso, stile arcade anni '80.
    const orizzonte = alto + ALTEZZA * 0.55, fondoY = alto + ALTEZZA;
    fondo.lineStyle(1, 0x3a2a8f, 0.18);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      fondo.lineBetween(LARGHEZZA / 2 + (t - 0.5) * 140, orizzonte, LARGHEZZA / 2 + (t - 0.5) * 1400, fondoY);
    }
    for (let i = 0; i < 8; i++) {
      const y = orizzonte + (fondoY - orizzonte) * (i / 8) ** 1.8;
      fondo.lineBetween(0, y, LARGHEZZA, y);
    }
  }, alto).setDepth(-10);

  scena.add.particles(0, 0, 'scintilla', {
    x: { min: 0, max: LARGHEZZA },
    y: { min: alto, max: alto + ALTEZZA },
    lifespan: 6000,
    speedY: { min: -6, max: -16 },
    scale: { min: 0.05, max: 0.18 },
    alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.5 },
    tint: [0x6f9bff, 0xff8ae2, 0x3ff0ff],
    frequency: 160,
    blendMode: 'ADD',
  }).setDepth(-9);
}

export function testo(
  scena: Phaser.Scene, x: number, y: number, contenuto: string, dimensione: number,
  colore: number = COLORI.testo, opzioni: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  return scena.add.text(x, y, contenuto, {
    fontFamily: CARATTERE,
    fontSize: `${dimensione}px`,
    color: esadecimale(colore),
    align: 'center',
    resolution: ZOOM * 2,
    ...opzioni,
  }).setOrigin(0.5);
}

/** Testo al neon: copia sfocata dietro, testo vivo davanti. */
export function testoNeon(scena: Phaser.Scene, x: number, y: number, contenuto: string, dimensione: number, colore: number): Phaser.GameObjects.Container {
  const alone = testo(scena, x, y, contenuto, dimensione, colore).setAlpha(0.5);
  alone.setShadow(0, 0, esadecimale(colore), 18, true, true);
  const vivo = testo(scena, x, y, contenuto, dimensione, 0xffffff);
  vivo.setShadow(0, 0, esadecimale(colore), 6, true, true);
  vivo.setTint(colore, colore, 0xffffff, 0xffffff);
  return scena.add.container(0, 0, [alone, vivo]);
}

export interface Pulsante {
  contenitore: Phaser.GameObjects.Container;
  imposta(attivo: boolean): void;
}

export function pulsante(
  scena: Phaser.Scene, x: number, y: number, l: number, h: number, etichetta: string,
  colore: number, azione: () => void, dimensione = 12,
): Pulsante {
  const g = scena.add.graphics();
  const scritta = testo(scena, 0, 1, etichetta, dimensione, colore);
  const c = scena.add.container(x, y, [g, scritta]);
  let attivo = false;
  let sopra = false;
  const ridisegna = () => {
    g.clear();
    const pieno = attivo || sopra;
    g.fillStyle(colore, pieno ? 0.22 : 0.06);
    g.fillRoundedRect(-l / 2, -h / 2, l, h, 10);
    g.lineStyle(6, colore, pieno ? 0.25 : 0.1);
    g.strokeRoundedRect(-l / 2, -h / 2, l, h, 10);
    g.lineStyle(2, colore, pieno ? 1 : 0.55);
    g.strokeRoundedRect(-l / 2, -h / 2, l, h, 10);
    scritta.setColor(esadecimale(pieno ? 0xffffff : colore));
  };
  ridisegna();
  c.setSize(l, h).setInteractive({ useHandCursor: true });
  c.on('pointerover', () => { sopra = true; ridisegna(); });
  c.on('pointerout', () => { sopra = false; ridisegna(); });
  c.on('pointerdown', () => {
    scena.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true });
    azione();
  });
  return { contenitore: c, imposta: (v) => { attivo = v; ridisegna(); } };
}
