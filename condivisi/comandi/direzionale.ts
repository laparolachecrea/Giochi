/**
 * Comandi direzionali unificati: tastiera (frecce, WASD) e scorrimento del dito.
 * Restituisce l'ultima direzione richiesta; il gioco decide quando applicarla.
 */

/** 0 = su, 1 = sinistra, 2 = giù, 3 = destra, -1 = nessuna. */
export type Direzione = -1 | 0 | 1 | 2 | 3;

export const SU = 0, SINISTRA = 1, GIU = 2, DESTRA = 3, NESSUNA = -1;

export interface OpzioniComandi {
  /** Pixel di trascinamento oltre i quali uno scorrimento diventa una direzione. */
  sogliaScorrimento?: number;
  onAzione?: () => void;
  onPausa?: () => void;
}

const TASTI: Record<string, Direzione> = {
  ArrowUp: SU, KeyW: SU,
  ArrowLeft: SINISTRA, KeyA: SINISTRA,
  ArrowDown: GIU, KeyS: GIU,
  ArrowRight: DESTRA, KeyD: DESTRA,
};

export class ComandiDirezionali {
  direzione: Direzione = NESSUNA;
  private origine: { x: number; y: number; id: number } | null = null;
  private readonly soglia: number;
  private readonly pulizia: Array<() => void> = [];

  constructor(superficie: HTMLElement, private readonly opzioni: OpzioniComandi = {}) {
    this.soglia = opzioni.sogliaScorrimento ?? 18;
    superficie.style.touchAction = 'none';

    this.ascolta(window, 'keydown', (e: KeyboardEvent) => {
      const d = TASTI[e.code];
      if (d !== undefined) {
        this.direzione = d;
        e.preventDefault();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (!e.repeat) this.opzioni.onAzione?.();
        e.preventDefault();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        this.opzioni.onPausa?.();
      }
    });

    this.ascolta(superficie, 'pointerdown', (e: PointerEvent) => {
      this.origine = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    this.ascolta(superficie, 'pointermove', (e: PointerEvent) => {
      if (!this.origine || this.origine.id !== e.pointerId) return;
      const dx = e.clientX - this.origine.x;
      const dy = e.clientY - this.origine.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < this.soglia) return;
      this.direzione = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DESTRA : SINISTRA) : (dy > 0 ? GIU : SU);
      // Riparte da qui: si può cambiare direzione più volte senza sollevare il dito.
      this.origine = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    const fine = () => { this.origine = null; };
    this.ascolta(superficie, 'pointerup', fine);
    this.ascolta(superficie, 'pointercancel', fine);
  }

  azzera(): void {
    this.direzione = NESSUNA;
  }

  distruggi(): void {
    this.pulizia.forEach((f) => f());
  }

  private ascolta<E extends Event>(bersaglio: EventTarget, tipo: string, gestore: (e: E) => void): void {
    const g = gestore as EventListener;
    bersaglio.addEventListener(tipo, g, { passive: false });
    this.pulizia.push(() => bersaglio.removeEventListener(tipo, g));
  }
}
