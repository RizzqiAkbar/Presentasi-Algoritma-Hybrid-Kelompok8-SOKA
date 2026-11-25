import { random } from './random.js';

export const defaults = {
  ants: 25, iterations: 50, alpha: 1, beta: 2, rho: 0.2, q: 100,
  population: 30, generations: 50, tournament: 3, crossover: 0.8, mutation: 0.05
};
export const presets = {
  demo: { name: 'Demonstrasi sederhana', hosts: 2, vms: 4, tasks: 10, workload: 'mixed', heterogeneous: true },
  hetero: { name: 'Infrastruktur heterogen', hosts: 3, vms: 6, tasks: 12, workload: 'varied', heterogeneous: true },
  light: { name: 'Banyak task ringan', hosts: 2, vms: 4, tasks: 40, workload: 'light', heterogeneous: false },
  mixed: { name: 'Campuran berat & ringan', hosts: 2, vms: 5, tasks: 15, workload: 'mixed', heterogeneous: true },
  imbalance: { name: 'Beban tidak seimbang', hosts: 2, vms: 4, tasks: 12, workload: 'skew', heterogeneous: true },
  many: { name: 'Infrastruktur banyak VM', hosts: 4, vms: 16, tasks: 60, workload: 'varied', heterogeneous: true }
};

export function generate({ hosts = 2, vms = 4, tasks = 10, seed = 8, workload = 'mixed', heterogeneous = true, capacity = 10000 } = {}) {
  const rng = random(seed), tiers = [500, 1000, 1500, 2500];
  return {
    seed, mode: 'derived',
    hosts: Array.from({ length: hosts }, () => ({ capacity })),
    vms: Array.from({ length: vms }, (_, i) => ({ host: i % hosts, mips: heterogeneous ? tiers[i % tiers.length] : 1500 })),
    tasks: Array.from({ length: tasks }, (_, i) => ({ mi: workload === 'uniform' ? 9000 : workload === 'light' ? 500 + Math.floor(rng() * 2500) : workload === 'skew' ? (i === 0 ? 150000 : 1000 + Math.floor(rng() * 3000)) : workload === 'mixed' ? (i % 3 === 0 ? 18000 : 2000) + Math.floor(rng() * 11000) : 1000 + Math.floor(rng() * 29000) }))
  };
}

function range(value, min, max, name, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`${name}: masukkan ${integer ? 'bilangan bulat ' : ''}${min}–${max}.`);
  }
}
export function validate(s, p = defaults) {
  range(s.hosts.length, 1, 8, 'Jumlah host', true);
  range(s.vms.length, 1, 24, 'Jumlah VM', true);
  range(s.tasks.length, 1, 100, 'Jumlah task', true);
  range(s.seed, 0, 4294967295, 'Seed', true);
  s.hosts.forEach((h, i) => range(h.capacity, 1, 1000000, `Kapasitas host ${i + 1}`));
  s.vms.forEach((v, i) => {
    range(v.mips, 1, 100000, `MIPS VM ${i + 1}`);
    range(v.host, 0, s.hosts.length - 1, `Host VM ${i + 1}`, true);
  });
  s.hosts.forEach((h, i) => {
    const reserved = s.vms.filter(v => v.host === i).reduce((n, v) => n + v.mips, 0);
    if (reserved > h.capacity) throw new Error(`Host ${i + 1}: reservasi ${reserved} MIPS melebihi kapasitas ${h.capacity} MIPS.`);
  });
  s.tasks.forEach((t, i) => range(t.mi, 1, 100000000, `MI task ${i + 1}`));
  if (!['derived', 'custom'].includes(s.mode)) throw new Error('Model ETC tidak dikenal.');
  if (s.mode === 'custom') {
    if (s.custom?.length !== s.tasks.length || s.custom.some(r => r.length !== s.vms.length)) throw new Error('Dimensi matriks ETC harus sama dengan task × VM.');
    s.custom.forEach((r, t) => r.forEach((v, j) => range(v, 0.000001, 100000000, `ETC T${t + 1}/VM${j + 1}`)));
  }
  for (const k of ['ants', 'population', 'iterations', 'generations', 'tournament']) range(p[k], k === 'population' ? 2 : 1, k === 'tournament' ? 10 : 100, k, true);
  for (const k of ['crossover', 'mutation', 'rho']) range(p[k], 0, 1, k);
  range(p.alpha, 0, 5, 'Alpha'); range(p.beta, 0, 5, 'Beta'); range(p.q, 0.001, 10000, 'Q');
  return s;
}
export function etc(s) { return s.mode === 'custom' ? s.custom.map(r => [...r]) : s.tasks.map(t => s.vms.map(v => t.mi / v.mips)); }
