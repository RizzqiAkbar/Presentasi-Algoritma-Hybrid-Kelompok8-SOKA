import { guidedStops } from './guided.js';

export class Playback {
  constructor(onChange) { this.onChange = onChange; this.index = 0; this.trace = []; this.guidedIndices = []; this.speed = 1; this.mode = 'summary'; this.playing = false; }
  setTrace(trace) { this.pause(); this.trace = trace; this.guidedIndices = guidedStops(trace); this.seek(0); }
  seek(index) { this.pause(); this.index = Math.max(0, Math.min(this.trace.length - 1, index)); this.onChange(); }
  nextIndex(direction = 1) {
    if (this.mode === 'guided') {
      return direction > 0
        ? this.guidedIndices.find(index => index > this.index) ?? this.trace.length - 1
        : [...this.guidedIndices].reverse().find(index => index < this.index) ?? 0;
    }
    let next = this.index + direction;
    if (this.mode === 'summary') {
      const current = this.trace[this.index];
      while (next > 0 && next < this.trace.length - 1) {
        const e = this.trace[next];
        if (e.phase !== current.phase || (e.phase === 'heuristic' && e.type === 'allocate') || (e.phase === 'optimize' && e.iteration !== current.iteration)) break;
        next += direction;
      }
    }
    return Math.max(0, Math.min(this.trace.length - 1, next));
  }
  step(direction) { this.seek(this.nextIndex(direction)); }
  pause() { clearTimeout(this.timer); this.playing = false; }
  play() {
    this.pause();
    if (this.index >= this.trace.length - 1) this.index = 0;
    this.playing = true; this.onChange(); this.tick();
  }
  tick() {
    this.timer = setTimeout(() => {
      if (!this.playing) return;
      this.index = this.nextIndex();
      if (this.index >= this.trace.length - 1) this.playing = false;
      this.onChange();
      if (this.playing) this.tick();
    }, 1350 / this.speed);
  }
  setSpeed(speed) { const wasPlaying = this.playing; this.pause(); this.speed = speed; if (wasPlaying) { this.playing = true; this.tick(); } }
}
