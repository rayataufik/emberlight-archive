// Emberlight Archive — all sound is synthesized with WebAudio.
// No audio files, no network: every effect is an oscillator or a short
// filtered noise burst, started only after the player's first input.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambientNodes = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.startAmbient();
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.ctx.suspend();
    if (this.ctx && !this.muted) this.ctx.resume();
    return this.muted;
  }

  // A low, slow-breathing drone under the whole game.
  startAmbient() {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    osc.start();
    lfo.start();
    this.ambientNodes = { gain };
  }

  tone(freq, dur, type, vol, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noiseBurst(dur, vol, cutoff) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  footstep(sneaking) {
    this.noiseBurst(0.07, sneaking ? 0.03 : 0.09, sneaking ? 500 : 900);
  }

  pickup() {
    this.tone(660, 0.12, 'sine', 0.12);
    setTimeout(() => this.tone(990, 0.18, 'sine', 0.12), 90);
  }

  spotted() {
    this.tone(220, 0.35, 'sawtooth', 0.1, 440);
    this.noiseBurst(0.2, 0.08, 1200);
  }

  caught() {
    this.tone(180, 0.5, 'sawtooth', 0.14, 60);
  }

  levelClear() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.12), i * 110));
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.12), i * 130));
  }
}
