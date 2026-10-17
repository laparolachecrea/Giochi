import Phaser from 'phaser';
import { Menu } from './scene/Menu';
import { Gioco } from './scene/Gioco';
import { ALTEZZA, COLORI, LARGHEZZA, ZOOM } from './grafica/stile';

async function caricaCarattere(): Promise<void> {
  // Il gioco parte comunque dopo 2,5 secondi: senza rete si usa un carattere di sistema.
  const attesa = new Promise((r) => setTimeout(r, 2500));
  await Promise.race([document.fonts.load('16px "Press Start 2P"'), attesa]).catch(() => undefined);
}

void caricaCarattere().then(() => {
  // Esposto per i collaudi automatici nel browser.
  (window as unknown as { gioco: Phaser.Game }).gioco = new Phaser.Game({
    type: Phaser.AUTO,
  parent: 'gioco',
  width: LARGHEZZA * ZOOM,
  height: ALTEZZA * ZOOM,
  backgroundColor: COLORI.sfondo,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [Menu, Gioco],
  });
});
