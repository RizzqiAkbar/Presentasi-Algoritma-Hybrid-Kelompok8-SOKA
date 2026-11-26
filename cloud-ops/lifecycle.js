export class Lifetime {
  constructor() { this.disposed = false; this.cleanups = []; this.jobs = new Set(); }
  add(cleanup) { if (this.disposed) cleanup(); else this.cleanups.push(cleanup); }
  listen(target, type, handler, options) { target.addEventListener(type, handler, options); this.add(() => target.removeEventListener(type, handler, options)); }
  wait(ms) {
    if (this.disposed) return Promise.resolve(false);
    return new Promise(resolve => {
      const job = { resolve, timer: setTimeout(() => { this.jobs.delete(job); resolve(true); }, ms) };
      this.jobs.add(job);
    });
  }
  cancel() { for (const job of this.jobs) { clearTimeout(job.timer); job.resolve(false); } this.jobs.clear(); }
  dispose() { if (this.disposed) return; this.disposed = true; this.cancel(); this.cleanups.splice(0).reverse().forEach(fn => fn()); }
}
