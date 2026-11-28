import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { algorithms, filterRows, improvement, validateHistorical, validateControlled, selectHybrid, chartPoints, comparisonCounts } from '../ui/academic-data.js';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const historical=JSON.parse(read('data/benchmarks/historical.json'));
const controlled=JSON.parse(read('data/benchmarks/controlled.json'));
const csv = path => {const [header,...lines]=read(path).trim().split(/\r?\n/);const keys=header.split(',');return lines.map(line=>Object.fromEntries(line.split(',').map((value,i)=>[keys[i],value])));};
const digest = value => createHash('sha256').update(value).digest('hex');

test('Academic: byte-faithful historical import, correct algorithms, original units and missing-value policy',()=>{
  assert.equal(validateHistorical(historical),historical);
  for(const kind of ['hybrid','meta'])assert.equal(digest(read(`data/benchmarks/${kind}-historical.csv`)),historical.sources[kind].sha256);
  for(const row of csv('data/benchmarks/meta-historical.csv')){
    const actual=historical.meta.find(r=>r.n===Number(row.N_Task)&&r.algorithm===row.Algoritma.toLowerCase());
    assert.equal(actual.ms,Number(row.Makespan_Aktual));assert.equal(actual.predictedMs,Number(row.Prediksi_Makespan));
    assert.equal(actual.imbalanceSd,Number(row.Imbalance));assert.equal(actual.util,Number(row.Utilization_Persen));assert.equal(actual.cost,Number(row.Total_Cost));
    assert.equal(actual.time,null);assert.equal(actual.doi,null);assert.equal(actual.runs,1);
  }
  const bad=structuredClone(historical);bad.meta[0].doi=bad.meta[0].imbalanceSd;
  assert.throws(()=>validateHistorical(bad),/tidak boleh/);
  assert.throws(()=>chartPoints(historical.meta,['aco','gwo'],'time','all',false),/tidak tersedia/);
});
test('Academic: ordered dataset matching is verified independently from original JSON and TXT when available', {skip:!existsSync(new URL('../work/academic/hybrid-reference/Datasets',import.meta.url))},()=>{
  for(const audit of historical.datasetAudit){
    const h=read('work/academic/hybrid-reference/'+audit.hybridFile),m=read('work/academic/meta-reference/'+audit.metaFile);
    assert.equal(digest(h),audit.hybridSha256);assert.equal(digest(m),audit.metaSha256);
    const a=JSON.parse(h).map(t=>t.length_mi),b=m.trim().split(/\s+/).map(Number);
    assert.deepEqual(a,b);assert.equal(a.length,audit.n);
    assert.equal(digest(a.join('\n')+'\n'),audit.hybridWorkloadSha256);assert.equal(audit.orderedEqual,true);
  }
});
test('Academic: 700 complete controlled runs, original budgets and mathematically correct aggregates',()=>{
  assert.equal(validateControlled(controlled),controlled);
  for(const [policy,cohort] of Object.entries(controlled.cohorts)){
    const rows=csv(cohort.rawFile),keys=new Set(rows.map(r=>`${r.n}/${r.seed}/${r.algorithm}`));
    assert.equal(rows.length,policy==='tuned'?400:300);assert.equal(keys.size,rows.length);
    assert.equal(digest(read(cohort.rawFile)),cohort.rawSha256);
    for(const group of cohort.rows){
      const raw=rows.filter(r=>Number(r.n)===group.n&&r.algorithm===group.algorithm);
      assert.deepEqual(raw.map(r=>Number(r.seed)).sort((a,b)=>a-b),controlled.seeds);
      for(const key of ['ms','doi','util','cost','time']){
        const values=raw.map(r=>Number(r[key])),mean=values.reduce((a,b)=>a+b,0)/10;
        const sd=Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/9);
        assert.ok(Math.abs(mean-group.metrics[key].mean)<1e-8);assert.ok(Math.abs(sd-group.metrics[key].sd)<1e-8);
        assert.equal(group.metrics[key].best,key==='util'?Math.max(...values):Math.min(...values));
        assert.equal(group.metrics[key].worst,key==='util'?Math.min(...values):Math.max(...values));
      }
      const expected=group.algorithm==='hybrid-aco'?1251:policy==='equal-search'?1250:group.algorithm==='aco'?2000:group.algorithm==='gwo'?1300:10151;
      assert.equal(group.evaluations,expected);
    }
  }
});
test('Academic: raw assignments reproduce the actual original search objective on a shared single-PE model',()=>{
  for(const cohort of Object.values(controlled.cohorts)){
    const rows=csv(cohort.rawFile),mappings=read(cohort.assignmentFile).trim().split('\n').map(JSON.parse);
    assert.equal(mappings.length,rows.length);
    for(const mapping of mappings){
      assert.equal(mapping.mapping.length,mapping.n);assert.ok(mapping.mapping.every(v=>Number.isInteger(v)&&v>=0&&v<10));
      const raw=rows.find(r=>Number(r.n)===mapping.n&&Number(r.seed)===mapping.seed&&r.algorithm===mapping.algorithm);
      assert.ok(Number(raw.modelGapPct)<.012);assert.ok(Math.abs(Number(raw.absoluteFinish)-Number(raw.firstStart)-Number(raw.ms))<1e-6);
      const path=new URL(`../work/academic/hybrid-reference/Datasets/GoCJ_Dataset_${mapping.n}.json`,import.meta.url);
      if(existsSync(path)){
        const lengths=JSON.parse(readFileSync(path,'utf8')).map(t=>t.length_mi),loads=Array(10).fill(0);
        mapping.mapping.forEach((vm,t)=>loads[vm]+=lengths[t]/controlled.vmMips[vm]);
        assert.ok(Math.abs(Math.max(...loads)-Number(raw.modelMs))<1e-6);
      }
    }
  }
});
test('Academic: historical and controlled experiments cannot be mixed into a false ranking',()=>{
  assert.throws(()=>validateControlled(historical));assert.throws(()=>comparisonCounts(historical.meta,'aco','gwo','doi'),/terkontrol/);
  const missing=structuredClone(controlled);missing.cohorts.tuned.rows.pop();assert.throws(()=>validateControlled(missing),/tidak lengkap/);
  const invalid=structuredClone(controlled);invalid.units.time='s';assert.throws(()=>validateControlled(invalid),/satuan/);
  assert.equal(historical.sources.hybrid.kind,'historical-single-run');assert.equal(controlled.kind,'controlled-new-runs');
});
test('Academic: filters, chart integrity and computed hybrid selection use real paired data',()=>{
  assert.equal(filterRows(historical.hybrid,'low').length,6);assert.equal(filterRows(historical.hybrid,'mid').length,8);assert.equal(filterRows(historical.hybrid,'high').length,6);
  assert.throws(()=>filterRows([], 'other'));
  assert.deepEqual(selectHybrid(historical.hybrid),{selected:'hybrid-aco',aco:10,ga:0,count:10});
  const flipped=historical.hybrid.map(r=>({...r,ms:r.algorithm==='hybrid-ga'?0:r.ms}));assert.equal(selectHybrid(flipped).selected,'hybrid-ga');
  for(const cohort of Object.values(controlled.cohorts))for(const key of ['ms','doi','util','time','cost']){
    const points=chartPoints(cohort.rows,['hybrid-aco','aco','gwo'],key,'all');assert.equal(points.length,30);
    for(const p of points)assert.equal(p.value,cohort.rows.find(r=>r.n===p.n&&r.algorithm===p.algorithm).metrics[key].mean);
  }
  assert.equal(chartPoints(controlled.cohorts.tuned.rows,['hybrid-aco','aco','gwo'],'ms','low').length,9);
  assert.deepEqual(comparisonCounts(controlled.cohorts.tuned.rows,'hybrid-aco','aco','ms'),{wins:10,losses:0,ties:0,count:10});
  assert.equal(algorithms['hybrid-aco'].color,'#12675e');assert.equal(algorithms['hybrid-ga'].color,'#9c4426');
});
test('Academic: percentage improvements, zero denominators, ties and higher-is-better metrics are correct',()=>{
  assert.equal(improvement(80,100),20);assert.equal(improvement(120,100),-20);assert.equal(improvement(90,80,true),12.5);
  assert.equal(improvement(0,0),null);assert.equal(improvement(null,10),null);assert.equal(improvement(10,Infinity),null);
  const rows=[{n:100,algorithm:'hybrid-aco',metrics:{util:{mean:90}}},{n:100,algorithm:'aco',metrics:{util:{mean:80}}}];
  assert.deepEqual(comparisonCounts(rows,'hybrid-aco','aco','util'),{wins:1,losses:0,ties:0,count:1});
  rows[1].metrics.util.mean=90;assert.equal(comparisonCounts(rows,'hybrid-aco','aco','util').ties,1);
});
test('Academic: 3D, shared engine and laboratory/walkthrough files retain the synchronized baseline hashes', {skip:!existsSync(new URL('../work/academic/protected.sha256',import.meta.url))},()=>{
  for(const line of read('work/academic/protected.sha256').trim().split('\n')){
    const [expected,path]=line.split(/\s+/,2);assert.equal(digest(readFileSync(new URL('../'+path,import.meta.url))),expected,path);
  }
});
