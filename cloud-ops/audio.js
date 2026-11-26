// The teammate's procedural Am7/Fmaj7/Cmaj7/Gadd9 music, with an explicit opt-in lifetime.
export class AudioSystem {
  constructor() { this.on = false; this.nodes = new Set(); this.step = 0; this.timer = null; this.disposed = false; }
  async enable() {
    if (this.disposed) return false;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('Web Audio tidak tersedia pada browser ini.');
    if (!this.context) {
      this.context = new Context(); this.master = this.context.createGain(); this.master.gain.value = .18;
      const compressor = this.context.createDynamicsCompressor(); this.master.connect(compressor); compressor.connect(this.context.destination);
      this.compressor = compressor;
    }
    await this.context.resume(); if (this.disposed) return false;
    this.on = true; this.next = this.context.currentTime + .05;
    clearInterval(this.timer); this.timer = setInterval(() => this.schedule(), 50); this.schedule(); return true;
  }
  tone(frequency, time, duration, type = 'triangle', volume = .12, destination = this.master) {
    if (!this.on || this.context?.state !== 'running') return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain(); oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, time); gain.gain.linearRampToValueAtTime(volume, time + .01); gain.gain.exponentialRampToValueAtTime(.0001, time + duration + .25);
    oscillator.connect(gain); gain.connect(destination); this.nodes.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.nodes.delete(oscillator); };
    oscillator.start(time); oscillator.stop(time + duration + .3);
  }
  noise(time, duration, volume, frequency) {
    if (!this.on) return;
    const ctx = this.context, buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(); source.buffer = buffer;
    filter.type = 'highpass'; filter.frequency.value = frequency; gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); this.nodes.add(source);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.nodes.delete(source); }; source.start(time); source.stop(time + duration);
  }
  schedule() {
    if (!this.on || this.context.state !== 'running') return;
    const duration = 60 / 92 / 4, chords = [[110, 220, 261.63, 329.63, 392], [87.31, 174.61, 220, 261.63, 329.63], [130.81, 261.63, 329.63, 392, 493.88], [98, 196, 246.94, 293.66, 440]], arp = [0, 2, 1, 3, 2, 1, 3, 2];
    while (this.next < this.context.currentTime + .2) {
      const s = this.step % 16, chord = chords[Math.floor(this.step / 16) % 4], t = this.next;
      if (s === 0) chord.slice(1).forEach(f => { this.tone(f * .996, t, duration * 15, 'triangle', .045); this.tone(f * 1.004, t, duration * 15, 'sine', .04); });
      if ([0, 6, 10].includes(s)) this.tone(chord[0], t, duration * 3, 'sine', .22);
      if (s % 2 === 0) { this.tone(chord[1 + arp[s / 2]] * 2, t, .06, 'triangle', .085); this.noise(t, .04, .03, 7000); }
      if ([4, 12].includes(s)) this.noise(t, .14, .10, 1800);
      this.next += duration; this.step = (this.step + 1) % 64;
    }
  }
  effect(kind, stars = 0) {
    if (!this.on) return;
    const notes = kind === 'pick' ? [523.25, 783.99] : kind === 'drop' ? [220, 392] : kind === 'start' ? [392, 523.25, 659.25] : stars >= 2 ? [523.25, 659.25, 783.99, 1046.5] : [392, 493.88, 587.33];
    notes.forEach((f, i) => this.tone(f, this.context.currentTime + .01 + i * .10, .10, 'triangle', .25));
  }
  async disable() {
    this.on = false; clearInterval(this.timer); this.timer = null;
    for (const node of this.nodes) { try { node.stop(); } catch {} } this.nodes.clear();
    if (this.context?.state === 'running') await this.context.suspend();
  }
  async dispose() { if (this.disposed) return; this.disposed = true; await this.disable(); if (this.context && this.context.state !== 'closed') await this.context.close(); }
}
