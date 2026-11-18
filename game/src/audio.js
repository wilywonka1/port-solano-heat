// WebAudio-synthesised sound for Solano Heat: no audio files, everything is oscillators and noise.
export class Sound {
  constructor() { this.ctx = null; this.engineOsc = null; this.engineGain = null; this.sirenOsc = null; this.sirenGain = null; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.ctx.destination);
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60; o.connect(g); o.start();
      this.engineOsc = o; this.engineGain = g;
      const sg = this.ctx.createGain(); sg.gain.value = 0; sg.connect(this.ctx.destination);
      const so = this.ctx.createOscillator(); so.type = 'sine'; so.frequency.value = 700; so.connect(sg); so.start();
      this.sirenOsc = so; this.sirenGain = sg;
    } catch (e) { this.ctx = null; }
  }
  setEngine(on, speedRatio) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on ? 0.05 : 0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + Math.abs(speedRatio) * 140, t, 0.1);
  }
  setSiren(on) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(on ? 0.018 : 0, t, 0.2);
    if (on) this.sirenOsc.frequency.setValueAtTime(650 + Math.sin(t * 4) * 180, t);
  }
  blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur);
  }
  noise(dur, vol) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol; const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    src.connect(f); f.connect(g); g.connect(this.ctx.destination); src.start(t);
  }
  shot() { this.noise(0.18, 0.35); this.blip(160, 0.1, 'square', 0.15); }
  punch() { this.noise(0.08, 0.2); this.blip(90, 0.12, 'sine', 0.25); }
  cash() { this.blip(880, 0.12, 'square', 0.1); this.blip(1320, 0.2, 'square', 0.1, 0.09); }
  sting() { this.blip(523, 0.15, 'triangle', 0.14); this.blip(659, 0.15, 'triangle', 0.14, 0.13); this.blip(784, 0.3, 'triangle', 0.14, 0.26); }
  hurt() { this.blip(200, 0.15, 'sawtooth', 0.12); }
}
