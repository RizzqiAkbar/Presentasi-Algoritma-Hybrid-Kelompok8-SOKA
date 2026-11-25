import test from 'node:test';
import assert from 'node:assert/strict';
import { heuristic } from '../engine/heuristic.js';
import { generate, defaults, validate, etc } from '../engine/scenario.js';
import { probabilities, roulette, aco } from '../engine/aco.js';
import { breed, tournament } from '../engine/ga.js';
import { random } from '../engine/random.js';
import { makespan, schedule } from '../engine/metrics.js';
import { run } from '../engine/run.js';
import { Playback } from '../ui/playback.js';

const small=[[2,4],[6,3],[8,5]],close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
test('Manually verifiable Max-Min / Min-Min with CT updates and strict ties',()=>{
  const max=heuristic(small,'max'),min=heuristic(small,'min');
  assert.deepEqual(max.mapping,[0,0,1]);assert.deepEqual(max.order,[2,1,0]);assert.deepEqual(max.ready,[8,5]);
  assert.deepEqual(min.mapping,[0,1,1]);assert.deepEqual(min.order,[0,1,2]);assert.deepEqual(min.ready,[2,8]);
  const tie=[[1,1],[1,1]];assert.deepEqual(heuristic(tie,'max').mapping,[0,1]);assert.deepEqual(heuristic(tie,'min').mapping,[0,1]);
  const second=max.events.find(e=>e.round===2&&e.type==='evaluate');assert.deepEqual(second.completion,[[2,9],[6,8],[8,10]]);
});
test('Metric definitions include idle VMs and sequential nonoverlapping lanes',()=>{
  const m=schedule([0,0,1],small);close(m.makespan,8);close(m.doi,3/(6.5+1e-9));close(m.utilization,13/(16+1e-9)*100);
  assert.deepEqual(m.slots.map(s=>[s.start,s.end]),[[0,2],[2,8],[0,5]]);
  const idle=schedule([0,0],[[2,1,1],[4,1,1]]);close(idle.doi,6/(2+1e-9));close(idle.utilization,6/(18+1e-9)*100);
  close(schedule([-1,-1],[[1],[2]]).makespan,0);
});
test('ACO probability normalization and roulette boundaries',()=>{
  const p=probabilities([3,1],[2,4],1,2);close(p.reduce((a,b)=>a+b,0),1);close(p[0],(3/(2+1e-6)**2)/(3/(2+1e-6)**2+1/(4+1e-6)**2));
  assert.equal(roulette([.2,.8],0),0);assert.equal(roulette([.2,.8],.2),0);assert.equal(roulette([.2,.8],.20001),1);assert.equal(roulette([1],.9),0);
});
test('ACO seeding, floor, evaporation and global-best-only reinforcement',()=>{
  const p={...defaults,ants:3,iterations:1,rho:1};const a=aco(small,[0,0,1],p,random(8));
  assert.deepEqual(a.events[0].tau,[[3,1],[3,1],[1,3]]);
  const ev=a.events.find(e=>e.type==='evaporate'),rein=a.events.find(e=>e.type==='reinforce');
  assert.ok(ev.tau.flat().every(x=>x===.01));rein.tau.forEach((row,t)=>row.forEach((x,v)=>close(x,.01+(a.best[t]===v?100/makespan(a.best,small):0))));
  a.events.find(e=>e.type==='evaluation').candidates.forEach(c=>close(c.ms,makespan(c.mapping,small)));
});
test('GA exact crossover, mutation including no-op, and tournament',()=>{
  const draws=[0,.5,0,.9,0,.1,0,.5,0,.9],rng=()=>draws.shift();
  const child=breed([0,0,0,0],[1,1,1,1],2,{crossover:1,mutation:1},rng);
  assert.equal(child.point,2);assert.deepEqual(child.crossed,[0,0,1,1]);assert.deepEqual(child.child,[1,0,1,1]);assert.equal(child.mutations.length,4);
  const pick=tournament([[0,0],[1,1]],[[10,1],[10,1]],3,()=>.9);assert.equal(pick.winner,1);
});
test('Scenario model, custom ETC isolation and invalid capacity/placement/parameters',()=>{
  const s=generate({tasks:3,vms:2,hosts:1});assert.equal(etc(s)[0][0],s.tasks[0].mi/s.vms[0].mips);
  s.mode='custom';s.custom=small;assert.deepEqual(etc(s),small);s.tasks[0].mi=100;assert.deepEqual(etc(s),small);
  s.vms[0].host=1;assert.throws(()=>validate(s),/Host VM/);s.vms[0].host=0;s.hosts[0].capacity=1;assert.throws(()=>validate(s),/reservasi/);
  assert.throws(()=>validate(generate(),{...defaults,mutation:NaN}),/mutation/);
  const invalid=generate();invalid.tasks[0].mi=0;assert.throws(()=>validate(invalid),/MI task/);
  invalid.tasks[0].mi=1;invalid.seed=-1;assert.throws(()=>validate(invalid),/Seed/);
});
for(const algorithm of ['aco','ga']){
  test(`${algorithm}: seed reproducibility, assignment validity, complete traces and global best invariants`,()=>{
    for(const shape of [{hosts:1,vms:1,tasks:1},{hosts:1,vms:1,tasks:7},{hosts:3,vms:6,tasks:12},{hosts:2,vms:4,tasks:30,workload:'uniform',heterogeneous:false}]){
      const s=generate(shape),p={...defaults,iterations:8,generations:8},r=run(s,p,algorithm),again=run(s,p,algorithm);
      assert.deepEqual(r.best,again.best);assert.deepEqual(r.history,again.history);assert.deepEqual(r.events,again.events);
      assert.equal(r.final.slots.length,s.tasks.length);assert.equal(new Set(r.final.slots.map(s=>s.task)).size,s.tasks.length);
      assert.ok(r.best.every(v=>Number.isInteger(v)&&v>=0&&v<s.vms.length));assert.ok(r.final.makespan<=r.initial.makespan);
      for(let i=1;i<r.history.length;i++)assert.ok(r.history[i].best<=r.history[i-1].best);
      assert.equal(r.phases.length,7);assert.equal(r.events.filter(e=>e.type==='allocate').length,s.tasks.length);
      if(s.vms.length===1)close(r.final.makespan,s.tasks.reduce((sum,t)=>sum+t.mi/s.vms[0].mips,0));
      r.events.filter(e=>e.type==='elitism').forEach(e=>assert.deepEqual(e.population[0],e.elite));
    }
  });
  test(`${algorithm}: 100 tasks, 24 VMs and 8 hosts remain valid`,()=>{
    const s=generate({tasks:100,vms:24,hosts:8}),r=run(s,defaults,algorithm);assert.equal(r.final.slots.length,100);assert.ok(Number.isFinite(r.final.doi));assert.ok(r.events.length>500);
  });
}
test('Playback stepping, phase-safe seek, interruption and single timer',async()=>{
  const p=new Playback(()=>{});p.setTrace([{phase:'setup'},{phase:'heuristic',type:'evaluate'},{phase:'heuristic',type:'allocate'},{phase:'final'}]);
  p.step(1);assert.equal(p.index,1);p.step(1);assert.equal(p.index,2);p.mode='detail';p.step(-1);assert.equal(p.index,1);
  p.seek(999);assert.equal(p.index,3);p.setSpeed(1000);p.play();p.pause();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(p.index,0);assert.equal(p.playing,false);
  p.play();p.play();p.pause();p.seek(-99);assert.equal(p.index,0);
});
