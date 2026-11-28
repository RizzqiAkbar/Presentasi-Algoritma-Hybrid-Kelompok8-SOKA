"""Import immutable recorded data and verify ordered GoCJ workload equality."""
import csv
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / 'work/academic'
HYBRID = REF / 'hybrid-reference'
META = REF / 'meta-reference'
OUT = ROOT / 'data/benchmarks'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def workload_digest(values):
    return hashlib.sha256(('\n'.join(map(str, values)) + '\n').encode()).hexdigest()

def records(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sources = {
        'hybrid': {'repository': 'https://github.com/RizzqiAkbar/Algoritma-Hybrid-Kelompok-8', 'commit': '2c0dd4b97489b4bc147e28d01bfa0acd9c37c80b', 'file': 'Results/hasil_simulasi_hybrid.csv'},
        'meta': {'repository': 'https://github.com/farelrafli/soka-cloudsim-metaheuristik', 'commit': 'ded59903791064cc8f7084fbc3b74ac31aa363b3', 'file': 'output/hasil_metrik_perbandingan.csv'}
    }
    matches = []
    for n in range(100, 1001, 100):
        h = HYBRID / f'Datasets/GoCJ_Dataset_{n}.json'
        m = META / f'src/main/resources/dataset/GoCJ_Dataset_{n}.txt'
        a = [row['length_mi'] for row in json.loads(h.read_text())]
        b = [int(line) for line in m.read_text().splitlines() if line.strip()]
        assert len(a) == len(b) == n
        matches.append({'n': n, 'hybridFile': str(h.relative_to(HYBRID)), 'metaFile': str(m.relative_to(META)), 'hybridSha256': sha(h), 'metaSha256': sha(m), 'orderedEqual': a == b, 'hybridWorkloadSha256': workload_digest(a), 'metaWorkloadSha256': workload_digest(b), 'totalMI': sum(a)})
    result = {'schema': 1, 'sources': sources, 'datasetAudit': matches, 'hybrid': [], 'meta': [], 'units': {'ms': 's', 'doi': 'dimensionless', 'util': '%', 'cost': 'USD/model', 'time': 'ms', 'imbalanceSd': 's', 'throughput': 'task/s', 'gap': '%'}}
    for kind, reference in [('hybrid', HYBRID), ('meta', META)]:
        path = reference / sources[kind]['file']
        sources[kind]['sha256'] = sha(path)
        sources[kind]['kind'] = 'historical-single-run'
        (OUT / f'{kind}-historical.csv').write_bytes(path.read_bytes())
        for row in records(path):
            if kind == 'hybrid':
                result[kind].append({'n': int(row['N_Task']), 'dataset': row['Dataset'], 'algorithm': 'hybrid-aco' if 'ACO' in row['Algoritma'] else 'hybrid-ga', 'originalAlgorithm': row['Algoritma'], 'ms': float(row['Makespan_s']), 'doi': float(row['Degree_of_Imbalance']), 'util': float(row['Resource_Utilization_pct']), 'cost': float(row['Total_Cost_USD']), 'time': float(row['Algo_Execution_Time_ms']), 'throughput': float(row['Throughput_tps']), 'runs': 1})
            else:
                result[kind].append({'n': int(row['N_Task']), 'dataset': f"GoCJ_Dataset_{row['N_Task']}.txt", 'algorithm': row['Algoritma'].lower(), 'ms': float(row['Makespan_Aktual']), 'predictedMs': float(row['Prediksi_Makespan']), 'gap': float(row['Gap_Persen']), 'throughput': float(row['Throughput']), 'util': float(row['Utilization_Persen']), 'imbalanceSd': float(row['Imbalance']), 'cost': float(row['Total_Cost']), 'time': None, 'doi': None, 'runs': 1})
    result['units']['cost'] = 'source-dependent: hybrid USD; meta model cost unit (currency not stated)'
    sources['hybrid']['costUnit'] = 'USD'
    sources['meta']['costUnit'] = 'model cost unit; currency not stated in Java/CSV'
    (OUT / 'historical.json').write_text(json.dumps(result, indent=2) + '\n')
    specs = json.loads((REF / 'meta-infrastructure.json').read_text())
    logged = re.findall(r'VM\s+(\d+)\s+-> MIPS:\s*(\d+)\s*, PEs:\s*(\d+)', (META/'output/output_terminal.txt').read_text())
    assert len(logged) == 30
    assert [(int(i),int(m),int(p)) for i,m,p in logged] == [(v['id'],v['mipsPerPe'],v['pes']) for v in specs['vms']]
    fields = {
        'datacenters': [1,3,1], 'hosts': [10,15,10], 'vms': [10,30,10], 'vmPes': ['1', '1–4 (total '+str(specs['vmTotalPes'])+')', '1 (total 10)'],
        'vmMips': ['random choices 500/1000/1500/2000/2500 per dataset, exact draws not logged', 'Java Random(99); per-PE MIPS and PE arrays attached', '[500,1000,1500,2000,2500] repeated twice'],
        'vmTotalMips': ['unknown per historical run; VM MIPS/seed not recorded', specs['vmTotalMips'],15000],
        'hostCapacity': ['10 hosts × 1 PE × 100000 MIPS', specs['hostTotalMips'], '10 hosts × 1 PE × 100000 MIPS'],
        'vmScheduler': ['VmSchedulerTimeShared']*3, 'cloudletScheduler': ['CloudletSchedulerSpaceShared']*3,
        'arrival': ['all submitted in one batch, no submission delay']*3, 'taskPes': [1,1,1], 'cpuUtilization': ['UtilizationModelFull','UtilizationModelDynamic(1.0)','UtilizationModelFull'],
        'execution': ['one concurrent task per VM','earliest available PE in selected VM; 1–4 concurrent single-PE tasks','one concurrent task per VM'],
        'objective': ['maximum sum ETC per VM','maximum PE completion time under dataset order','same single-PE completion-time objective for all search methods'],
        'simulator': ['CloudSim 3.0.3','CloudSim Plus 8.0.0','CloudSim 3.0.3'],
        'seeds': ['SecureRandom.nextLong XOR nanoTime per dataset, same seed for the two hybrids; not saved', 'host=42, VM=99, algorithm=42', 'algorithm seeds 1–10, fixed common MIPS; warm-up seed 42 excluded'],
        'runsPerDatasetAlgorithm': [1,1,10],
        'parameters': ['hybrid ACO:25×50 α1 β2 ρ.2 Q100; GA:30×50 tournament3 Pc.8 Pm.05','ACO:20×100 α1 β2 ρ.2 τ0=1 bounds.01–10 Q=lowerBound; GWO:50×25','tuned original parameters plus optional equal-search ACO25×50/GWO50×24; hybrid unchanged'],
        'evaluations': ['ACO1251 including seed; GA10151 fitness calls including tournament reuse', 'ACO2000, GWO1300', 'tuned same counts; equal-search 1250 stochastic candidates + hybrid one seed'],
        'makespan': ['maximum absolute Cloudlet finish', 'maximum absolute Cloudlet finish', 'last finish minus first start; original absolute finish and first start also recorded'],
        'imbalance': ['(max accumulated VM CPU − min)/(mean+1e-9), dimensionless', 'population SD of per-VM maximum finish time, seconds; idle VM finish=0', 'same DoI formula as hybrid, all 10 VMs included'],
        'utilization': ['100×total CPU time/(makespan×VM count+1e-9)', '100/VM count × sum[sum(task MI/MIPS)/(PE count×actual makespan)]', '100×total CPU time/(normalized span×10+1e-9)'],
        'cost': ['total actual CPU seconds×3 USD/s', 'sum VM finish×VM per-PE MIPS×PE count×0.00001; no runtime column', 'total actual CPU seconds×3 USD/s'],
        'runtime': ['System.nanoTime around hybrid search, excludes ETC build and CloudSim', 'not recorded in final CSV; tuning outputs contain candidate quality, not runtime', 'System.nanoTime around common input preparation and original search, excludes CloudSim; sequential rotated order, one warm-up per method/cohort'],
        'environment': ['hardware/JVM flags not recorded; pom targets Java17', 'hardware/JVM flags not recorded; pom targets Java17', 'Intel Core i5-10310U, WSL2 Ubuntu, OpenJDK21.0.13.1, Xms256m Xmx1536m'],
        'workloadOrder': ['length_mi in JSON appearance order','one MI integer per TXT line','same JSON appearance order; all 10 parsed sequences match TXT exactly']
    }
    compatibility = {'schema':1,'columns':['historicalHybrid','historicalMeta','controlled'], 'fields':fields, 'metaInfrastructure':specs, 'datasetAudit':matches, 'week3Note':'Only cross-repository equality verified. No separate Week 3 archival dataset or cross-class algorithm registry was supplied.', 'historicalMetaFinalParametersFileSha256':sha(META/'output/parameter_terpilih.txt'), 'sourceCodeSha256':{str(p.relative_to(reference)):sha(p) for reference,p in [(HYBRID,HYBRID/'Hybrid.java'),(META,META/'src/main/java/org/example/Main.java'),(META,META/'src/main/java/org/example/MetaScheduler.java'),(META,META/'src/main/java/org/example/Tuning.java')]}}
    (OUT/'compatibility.json').write_text(json.dumps(compatibility,indent=2)+'\n')
    print(f"Imported {len(result['hybrid'])} hybrid + {len(result['meta'])} meta rows; {sum(r['orderedEqual'] for r in matches)}/10 ordered workloads equal")

if __name__ == '__main__':
    main()
