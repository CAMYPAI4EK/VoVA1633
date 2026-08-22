// Крошечный WebAudio-синтезатор для вагонозвуков.
export class SoundKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  /** Создаёт контекст. Вызывать из пользовательского жеста. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(m ? 0 : 0.5, t + 0.08);
    }
  }

  private tone(
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq: number, delay = 0) {
    if (!this.ctx || !this.master || !this.noiseBuf || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  jump() {
    this.tone(330, 640, 0.13, 'square', 0.16);
  }
  duck() {
    this.tone(320, 170, 0.09, 'square', 0.1);
  }
  hit() {
    this.noise(0.32, 0.5, 900);
    this.tone(210, 52, 0.4, 'sawtooth', 0.3);
    this.tone(95, 38, 0.5, 'triangle', 0.32, 0.03);
  }
  collect() {
    this.tone(880, 880, 0.07, 'sine', 0.16);
    this.tone(1318, 1318, 0.1, 'sine', 0.16, 0.07);
  }
  /** Затвор фотоаппарата: щелчок + короткий писк. */
  shutter() {
    this.noise(0.07, 0.4, 2600);
    this.tone(1560, 1500, 0.05, 'square', 0.14, 0.06);
    this.tone(980, 940, 0.07, 'square', 0.1, 0.12);
  }
  milestone() {
    this.tone(660, 660, 0.08, 'square', 0.12);
    this.tone(990, 990, 0.12, 'square', 0.12, 0.09);
  }
  /** Гудок локомотива при отправлении. */
  whistle() {
    this.tone(392, 384, 0.62, 'triangle', 0.2);
    this.tone(494, 484, 0.62, 'triangle', 0.2);
    this.noise(0.6, 0.05, 1400);
  }
  /** Стук колёс: tuk-tuk. */
  tick(alt: boolean) {
    this.noise(0.045, 0.055, alt ? 460 : 340);
    this.tone(alt ? 120 : 96, alt ? 70 : 58, 0.05, 'sine', 0.05);
  }
}
