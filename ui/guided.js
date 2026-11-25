export function guidedStops(trace) {
  const rounds = trace.filter(e => e.type === 'allocate').length;
  const iterations = Math.max(0, ...trace.map(e => e.iteration || 0));
  const checkpoints = count => new Set([1, 2, 3, ...[.25, .5, .75, 1].map(part => Math.max(1, Math.round(count * part)))]);
  const roundStops = checkpoints(rounds), iterationStops = checkpoints(iterations);
  return trace.flatMap((event, index) => {
    const boundary = index === 0 || event.phase !== trace[index - 1].phase;
    let selected = boundary || ['convergence', 'final'].includes(event.phase);
    if (event.phase === 'heuristic') {
      selected ||= event.type === 'choose' && event.round <= 3;
      selected ||= event.type === 'allocate' && (rounds <= 12 || roundStops.has(event.round));
    }
    if (event.phase === 'optimize') {
      if (event.iteration === 1) {
        selected ||= event.type !== 'explore' || event.task === 0 || event.task === event.mapping.length - 1;
      } else {
        selected ||= iterationStops.has(event.iteration) && ['reinforce', 'elitism'].includes(event.type);
      }
    }
    return selected ? [index] : [];
  });
}
