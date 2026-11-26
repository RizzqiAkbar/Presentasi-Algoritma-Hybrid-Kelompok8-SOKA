import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, generate, etc } from '../engine/scenario.js';
import { schedule } from '../engine/metrics.js';
import { run } from '../engine/run.js';
import { ManualSchedule, training, supported, demoSteps, stepMapping, comparison, enumerate } from '../cloud-ops/adapter.js';
import { describe } from '../cloud-ops/lessons.js';
import { Lifetime } from '../cloud-ops/lifecycle.js';
import { AudioSystem } from '../cloud-ops/audio.js';

test('3D: all eight practice mappings have independently checked loads and metrics', () => {
  const matrix = etc(training());
  const rows = [
    [[0,0,0], [16,0],16,2,50], [[0,0,1],[8,5],8,6/13,81.25],
    [[0,1,0],[10,3],10,14/13,65], [[0,1,1],[2,8],8,1.2,62.5],
    [[1,0,0],[14,4],14,10/9,100*18/28], [[1,0,1],[6,9],9,.4,100*15/18],
    [[1,1,0],[8,7],8,2/15,93.75], [[1,1,1],[0,12],12,2,50]
  ];
  for (const [mapping, loads, ms, doi, utilization] of rows) {
    const manual = new ManualSchedule(training()); mapping.forEach((vm, t) => { assert.equal(manual.pick(t), true); assert.equal(manual.drop(vm), true); });
    assert.equal(manual.complete, true); const actual = manual.metrics;
    assert.deepEqual(actual.loads, loads); assert.equal(actual.makespan, ms);
    assert.ok(Math.abs(actual.doi - doi) < 1e-8); assert.ok(Math.abs(actual.utilization - utilization) < 1e-8);
    assert.deepEqual(actual, schedule(mapping, matrix));
  }
  assert.deepEqual(enumerate(matrix), {count:8,makespan:8});
});
test('3D: pickup, reallocation, tray and reset retain one assignment per task', () => {
  const m = new ManualSchedule(training()); assert.equal(m.drop(0), false);
  m.pick(0); assert.equal(m.pick(1), false); m.drop(1); m.pick(1); m.drop(1); m.pick(2); m.drop(0);
  assert.deepEqual(m.metrics.loads,[8,7]); m.pick(0); assert.equal(m.complete,false); m.drop(0);
  assert.deepEqual(m.mapping,[0,1,0]); assert.deepEqual(m.metrics.loads,[10,3]);
  m.pick(0); m.tray(); assert.equal(m.mapping[0],-1); assert.equal(m.held,null);
  m.reset(); assert.deepEqual(m.mapping,[-1,-1,-1]); assert.equal(m.metrics.assigned,0);
});
test('3D: limits reject entire oversized scenarios and preserve complete imported data', () => {
  const s = generate({tasks:12,vms:6,hosts:3}); const before = structuredClone(s);
  assert.equal(supported(s),''); assert.deepEqual(s,before);
  assert.match(supported(generate({tasks:13})),/13 task/);
  assert.match(supported(generate({vms:7})),/7 VM/);
  assert.equal(enumerate(etc(generate({tasks:12,vms:6}))), null);
});
test('3D: genuine traces, comparisons and final metrics match the 2D engine on custom and imported scenarios', () => {
  for (const scenario of [training(),generate(),generate({tasks:12,vms:6,hosts:3,seed:42})]) {
    const parameters = {...defaults,ants:7,iterations:5,population:8,generations:5};
    const results = Object.fromEntries(['aco','ga'].map(a=>[a,run(scenario,parameters,a)]));
    for (const r of Object.values(results)) {
      const m = new ManualSchedule(scenario), steps = demoSteps(r);
      assert.equal(steps.at(-1).event.type,'final');
      for (const step of steps) {
        assert.equal(r.events[step.index],step.event); m.apply(stepMapping(step),step.event.phase==='heuristic'?step.event.order:undefined);
        assert.deepEqual(m.mapping,stepMapping(step));
        if (step.event.type==='allocate') assert.deepEqual(m.order.flat().sort((a,b)=>a-b),step.event.order.toSorted((a,b)=>a-b));
      }
      assert.deepEqual(m.metrics,r.final); assert.deepEqual(m.mapping,r.best);
    }
    const rows = comparison(results.aco.best,results,etc(scenario));
    assert.deepEqual(rows[3].loads,results.aco.final.loads); assert.deepEqual(rows[4].loads,results.ga.final.loads);
  }
});
test('3D: same makespan does not replace seed mapping for better DoI', () => {
  const s = training(), aco = run(s,defaults,'aco'), ga = run(s,defaults,'ga');
  assert.deepEqual(aco.best,aco.heuristic); assert.deepEqual(ga.best,ga.heuristic);
  assert.equal(aco.final.makespan,8); assert.equal(ga.final.makespan,8);
  const betterBalance = schedule([1,1,0],etc(s)); assert.ok(betterBalance.doi < aco.final.doi);
  assert.match(describe(demoSteps(aco).at(-1),aco,defaults).text,/Tidak ada perbaikan/);
});
test('3D: gene inheritance and mutation copy actual operation data including absent and no-op operations', () => {
  const s = training();
  for (const p of [{...defaults,crossover:0,mutation:0},{...defaults,crossover:1,mutation:1}]) {
    const r = run(s,p,'ga'), steps = demoSteps(r);
    for (const step of steps.filter(s=>['crossover','mutation'].includes(s.event.type))) {
      const op=step.event.operations[step.operation], lesson=describe(step,r,p);
      assert.deepEqual(stepMapping(step),step.event.type==='crossover'?op.crossed:op.child);
      if (step.event.type==='crossover') {
        assert.deepEqual(op.crossed,op.a.mapping.map((vm,t)=>op.point!==null&&t>=op.point?op.b.mapping[t]:vm));
        if (op.point===null) assert.match(lesson.text,/tidak terpicu/);
      } else if (!op.mutations.some(m=>m.old!==m.value)) assert.match(lesson.text,/tidak ada gen yang berubah/);
    }
  }
});
test('3D: reset/exit resolve outstanding waits and dispose listeners once', async () => {
  const life = new Lifetime(), target = new EventTarget(); let calls=0,cleanups=0;
  life.listen(target,'demo',()=>calls++); life.add(()=>cleanups++);
  const first=life.wait(10000), second=life.wait(10000); life.cancel();
  assert.deepEqual(await Promise.all([first,second]),[false,false]); assert.equal(life.jobs.size,0);
  target.dispatchEvent(new Event('demo')); assert.equal(calls,1);
  const pending=life.wait(10000); life.dispose(); life.dispose(); assert.equal(await pending,false);
  target.dispatchEvent(new Event('demo')); assert.equal(calls,1); assert.equal(cleanups,1);
  assert.equal(await life.wait(10000),false);
});

