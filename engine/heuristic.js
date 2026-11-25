export function heuristic(et, kind) {
  const mapping = Array(et.length).fill(-1), ready = Array(et[0].length).fill(0), order = [], events = [];
  const emit = (type, title, data = {}) => events.push({ phase: 'heuristic', type, title, mapping: [...mapping], ready: [...ready], order: [...order], round: order.length + 1, ...data });
  for (let round = 0; round < et.length; round++) {
    const completion = et.map(row => row.map((v, j) => v + ready[j]));
    const minima = completion.map((row, t) => mapping[t] < 0 ? Math.min(...row) : null);
    const remaining = minima.map((value, t) => ({ task: t, value, vm: value === null ? -1 : completion[t].indexOf(value) })).filter(x => x.value !== null);
    const chosen = remaining.reduce((a, b) => (kind === 'max' ? b.value > a.value : b.value < a.value) ? b : a);
    const data = { completion, minima, chosen };
    emit('evaluate', 'Hitung completion time', data);
    emit('minima', 'Minimum setiap task', data);
    emit('choose', kind === 'max' ? 'Pilih minimum terbesar' : 'Pilih minimum terkecil', data);
    emit('route', `Rute T${chosen.task + 1} ke VM${chosen.vm + 1}`, data);
    mapping[chosen.task] = chosen.vm;
    ready[chosen.vm] += et[chosen.task][chosen.vm];
    order.push(chosen.task);
    emit('allocate', 'Alokasi & perbarui ready time', { ...data, round: round + 1 });
  }
  return { mapping, order, ready, events };
}
