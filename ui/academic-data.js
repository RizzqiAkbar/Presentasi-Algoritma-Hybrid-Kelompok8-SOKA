export const algorithms = Object.freeze({
  'hybrid-aco': { label: 'Max-Min + ACO', color: '#12675e' },
  'hybrid-ga': { label: 'Min-Min + GA', color: '#9c4426' },
  aco: { label: 'ACO murni', color: '#466480' },
  gwo: { label: 'GWO murni', color: '#68506c' }
});
export const metricDefinitions = Object.freeze({
  ms: { label: 'Makespan', unit: 's', digits: 1 },
  doi: { label: 'Degree of Imbalance', unit: 'tanpa satuan', digits: 3 },
  util: { label: 'Utilisasi', unit: '%', digits: 1, higher: true },
  time: { label: 'Waktu algoritma', unit: 'ms', digits: 2 },
  cost: { label: 'Biaya model', unit: 'USD', digits: 2 },
  predictedMs: { label: 'Prediksi makespan', unit: 's', digits: 1 },
  imbalanceSd: { label: 'SD waktu selesai VM', unit: 's', digits: 2 },
  throughput: { label: 'Throughput', unit: 'task/s', digits: 4, higher: true },
  gap: { label: 'Gap prediksi–simulasi', unit: '%', digits: 4 }
});
export function filterRows(rows, range = 'all') {
  if (!['all', 'low', 'mid', 'high'].includes(range)) throw new Error('Filter dataset tidak dikenal.');
  return rows.filter(r => range === 'all' || range === 'low' && r.n <= 300 || range === 'mid' && r.n >= 400 && r.n <= 700 || range === 'high' && r.n >= 800);
}
export function improvement(value, baseline, higher = false) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline <= 0) return null;
  return (higher ? value - baseline : baseline - value) / baseline * 100;
}
export function validateHistorical(data) {
  if (data.schema !== 1 || data.units.imbalanceSd !== 's' || data.units.doi !== 'dimensionless') throw new Error('Skema atau satuan data historis tidak sesuai.');
  for (const [kind, ids] of [['hybrid', ['hybrid-aco', 'hybrid-ga']], ['meta', ['aco', 'gwo']]]) {
    if (data[kind].length !== 20 || data.sources[kind].kind !== 'historical-single-run') throw new Error('Rekaman historis tidak lengkap.');
    for (const n of Array.from({ length: 10 }, (_, i) => (i + 1) * 100)) for (const id of ids) {
      const rows = data[kind].filter(r => r.n === n && r.algorithm === id);
      if (rows.length !== 1 || rows[0].runs !== 1 || !Number.isFinite(rows[0].ms)) throw new Error('Baris historis hilang atau duplikat.');
      if (kind === 'meta' && (rows[0].doi !== null || rows[0].time !== null || !Number.isFinite(rows[0].imbalanceSd))) throw new Error('Imbalance historis tidak boleh dilabeli DoI; runtime yang tidak tersedia harus null.');
    }
  }
  if (data.datasetAudit.length !== 10 || data.datasetAudit.some(r => r.orderedEqual !== (r.hybridWorkloadSha256 === r.metaWorkloadSha256))) throw new Error('Audit workload tidak konsisten.');
  return data;
}
export function validateControlled(data) {
  if (data.kind !== 'controlled-new-runs' || data.units.ms !== 's' || data.units.time !== 'ms' || data.units.doi !== 'dimensionless') throw new Error('Data terkontrol atau satuan tidak sesuai.');
  if (JSON.stringify(data.seeds) !== JSON.stringify([1,2,3,4,5,6,7,8,9,10])) throw new Error('Daftar seed tidak sesuai.');
  for (const [key, cohort] of Object.entries(data.cohorts)) {
    const ids = key === 'tuned' ? ['hybrid-aco', 'hybrid-ga', 'aco', 'gwo'] : ['hybrid-aco', 'aco', 'gwo'];
    if (cohort.rows.length !== ids.length * 10 || cohort.successfulRuns !== ids.length * 100) throw new Error('Jumlah run tidak lengkap.');
    for (let n = 100; n <= 1000; n += 100) for (const id of ids) {
      const matches = cohort.rows.filter(r => r.n === n && r.algorithm === id);
      if (matches.length !== 1 || matches[0].runs !== 10) throw new Error('Agregat hilang, duplikat atau bukan 10 run.');
      for (const metric of ['ms', 'doi', 'util', 'time', 'cost']) {
        const m = matches[0].metrics[metric];
        if (!m || ['mean', 'sd', 'best', 'worst'].some(k => !Number.isFinite(m[k]) || m[k] < 0)) throw new Error('Metrik agregat tidak valid.');
      }
    }
  }
  return data;
}
export function selectHybrid(rows) {
  let aco = 0, ga = 0;
  const counts = [...new Set(rows.map(r => r.n))];
  if (!counts.length) throw new Error('Tidak ada pasangan hybrid.');
  for (const n of counts) {
    const a = rows.find(r => r.n === n && r.algorithm === 'hybrid-aco'), g = rows.find(r => r.n === n && r.algorithm === 'hybrid-ga');
    if (!a || !g) throw new Error('Pasangan hybrid tidak lengkap.');
    if (a.ms < g.ms) aco++; else if (g.ms < a.ms) ga++;
  }
  return { selected: aco === ga ? null : aco > ga ? 'hybrid-aco' : 'hybrid-ga', aco, ga, count: counts.length };
}
export function chartPoints(rows, ids, metric, range = 'all', controlled = true) {
  if (!metricDefinitions[metric]) throw new Error('Metrik tidak dikenal.');
  const selected = filterRows(rows, range), counts = [...new Set(selected.map(r => r.n))].sort((a,b) => a-b);
  return counts.flatMap(n => ids.map(id => {
    const row = selected.find(r => r.n === n && r.algorithm === id);
    const m = controlled ? row?.metrics?.[metric] : row && { mean: row[metric], sd: 0, best: row[metric], worst: row[metric] };
    if (!m || !Number.isFinite(m.mean)) throw new Error(`Nilai ${metric} ${id}/${n} tidak tersedia. Jangan menggantinya dengan nol.`);
    return { n, algorithm: id, value: m.mean, sd: m.sd, best: m.best, worst: m.worst, runs: row.runs };
  }));
}
export function comparisonCounts(rows, selected, opponent, metric) {
  const higher = !!metricDefinitions[metric]?.higher;
  let wins = 0, losses = 0, ties = 0;
  const counts = [...new Set(rows.map(r => r.n))];
  for (const n of counts) {
    const a = rows.find(r => r.n === n && r.algorithm === selected)?.metrics?.[metric]?.mean;
    const b = rows.find(r => r.n === n && r.algorithm === opponent)?.metrics?.[metric]?.mean;
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Kesimpulan lintas metode membutuhkan pasangan metrik terkontrol.');
    if (Math.abs(a-b) < 1e-9) ties++; else if (higher ? a > b : a < b) wins++; else losses++;
  }
  return { wins, losses, ties, count: counts.length };
}