test('3D: audio is opt-in, reuses one context, and stops timers/nodes on mute and exit', async t => {
  const original = globalThis.AudioContext; let created = 0, closed = 0, stopped = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ gain:param(),frequency:param(), connect() {},disconnect() {},start() {},stop(time) { if (time===undefined) { stopped++; this.onended?.(); } } });
  globalThis.AudioContext = class {
    constructor() { created++; this.state='suspended'; this.currentTime=0; this.sampleRate=8000; this.destination=node(); }
    createGain(){return node();} createDynamicsCompressor(){return node();} createOscillator(){return node();}
    createBiquadFilter(){return node();} createBufferSource(){return node();}
    createBuffer(_,length){return {getChannelData:()=>new Float32Array(Math.floor(length))};}
    async resume(){this.state='running';} async suspend(){this.state='suspended';} async close(){closed++;this.state='closed';}
  };
  const audio=new AudioSystem(); t.after(async()=>{await audio.dispose();globalThis.AudioContext=original;});
  assert.equal(audio.on,false); assert.equal(created,0); assert.equal(audio.timer,null);
  await audio.enable(); assert.equal(created,1); assert.equal(audio.context.state,'running'); assert.ok(audio.nodes.size>0);
  await audio.disable(); assert.equal(audio.on,false); assert.equal(audio.timer,null); assert.equal(audio.nodes.size,0); assert.ok(stopped>0);
  await audio.enable(); assert.equal(created,1); await audio.dispose(); await audio.dispose();
  assert.equal(closed,1); assert.equal(audio.timer,null); assert.equal(audio.nodes.size,0); assert.equal(await audio.enable(),false);
});
