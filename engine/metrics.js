export function schedule(mapping, et, order = mapping.map((_, i) => i)) {
  const ready = Array(et[0].length).fill(0), slots = [];
  for (const task of order) {
    const vm = mapping[task];
    if (vm < 0) continue;
    const start = ready[vm], duration = et[task][vm];
    ready[vm] += duration;
    slots.push({ task, vm, start, end: ready[vm], duration });
  }
  const makespan = Math.max(...ready), total = ready.reduce((a, b) => a + b, 0), average = total / ready.length;
  return { slots, loads: ready, makespan, average, doi: (makespan - Math.min(...ready)) / (average + 1e-9), utilization: total / (makespan * ready.length + 1e-9) * 100, fitness: makespan ? 1 / makespan : 0, assigned: slots.length };
}
export function makespan(mapping, et) {
  const loads = Array(et[0].length).fill(0);
  mapping.forEach((v, t) => { if (v >= 0) loads[v] += et[t][v]; });
  return Math.max(...loads);
}
