import { fmt, stepMapping } from './adapter.js';
import { schedule } from '../engine/metrics.js';

const geneRow = (name, mapping, options = {}) => `<div class="gene-row">${name}<div class="genes">${mapping.map((vm, t) => `<span class="gene ${options.point !== null && options.point !== undefined ? (t < options.point ? 'a' : 'b') : ''} ${options.changed?.includes(t) ? 'changed' : ''} ${t === options.point ? 'cut' : ''}"><small>T${t + 1}</small><b>${vm < 0 ? '?' : vm + 1}</b></span>`).join('')}</div></div>`;
export function describe(step, result, parameters) {
  const { event: e, operation = 0 } = step, op = e.operations?.[operation], p = parameters;
  let text = '', detail = '', genes = '';
  const mapping = stepMapping(step), ms = schedule(mapping, result.et).makespan;
  if (e.type === 'setup') text = 'Semua task tersedia pada t = 0. Waktu robot berjalan hanya membantu visualisasi dan tidak masuk makespan.';
  if (e.type === 'etc') text = 'Setiap baris ETC berisi durasi task pada setiap VM. Makespan mempertimbangkan beban yang sudah ada, bukan hanya durasi satu task.';
  if (['choose', 'allocate'].includes(e.type)) {
    const c = e.chosen, kind = result.algorithm === 'aco' ? 'terbesar (Max-Min)' : 'terkecil (Min-Min)';
    text = `Minimum CT task tersisa: ${e.minima.map((value, t) => value === null ? '' : `T${t + 1} = ${fmt(value)} s`).filter(Boolean).join('; ')}. Pilih minimum ${kind}: T${c.task + 1} ke VM${c.vm + 1}, CT ${fmt(c.value)} s.`;
    if (e.type === 'allocate') text += ' Robot menempatkan task sesuai keputusan ini.';
  }
  if (e.type === 'pheromone') text = 'Mapping Max-Min diberi feromon awal τ = 3 pada VM terpilih dan τ = 1 pada pilihan lain. Semut memakai feromon dan η = 1/(ETC + 10⁻⁶).';
  if (e.type === 'chromosome') {
    text = `Mapping Min-Min menjadi kromosom 0. Populasi awal berisi ${p.population} kromosom; sisanya dibangkitkan dengan seed skenario.`;
    genes = e.population.slice(0, 3).map((mapping, i) => geneRow(`K${i}${i === 0 ? ' · seed Min-Min' : ' · inisialisasi acak'}`, mapping)).join('');
    detail = `Perwakilan ${Math.min(3, e.population.length)} dari ${e.population.length} kromosom awal. Dunia menampilkan K0. Angka gen = nomor VM.`;
  }
  if (e.type === 'explore') {
    const t = e.task, v = e.candidates[0].mapping[t];
    text = `Iterasi ${e.iteration}: semut 1 memilih T${t + 1} → VM${v + 1}. Probabilitas ${fmt(e.probs[t][v] * 100)}%, draw ${fmt(e.candidates[0].draws[t])}. Rute di pulau mewakili semut 1 dari ${p.ants} semut yang dihitung.`;
    detail = `τ T${t + 1}: ${e.tau[t].map(fmt).join(', ')}; P: ${e.probs[t].map(x => fmt(x * 100) + '%').join(', ')}.`;
  }
  if (e.type === 'evaluation') text = `Iterasi ${e.iteration}/${p.iterations}: ${p.ants} kandidat dievaluasi. Semut 1: ${fmt(e.candidates[0].ms)} s; terbaik iterasi: ${fmt(e.iterationBest)} s; global best: ${fmt(e.bestMs)} s. Dunia menampilkan global best, garis semut tetap menunjukkan kandidat 1.`;
  if (e.type === 'evaporate') { text = `Evaporasi iterasi ${e.iteration}: semua τ dikalikan (1 − ${fmt(p.rho)}), dengan batas bawah 0,01. Mapping global best tetap sama.`; detail = `τ setelah evaporasi: ${e.tau.map(row => '[' + row.map(fmt).join(', ') + ']').join(' ')}.`; }
  if (e.type === 'reinforce') { text = `Iterasi ${e.iteration}/${p.iterations}: tambahkan Q/makespan = ${fmt(e.deposit)} pada jalur global best. Q = ${fmt(p.q)}; global best ${fmt(e.bestMs)} s. Warna jalur menandai VM; intensitas mengikuti τ aktual.`; detail = `τ setelah reinforcement: ${e.tau.map(row => '[' + row.map(fmt).join(', ') + ']').join(' ')}.`; }
  if (e.type === 'fitness') {
    text = `Generasi ${e.iteration}/${p.generations}: fitness = 1/makespan untuk ${p.population} kromosom. Semakin kecil makespan, semakin besar fitness. Elit sebelumnya: ${fmt(e.bestMs)} s; dunia menampilkan elit.`;
    detail = e.population.map((mapping, i) => { const m = schedule(mapping, result.et); return `K${i}: makespan ${fmt(m.makespan)} s, fitness ${m.fitness.toLocaleString('id-ID', { maximumFractionDigits: 5 })}`; }).join('; ');
  }
  if (e.type === 'selection') {
    text = `Anak ${operation + 1}: dua turnamen berukuran ${p.tournament}. Induk A menang dari K${op.a.indices.join(', K')}: K${op.a.winner}. Induk B menang dari K${op.b.indices.join(', K')}: K${op.b.winner}. Sampling dapat memilih indeks yang sama.`;
    genes = geneRow('Induk A', op.a.mapping) + geneRow('Induk B', op.b.mapping);
  }
  if (e.type === 'crossover') {
    text = op.point === null ? `Anak ${operation + 1}: crossover tidak terpicu (Pc ${fmt(p.crossover)}). Anak menyalin induk A; tidak ada rekombinasi.` : `Anak ${operation + 1}: crossover terpicu, titik potong indeks ${op.point}. Gen sebelum titik dari A (bingkai teal), mulai titik dari B (bingkai rust). Angka menunjukkan VM tujuan setiap task.`;
    genes = geneRow('Induk A', op.a.mapping) + geneRow('Induk B', op.b.mapping) + geneRow('Anak setelah crossover', op.crossed, { point: op.point });
  }
  if (e.type === 'mutation') {
    const changes = op.mutations.filter(m => m.old !== m.value), noops = op.mutations.length - changes.length;
    text = `Anak ${operation + 1}, Pm ${fmt(p.mutation)} per gen: ` + (changes.length ? changes.map(m => `T${m.task + 1}: VM${m.old + 1} → VM${m.value + 1}`).join('; ') : 'tidak ada gen yang berubah') + `.${noops ? ` ${noops} mutasi memilih VM yang sama.` : ''} Makespan anak ${fmt(ms)} s; global best sebelum generasi ${fmt(e.bestMs)} s. Bingkai putus-putus menandai perubahan yang tampak di pulau.`;
    genes = geneRow('Sebelum mutasi', op.crossed) + geneRow('Sesudah mutasi', op.child, { changed: changes.map(m => m.task) });
  }
  if (e.type === 'elitism') { text = `Generasi ${e.iteration}/${p.generations}: elit sebelumnya disalin ke slot 0, lalu ${p.population - 1} anak mengisi generasi baru. Global best ${fmt(e.bestMs)} s. Penggantian global best hanya jika makespan lebih kecil.`; genes = geneRow('Elit sebelumnya', e.elite) + geneRow('Global best sekarang', e.global); }
  if (['convergence', 'final'].includes(e.type)) {
    const delta = result.initial.makespan - result.final.makespan;
    text = `Makespan awal ${fmt(result.initial.makespan)} s; akhir ${fmt(result.final.makespan)} s. ${delta > 1e-8 ? `Perbaikan ${fmt(delta)} s.` : 'Tidak ada perbaikan makespan; global best awal dipertahankan.'} DoI tidak menjadi tie-break. Jalankan untuk melihat eksekusi paralel.`;
    genes = geneRow('Mapping akhir', result.best);
    detail = result.history.map(h => `${h.iteration}: kandidat ${fmt(h.current)} s / global ${fmt(h.best)} s`).join('; ');
  }
  return { text, genes, detail };
}
