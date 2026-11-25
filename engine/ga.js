import { makespan } from './metrics.js';
export function tournament(population, et, size, rng) {
  const indices = Array.from({ length: size }, () => Math.floor(rng() * population.length));
  const winner = indices.reduce((a, b) => makespan(population[b], et) < makespan(population[a], et) ? b : a);
  return { indices, winner, mapping: population[winner] };
}
export function breed(parent1, parent2, vmCount, p, rng) {
  let child = [...parent1], point = null;
  if (rng() < p.crossover) {
    point = Math.floor(rng() * child.length);
    child = child.map((v, t) => t >= point ? parent2[t] : v);
  }
  const crossed = [...child], mutations = [];
  child.forEach((old, task) => {
    if (rng() < p.mutation) {
      child[task] = Math.floor(rng() * vmCount);
      mutations.push({ task, old, value: child[task] });
    }
  });
  return { child, crossed, point, mutations };
}
export function ga(et, seedMapping, p, rng) {
  let population = [seedMapping, ...Array.from({ length: p.population - 1 }, () => et.map(() => Math.floor(rng() * et[0].length)))];
  let best = [...seedMapping], bestMs = makespan(best, et);
  const events = [{ phase: 'seed', type: 'chromosome', title: 'Min-Min menjadi kromosom 0', mapping: [...best], population }], history = [];
  for (let iteration = 1; iteration <= p.generations; iteration++) {
    const previousBestMs = bestMs, previousBest = [...best];
    const previous = population, elite = [...best], next = [elite], operations = [];
    for (let i = 1; i < p.population; i++) {
      const a = tournament(population, et, p.tournament, rng), b = tournament(population, et, p.tournament, rng);
      const op = { a, b, ...breed(a.mapping, b.mapping, et[0].length, p, rng) };
      next.push(op.child); operations.push(op);
      const ms = makespan(op.child, et);
      if (ms < bestMs) { bestMs = ms; best = [...op.child]; }
    }
    history.push({ iteration, current: Math.min(...next.map(c => makespan(c, et))), best: bestMs });
    const common = { phase: 'optimize', iteration, population: previous, next, operations, elite, bestMs: previousBestMs, global: previousBest, history: history.slice(0, -1) };
    events.push({ ...common, type: 'fitness', title: 'Evaluasi fitness populasi', mapping: [...elite] });
    const op = operations[0];
    events.push({ ...common, type: 'selection', title: 'Tournament selection', mapping: [...op.a.mapping] });
    events.push({ ...common, type: 'crossover', title: 'Single-point crossover', mapping: [...op.crossed] });
    events.push({ ...common, type: 'mutation', title: 'Mutasi gen', mapping: [...op.child] });
    events.push({ ...common, type: 'elitism', title: 'Elitisme & generasi berikutnya', population: next, bestMs, global: [...best], history: [...history], mapping: [...best] });
    population = next;
  }
  return { events, best, history };
}
