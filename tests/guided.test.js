import test from 'node:test';
import assert from 'node:assert/strict';
import { guidedStops } from '../ui/guided.js';
import { Playback } from '../ui/playback.js';
import { run } from '../engine/run.js';
import { generate, defaults } from '../engine/scenario.js';
import { compareCandidate, phaseTerms, lesson } from '../ui/learning.js';

for(const algorithm of ['aco','ga']) {
  test(`${algorithm}: guided stops retain phase boundaries, first lifecycle and final result without changing trace`,()=>{
    const result=run(generate(),defaults,algorithm),before=JSON.stringify(result.events),indices=guidedStops(result.events);
    assert.deepEqual(indices,[...new Set(indices)].sort((a,b)=>a-b));
    assert.equal(indices[0],0);assert.equal(indices.at(-1),result.events.length-1);
    result.phases.forEach(phase=>assert.ok(indices.includes(phase.index)));
    const lifecycle=algorithm==='aco'?['explore','evaluation','evaporate','reinforce']:['fitness','selection','crossover','mutation','elitism'];
    lifecycle.forEach(type=>assert.ok(indices.some(i=>result.events[i].type===type&&result.events[i].iteration===1),type));
    assert.ok(indices.length<50);assert.equal(JSON.stringify(result.events),before);
  });
}
test('Guided navigation resumes around an arbitrary advanced event without resetting playback position',()=>{
  const p=new Playback(()=>{}),result=run(generate(),defaults,'aco');
  assert.deepEqual(p.guidedIndices,[]);
  p.setTrace(result.events);const index=result.events.findIndex(e=>e.iteration===7&&e.type==='evaluation');p.seek(index);
  p.mode='guided';assert.equal(p.index,index);
  const next=p.nextIndex(1),previous=p.nextIndex(-1);assert.ok(next>index);assert.ok(previous<index);
  assert.ok(p.guidedIndices.includes(next));assert.ok(p.guidedIndices.includes(previous));
  p.mode='detail';assert.equal(p.nextIndex(1),index+1);assert.equal(p.index,index);
});
test('Large guided scenarios are summarized; all calculations remain available',()=>{
  const result=run(generate({tasks:100,vms:24,hosts:8}),defaults,'ga'),indices=guidedStops(result.events);
  assert.equal(result.final.slots.length,100);assert.ok(indices.length<50);
  assert.ok(result.events.length>500);assert.ok(indices.some(i=>result.events[i].iteration===50));
});
test('Learning assistance distinguishes better, worse and equal candidates and follows active phase',()=>{
  assert.match(compareCandidate(9,10),/lebih baik/);assert.match(compareCandidate(11,10),/lebih buruk/);assert.match(compareCandidate(10,10),/sama/);
  assert.deepEqual(phaseTerms({phase:'seed'},'aco'),['Seed feromon','Feromon']);
  assert.deepEqual(phaseTerms({phase:'optimize',type:'mutation'},'ga'),['Mutasi','Kromosom']);
  const s=generate(),r=run(s,defaults,'aco'),e=r.events.find(e=>e.type==='choose');
  const explanation=lesson(e,s,r,defaults);
  assert.ok(explanation.includes(`T${e.chosen.task+1}`));assert.ok(explanation.includes(`VM${e.chosen.vm+1}`));
  assert.match(explanation,/terbesar/);
});
