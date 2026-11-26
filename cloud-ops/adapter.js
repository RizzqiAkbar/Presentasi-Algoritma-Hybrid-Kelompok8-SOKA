import { defaults, etc, validate } from '../engine/scenario.js';
import { schedule } from '../engine/metrics.js';

export const limits = Object.freeze({ tasks: 12, vms: 6 });
export function training(seed = 8) {
  return { seed, mode: 'custom', hosts: [{ capacity: 10000 }], vms: [{ host: 0, mips: 1000 }, { host: 0, mips: 1000 }], tasks: [2, 6, 8].map(mi => ({ mi: mi * 1000 })), custom: [[2, 4], [6, 3], [8, 5]] };
}
export function supported(scenario, parameters = defaults) {
  try { validate(scenario, parameters); } catch (e) { return e.message; }
  if (scenario.tasks.length > limits.tasks || scenario.vms.length > limits.vms) return `Skenario ini berisi ${scenario.tasks.length} task dan ${scenario.vms.length} VM. Batas interaksi 3D adalah 12 task dan 6 VM agar kotak, label, dan jalur tetap terbaca. Gunakan latihan kecil atau lanjutkan skenario lengkap di laboratorium 2D.`;
  return '';
}
export class ManualSchedule {
  constructor(scenario) { this.et = etc(scenario); this.reset(); }
  reset() { this.mapping = this.et.map(() => -1); this.order = this.et[0].map(() => []); this.held = null; }
  remove(task) {
    const vm = this.mapping[task];
    if (vm >= 0) this.order[vm] = this.order[vm].filter(t => t !== task);
    this.mapping[task] = -1;
  }
  pick(task) {
    if (this.held !== null || !Number.isInteger(task) || !this.et[task]) return false;
    this.remove(task); this.held = task; return true;
  }
  drop(vm) {
    if (this.held === null || !Number.isInteger(vm) || !this.order[vm]) return false;
    this.mapping[this.held] = vm; this.order[vm].push(this.held); this.held = null; return true;
  }
  tray() { this.held = null; }
  apply(mapping, order) {
    this.reset(); this.mapping = [...mapping];
    (order || mapping.map((_, t) => t)).forEach(t => { if (mapping[t] >= 0) this.order[mapping[t]].push(t); });
  }
  get metrics() { const result = schedule(this.mapping, this.et, this.order.flat()); result.slots.sort((a, b) => a.task - b.task); return result; }
  get complete() { return this.held === null && this.mapping.every(v => v >= 0); }
}

export function demoSteps(result) {
  const steps = [];
  const sampled = new Set([1, 2, 5, 10, 25, result.history.length]);
  result.events.forEach((event, index) => {
    if (event.phase !== 'optimize') {
      if (event.phase !== 'heuristic' || ['choose', 'allocate'].includes(event.type)) steps.push({ event, index, operation: 0 });
      return;
    }
    if (!sampled.has(event.iteration)) return;
    if (event.iteration === 1 || ['evaluation', 'reinforce', 'elitism'].includes(event.type)) steps.push({ event, index, operation: 0 });
    if (event.iteration === 1 && event.type === 'mutation') {
      const changed = event.operations.findIndex(op => op.mutations.some(m => m.old !== m.value));
      if (changed > 0) steps.push({ event, index, operation: changed });
    }
  });
  return steps;
}
export function stepMapping(step) {
  const { event: e, operation = 0 } = step, op = e.operations?.[operation];
  if (e.type === 'selection') return op.a.mapping;
  if (e.type === 'crossover') return op.crossed;
  if (e.type === 'mutation') return op.child;
  return e.mapping;
}
export function comparison(player, results, et) {
  return [
    ['Jadwal pemain', player], ['Max-Min', results.aco.heuristic], ['Min-Min', results.ga.heuristic],
    ['Max-Min + ACO', results.aco.best], ['Min-Min + GA', results.ga.best]
  ].map(([name, mapping]) => ({ name, mapping: [...mapping], ...schedule(mapping, et) }));
}
export function enumerate(et, maximum = 4096) {
  const count = et[0].length ** et.length;
  if (count > maximum) return null;
  let best = Infinity;
  for (let code = 0; code < count; code++) {
    let value = code;
    const mapping = et.map(() => { const vm = value % et[0].length; value = Math.floor(value / et[0].length); return vm; });
    best = Math.min(best, schedule(mapping, et).makespan);
  }
  return { count, makespan: best };
}
export const fmt = value => Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
