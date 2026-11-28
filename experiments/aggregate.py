"""Aggregate complete repeated runs; never interpolate or silently drop failures."""
import csv
import hashlib
import json
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/benchmarks'
METRICS = ['ms', 'doi', 'util', 'cost', 'time']

def aggregate(directory, expected_algorithms):
    path = directory / 'controlled-runs.csv'
    with path.open() as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == len(expected_algorithms) * 100, f'Incomplete cohort: {len(rows)} rows'
    groups = defaultdict(list)
    keys = set()
    for row in rows:
        key = (int(row['n']), int(row['seed']), row['algorithm'])
        assert key not in keys and row['status'] == 'ok'
        keys.add(key); groups[(key[0], key[2])].append(row)
    result = []
    for n in range(100, 1001, 100):
        for algorithm in expected_algorithms:
            group = groups[(n, algorithm)]
            assert sorted(int(r['seed']) for r in group) == list(range(1, 11))
            metrics = {}
            for metric in METRICS:
                values = [float(r[metric]) for r in group]
                metrics[metric] = {'mean': statistics.mean(values), 'sd': statistics.stdev(values), 'best': max(values) if metric == 'util' else min(values), 'worst': min(values) if metric == 'util' else max(values)}
            result.append({'n': n, 'algorithm': algorithm, 'runs': len(group), 'evaluations': int(group[0]['evaluations']), 'metrics': metrics})
    return {'rows': result, 'rawFile': str(path.relative_to(ROOT)), 'rawSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'assignmentFile': str((directory/'controlled-assignments.jsonl').relative_to(ROOT)), 'maxModelGapPct': max(float(r['modelGapPct']) for r in rows), 'successfulRuns': len(rows)}

def main():
    cohorts = {'tuned': aggregate(OUT, ['hybrid-aco','aco','gwo','hybrid-ga']), 'equal-search': aggregate(OUT/'equal-search', ['hybrid-aco','aco','gwo'])}
    data = {'schema': 1, 'kind': 'controlled-new-runs', 'date': '2026-11-26', 'seeds': list(range(1,11)), 'sdDefinition': 'sample standard deviation, ddof=1; whiskers are mean ± SD, not confidence intervals', 'simulator': 'CloudSim 3.0.3', 'vmMips': [500,1000,1500,2000,2500]*2, 'vmPes': [1]*10, 'datacenters': 1, 'hosts': 10, 'totalMips': 15000, 'hardware': 'Intel Core i5-10310U, 8 logical CPUs; Ubuntu WSL2; OpenJDK 21.0.13.1; sequential runs; -Xms256m -Xmx1536m', 'cohorts': cohorts, 'units': {'ms':'s','doi':'dimensionless','util':'%','time':'ms','cost':'USD/model'}, 'sources': {'hybrid':'2c0dd4b97489b4bc147e28d01bfa0acd9c37c80b','meta':'ded59903791064cc8f7084fbc3b74ac31aa363b3'}, 'definitions': {'ms':'max Cloudlet finish − first Cloudlet start; common startup offset excluded', 'doi':'(max VM accumulated CPU time − min) / (mean + 1e-9)', 'util':'100 × sum VM CPU time / (makespan × 10 + 1e-9)', 'cost':'sum actual CPU seconds × 3 USD/s', 'time':'wall-clock System.nanoTime around common input preparation and original search; CloudSim excluded'}, 'budgetNote':'Tuned: hybrid ACO 1250 ant candidates + 1 seed evaluation, standalone ACO 2000, GWO 1300; optional hybrid GA 10151 fitness calls (1450 children plus tournament reuse). Equal-search: 1250 stochastic candidates each; hybrid retains one extra seed evaluation and Max-Min construction. Not a pure seeding ablation.'}
    (OUT/'controlled.json').write_text(json.dumps(data, indent=2)+'\n')
    for cohort, values in cohorts.items():
        rows = values['rows']
        by = {(r['n'], r['algorithm']): r for r in rows}
        counts = {a: sum(by[n,'hybrid-aco']['metrics']['ms']['mean'] < by[n,a]['metrics']['ms']['mean'] for n in range(100,1001,100)) for a in ['aco','gwo']}
        print(cohort, values['successfulRuns'], 'runs; hybrid makespan wins:', counts, 'max model gap %:', values['maxModelGapPct'])

if __name__ == '__main__':
    main()
