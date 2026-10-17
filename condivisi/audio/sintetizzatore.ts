/**
 * Suoni e musica generati da codice con la Web Audio API: nessun file audio, nessun diritto.
 * L'AudioContext nasce al primo `avvia()`, che va chiamato dentro un gesto dell'utente
 * (i browser bloccano l'audio partito senza interazione).
 */

export type Onda = OscillatorType;

export interface Nota {
  onda?: Onda;
  /** Frequenza iniziale in Hz. */
  da: number;
  /** Frequenza finale (glissando); se assente resta `da`. */
  a?: number;
  durata: number;
  volume?: number;
  /** Secondi di attesa prima di suonare. */
  ritardo?: number;
}

export const midiAHz = (n: number): number => 440 * 2 ** ((n - 69) / 12);

export class Sintetizzatore {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rumoreBianco: AudioBuffer | null = null;
  private _muto = false;

  avvia(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muto ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get adesso(): number {
    return this.ctx?.currentTime ?? 0;
  }

  get muto(): boolean {
    return this._muto;
  }

  set muto(v: boolean) {
    this._muto = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v ? 0 : 0.6, this.ctx.currentTime, 0.02);
  }

  /** Suona una nota; `quando` è un tempo assoluto dell'AudioContext (per la musica). */
  nota(n: Nota, quando?: number, uscita?: AudioNode): void {
    if (!this.ctx || !this.master) return;
    const t0 = (quando ?? this.ctx.currentTime) + (n.ritardo ?? 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = n.onda ?? 'square';
    osc.frequency.setValueAtTime(n.da, t0);
    if (n.a !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, n.a), t0 + n.durata);
    const v = n.volume ?? 0.2;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(v, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.durata);
    osc.connect(gain).connect(uscita ?? this.master);
    osc.start(t0);
    osc.stop(t0 + n.durata + 0.02);
  }

  /** Breve colpo di rumore filtrato (esplosioni, percussioni). */
  rumore(durata: number, volume = 0.2, filtroHz = 2000, quando?: number, uscita?: AudioNode): void {
    if (!this.ctx || !this.master) return;
    if (!this.rumoreBianco) {
      this.rumoreBianco = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const dati = this.rumoreBianco.getChannelData(0);
      for (let i = 0; i < dati.length; i++) dati[i] = Math.random() * 2 - 1;
    }
    const t0 = quando ?? this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.rumoreBianco;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = filtroHz;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durata);
    src.connect(filtro).connect(gain).connect(uscita ?? this.master);
    src.start(t0);
    src.stop(t0 + durata + 0.02);
  }

  /** Canale con volume proprio (es. musica separata dagli effetti). */
  canale(volume: number): GainNode | null {
    if (!this.ctx || !this.master) return null;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    g.connect(this.master);
    return g;
  }
}

/**
 * Sequencer a passi: programma le note con un piccolo anticipo, così il ritmo resta
 * stabile anche se il gioco rallenta.
 */
export interface Traccia {
  onda: Onda;
  volume: number;
  durataPasso: number;
  /** Una nota MIDI per passo; null = pausa; -1 = percussione (rumore). */
  passi: Array<number | null>;
}

export class Sequencer {
  bpm: number;
  private timer: number | null = null;
  private passo = 0;
  private prossimo = 0;
  private uscita: GainNode | null = null;

  constructor(private readonly synth: Sintetizzatore, private readonly tracce: Traccia[], bpm: number, private readonly volume = 0.5) {
    this.bpm = bpm;
  }

  get inEsecuzione(): boolean {
    return this.timer !== null;
  }

  avvia(): void {
    if (this.timer !== null) return;
    this.uscita ??= this.synth.canale(this.volume);
    if (!this.uscita) return;
    this.passo = 0;
    this.prossimo = this.synth.adesso + 0.05;
    this.timer = window.setInterval(() => this.programma(), 25);
  }

  ferma(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private programma(): void {
    const sedicesimo = 60 / this.bpm / 4;
    while (this.prossimo < this.synth.adesso + 0.12) {
      for (const t of this.tracce) {
        const n = t.passi[this.passo % t.passi.length];
        if (n === null || n === undefined) continue;
        if (n === -1) this.synth.rumore(0.05, t.volume, 6000, this.prossimo, this.uscita!);
        else this.synth.nota({ onda: t.onda, da: midiAHz(n), durata: sedicesimo * t.durataPasso, volume: t.volume }, this.prossimo, this.uscita!);
      }
      this.passo++;
      this.prossimo += sedicesimo;
    }
  }
}
