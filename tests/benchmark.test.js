import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { benchmark } from '../ui/benchmark.js';
const reference=new URL('../work/java-reference/Results/ringkasan_simulasi.txt',import.meta.url);
test('All recorded benchmark values match the original Java summary', {skip:!existsSync(reference)},()=>{
  const rows=readFileSync(reference,'utf8').split('\n').filter(line=>/^\d+\s+\|/.test(line));
  assert.equal(rows.length,10);assert.equal(benchmark.length,10);
  rows.forEach((line,i)=>{
    const columns=line.split('|').map(s=>(s.match(/\d+(?:\.\d+)?/g)||[]).map(Number));
    assert.equal(benchmark[i].n,columns[0][0]);
    ['ms','doi','util','cost','time'].forEach((key,j)=>assert.deepEqual(benchmark[i][key],columns[j+1],`row ${i}, ${key}`));
  });
});
