import { validate, etc, defaults } from './scenario.js';
import { random } from './random.js';
import { heuristic } from './heuristic.js';
import { aco } from './aco.js';
import { ga } from './ga.js';
import { schedule } from './metrics.js';

export function run(scenario, parameters = defaults, algorithm = 'aco') {
  const p = { ...defaults, ...parameters };
  validate(scenario, p);
  const started = performance.now(), et = etc(scenario), initial = Array(et.length).fill(-1);
  const seed = heuristic(et, algorithm === 'aco' ? 'max' : 'min');
  const optimized = algorithm === 'aco' ? aco(et, seed.mapping, p, random(scenario.seed)) : ga(et, seed.mapping, p, random(scenario.seed));
  const final = schedule(optimized.best, et);
  const events = [
    { phase: 'setup', type: 'setup', title: 'Task masuk ke antrean', mapping: initial },
    { phase: 'etc', type: 'etc', title: 'Bangun matriks execution time', mapping: initial },
    ...seed.events, ...optimized.events,
    { phase: 'convergence', type: 'convergence', title: 'Riwayat pencarian', mapping: optimized.best, history: optimized.history },
    { phase: 'final', type: 'final', title: 'Jadwal akhir', mapping: optimized.best, history: optimized.history }
  ];
  const phases = [];
  events.forEach((e, i) => { if (!phases.some(p => p.key === e.phase)) phases.push({ key: e.phase, index: i }); });
  return { algorithm, et, events, phases, heuristic: seed.mapping, heuristicOrder: seed.order, initial: schedule(seed.mapping, et), final, best: optimized.best, history: optimized.history, computeMs: performance.now() - started };
}
