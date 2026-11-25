import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { heuristic } from '../engine/heuristic.js';
import { aco } from '../engine/aco.js';
import { ga } from '../engine/ga.js';
import { defaults } from '../engine/scenario.js';
import { random } from '../engine/random.js';
const matrices=[[[2,4],[6,3],[8,5]],[[5,2,8],[3,9,2],[6,4,3],[9,7,2],[1,8,6],[4,3,5]],[[3],[5],[1]],[[1,1],[1,1],[1,1]]];
const reference=JSON.parse(readFileSync(new URL('../work/java-parity.json',import.meta.url),'utf8'));
for(const row of reference){
  const et=matrices[row.matrix],max=heuristic(et,'max').mapping,min=heuristic(et,'min').mapping;
  const actual=row.method==='runMaxMin'?max:row.method==='runMinMin'?min:row.method==='scheduleHybridMaxMinACO'?aco(et,max,defaults,random(row.seed)).best:ga(et,min,defaults,random(row.seed)).best;
  assert.deepEqual(actual,row.mapping,`${row.method}, matrix ${row.matrix}, seed ${row.seed}`);
}
console.log(`${reference.length} original Java method comparisons passed (shared draw adapter).`);
