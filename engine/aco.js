import { makespan } from './metrics.js';
export function probabilities(tau, et, alpha, beta) {
  const weights = tau.map((x, v) => x ** alpha * (1 / (et[v] + 1e-6)) ** beta);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}
export function roulette(probs, draw) {
  let cumulative = 0;
  for (let v = 0; v < probs.length; v++) { cumulative += probs[v]; if (draw <= cumulative) return v; }
  return probs.length - 1;
}
export function aco(et, seedMapping, p, rng) {
  let best = [...seedMapping], bestMs = makespan(best, et);
  let tau = et.map((row, t) => row.map((_, v) => v === seedMapping[t] ? 3 : 1));
  const events = [{ phase: 'seed', type: 'pheromone', title: 'Jadwal menjadi feromon', mapping: [...best], tau }], history = [];
  for (let iteration = 1; iteration <= p.iterations; iteration++) {
    const probs = et.map((row, t) => probabilities(tau[t], row, p.alpha, p.beta));
    const candidates = [];
    for (let ant = 0; ant < p.ants; ant++) {
      const draws = et.map(() => rng());
      const mapping = draws.map((draw, t) => roulette(probs[t], draw));
      const ms = makespan(mapping, et);
      candidates.push({ mapping, ms, draws });
      if (ms < bestMs) { bestMs = ms; best = [...mapping]; }
    }
    const iterationBest = Math.min(...candidates.map(c => c.ms));
    history.push({ iteration, current: iterationBest, best: bestMs });
    const common = { phase: 'optimize', iteration, tau, probs, candidates, iterationBest, bestMs, global: [...best], history: [...history] };
    for (const task of [...new Set([0, Math.floor((et.length - 1) / 2), et.length - 1])]) {
      events.push({ ...common, history: history.slice(0, -1), type: 'explore', title: `Semut 1: pemilihan T${task + 1}`, task, mapping: candidates[0].mapping.map((v, t) => t <= task ? v : -1) });
    }
    events.push({ ...common, type: 'evaluation', title: `Evaluasi ${p.ants} solusi semut`, mapping: [...best] });
    const evaporated = tau.map(row => row.map(x => Math.max(0.01, x * (1 - p.rho))));
    events.push({ ...common, type: 'evaporate', title: 'Evaporasi feromon', tau: evaporated, mapping: [...best] });
    const deposit = p.q / bestMs;
    tau = evaporated.map((row, t) => row.map((x, v) => x + (best[t] === v ? deposit : 0)));
    events.push({ ...common, type: 'reinforce', title: 'Reinforcement global best', tau, deposit, mapping: [...best] });
  }
  return { events, best, history };
}
