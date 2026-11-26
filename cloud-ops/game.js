import { defaults } from '../engine/scenario.js';
import { ManualSchedule, training, supported, demoSteps, stepMapping, comparison, enumerate, fmt } from './adapter.js?v=cloud-3';
import { Lifetime } from './lifecycle.js';
import { AudioSystem } from './audio.js';
import { describe } from './lessons.js?v=cloud-6';

const $ = id => document.getElementById(id), life = new Lifetime(), audio = new AudioSystem();
let imported, world, model, results, worker, workerId = 0, scenario, parameters;
let mode = 'manual', steps = [], index = 0, playing = false, token = 0, focusKey = '', leaving = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const isReduced = () => reduced.matches || $('reduce').checked;
try { imported = JSON.parse(sessionStorage.getItem('cloud-ops:lab')); } catch {}
parameters = { ...defaults, ...imported?.parameters };
const importError = imported?.scenario ? supported(imported.scenario, parameters) : 'Buka melalui tombol Simulasi 3D di laboratorium untuk mengimpor konfigurasi aktif.';
$('import-note').textContent = importError || `Tersedia: ${imported.scenario.tasks.length} task, ${imported.scenario.vms.length} VM, ${imported.scenario.hosts.length} host. Seluruh MI, MIPS, placement, ETC, seed, dan parameter akan dipakai tanpa pemotongan.`;
$('scenario').querySelector('[value=lab]').disabled = !!importError;

function hint(text) { if ($('hint').textContent !== text) $('hint').textContent = text; }
function stopPlayback() { playing = false; token++; life.cancel(); world?.cancelMotion(); if (world) world.paused = false; $('play').textContent = 'Putar'; }
function audioLabel() { $('audio').textContent = audio.on ? 'Audio: nyala' : 'Audio: mati'; $('audio').setAttribute('aria-pressed', String(audio.on)); }
async function toggleAudio() {
  try { if (audio.on) await audio.disable(); else await audio.enable(); } catch (e) { hint(e.message); }
  audioLabel();
}
async function dispose() {
  if (leaving) return; leaving = true;
  stopPlayback(); worker?.terminate(); world?.dispose(); life.dispose(); await audio.dispose();
  document.body.dataset.disposed = 'true';
}
async function returnToPresentation() {
  await dispose();
  if (parent !== window) parent.postMessage({ type: 'cloud-ops:close' }, location.origin);
  else location.href = '../#4';
}
life.listen($('return'), 'click', returnToPresentation);
life.listen($('fallback').querySelector('a'), 'click', event => { if (parent !== window) { event.preventDefault(); returnToPresentation(); } });
life.listen(window, 'message', async event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'cloud-ops:dispose') return;
  await dispose(); parent.postMessage({ type: 'cloud-ops:disposed' }, location.origin);
});
life.listen(window, 'pagehide', dispose);
if (parent !== window) parent.postMessage({ type: 'cloud-ops:ready' }, location.origin);
life.listen(window, 'keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); if ($('results').open) $('results').close(); else returnToPresentation(); return; }
  if (event.target.closest('button,select,input,a,summary')) return;
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  if (key === 'm' && !event.repeat) toggleAudio();
  if (key === 'r' && !event.repeat) reset();
  if ((key === 'e' || key === ' ') && !event.repeat) interact();
  if (world && mode === 'manual') {
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) { world.cancelMotion(); world.keys.add(key); }
  }
});
life.listen(window, 'keyup', e => world?.keys.delete(e.key.toLowerCase()));
function loseFocus() {
  world?.keys.clear(); world?.velocity.set(0, 0, 0);
  if (playing) { playing = false; token++; life.cancel(); $('play').textContent = 'Putar'; }
  if (world) world.paused = true;
  updateMetrics();
  audio.disable().then(audioLabel);
}
life.listen(window, 'blur', loseFocus);
life.listen(window, 'focus', () => { if (world && mode === 'manual' && !document.hidden) world.paused = false; });
life.listen(document, 'visibilitychange', () => { if (document.hidden) { loseFocus(); world?.suspend(); } else world?.start(); });

function updateMetrics() {
  if (!model || !world) return;
  const m = model.metrics;
  $('makespan').textContent = `${fmt(m.makespan)} s`; $('doi').textContent = fmt(m.doi); $('utilization').textContent = `${fmt(m.utilization)}%`;
  $('loads').innerHTML = m.loads.map((load, vm) => `<div class="load"><span>VM${vm + 1}${load === 0 ? ' · belum digunakan' : ''}</span><b>${fmt(load)} s</b></div>`).join('');
  $('assignment-count').textContent = `${m.assigned} / ${model.et.length} task dijadwalkan`;
  $('run').disabled = !model.complete || playing || !results;
  $('run').textContent = world.execution ? (world.paused ? 'Lanjutkan eksekusi' : 'Jeda eksekusi') : 'Jalankan';
  focusKey = '';
}
function manualHint(focus) {
  if (!model || mode !== 'manual' || world.execution || world.paused) return;
  const key = JSON.stringify(focus) + model.held + model.mapping.join(','); if (key === focusKey) return; focusKey = key;
  const held = model.held, m = model.metrics;
  if (held !== null) {
    if (focus.type === 'lane') {
      const vm = focus.vm, projected = m.loads[vm] + model.et[held][vm];
      hint(`E: taruh T${held + 1} di VM${vm + 1}. Durasi ${fmt(model.et[held][vm])} s; beban menjadi ${fmt(projected)} s.${projected > Math.max(...m.loads.filter((_, i) => i !== vm), 0) ? ' VM ini akan memiliki beban terbesar.' : ''}`);
    } else if (focus.type === 'tray') hint(`E: kembalikan T${held + 1} ke antrean.`);
    else hint(`Bawa T${held + 1} ke jalur VM. ${model.et[held].map((v, vm) => `VM${vm + 1}: ${fmt(v)} s`).join(' · ')}.`);
  } else if (focus.type === 'task') hint(`E: ambil T${focus.task + 1}${model.mapping[focus.task] >= 0 ? ' untuk dipindahkan' : ''}. ${model.et[focus.task].map((v, vm) => `VM${vm + 1}: ${fmt(v)} s`).join(' · ')}.`);
  else if (focus.type === 'pad') hint(`E: ${focus.title}.`);
  else if (model.complete) hint('Semua task sudah dijadwalkan. Klik Jalankan untuk melihat eksekusi paralel.');
  else hint(`Dekati kotak task, tekan E untuk mengambilnya, lalu bawa ke VM. ${model.et.length - m.assigned} task belum dijadwalkan.`);
}
function interact() {
  if (!world || mode !== 'manual' || world.execution || !results) return;
  world.paused = false; world.cancelMotion(); const f = world.nearest();
  if (model.held !== null) {
    if (f.type === 'lane') { model.drop(f.vm); audio.effect('drop'); }
    else if (f.type === 'tray') { model.tray(); audio.effect('drop'); }
    else { hint('Dekati jalur VM atau antrean sebelum menaruh task.'); return; }
  } else if (f.type === 'task') { model.pick(f.task); audio.effect('pick'); }
  else if (f.type === 'pad') { if (f.action === 'reset') reset(); else if (f.action === 'run') execute(); else watch(f.action); return; }
  world.stopExecution(); world.retarget();
}
function reset() {
  if (!world) return; stopPlayback(); world.stopExecution(); world.clearAnts(); model.reset();
  mode = 'manual'; steps = []; index = 0; world.mode = mode; world.visualHeld = null;
  world.robot.position.set(-5.5, .8, 0); world.keys.clear(); world.paused = false;
  if ($('results').open) $('results').close(); $('demo-controls').hidden = true;
  $('phase-title').textContent = 'Susun jadwal Anda'; $('explanation').textContent = 'Pilih VM untuk setiap task. Waktu robot berjalan tidak masuk makespan.'; $('operation').innerHTML = ''; $('trace-details').textContent = '';
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  world.retarget(true); $('world').focus();
}
function renderLesson() {
  const step = steps[index], r = results[mode], lesson = describe(step, r, parameters);
  $('phase-title').textContent = step.event.title; $('explanation').textContent = lesson.text; $('operation').innerHTML = lesson.genes;
  $('trace-details').textContent = lesson.detail;
  if (step.event.operations && ['selection', 'crossover', 'mutation'].includes(step.event.type)) {
    const label = document.createElement('label'); label.htmlFor = 'operation-select'; label.textContent = 'Operasi anak yang ditampilkan';
    const select = document.createElement('select'); select.id = 'operation-select';
    step.event.operations.forEach((_, i) => { const option = document.createElement('option'); option.value = i; option.textContent = `Anak ${i + 1}`; select.append(option); }); select.value = step.operation;
    select.onchange = () => { stopPlayback(); step.operation = Number(select.value); showStep(index, true); };
    $('trace-details').append(label, select);
  }
  $('step-count').textContent = `Langkah ${index + 1} / ${steps.length} · event asli ${step.index + 1} / ${r.events.length}. Tampilan perwakilan; seluruh ${mode === 'aco' ? parameters.ants + ' semut × ' + parameters.iterations + ' iterasi' : parameters.population + ' kromosom × ' + parameters.generations + ' generasi'} dihitung.`;
  $('next').disabled = index >= steps.length - 1;
}
async function showStep(next, animate = true) {
  if (!results || !steps[next]) return false;
  index = next; world.stopExecution(); renderLesson(); world.clearAnts();
  const step = steps[index], e = step.event;
  if (mode === 'aco') world.showAnt(e);
  const mapping = stepMapping(step), order = e.phase === 'heuristic' ? e.order : undefined;
  if (animate) return world.transition(mapping, order);
  world.cancelMotion(); model.apply(mapping, order); world.retarget(true); return true;
}
async function watch(algorithm) {
  if (!results) return;
  stopPlayback(); world.stopExecution(); model.reset(); world.retarget(true); mode = algorithm; world.mode = mode; world.paused = false;
  steps = demoSteps(results[mode]); index = 0; $('demo-controls').hidden = false;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  await showStep(0, false); hint('Putar untuk mengikuti trace asli, Berikutnya untuk satu keputusan, atau Lewati ke hasil.');
}
async function play() {
  if (!world || mode === 'manual') return;
  if (playing) { playing = false; token++; life.cancel(); world.paused = true; $('play').textContent = 'Putar'; hint('Demonstrasi dijeda. Putar untuk melanjutkan; Berikutnya untuk satu langkah.'); return; }
  if (index === steps.length - 1) await showStep(0, false);
  world.paused = false; playing = true; const active = ++token; $('play').textContent = 'Jeda'; updateMetrics();
  hint('Demonstrasi memakai event engine asli. Putar/Jeda mengendalikan robot dan langkah algoritma.');
  // A paused movement resumes before the next event; no pending setTimeout survives reset/exit.
  while (playing && active === token) {
    if (world.motion) { if (!await life.wait(50)) break; continue; }
    if (!await life.wait(isReduced() ? 160 : 1200 / world.speed) || active !== token || !playing) break;
    if (index >= steps.length - 1) { playing = false; break; }
    const ok = await showStep(index + 1, true);
    if (!ok || active !== token) break;
  }
  if (active === token) { playing = false; $('play').textContent = 'Putar'; updateMetrics(); }
}
function next() { if (mode === 'manual' || !results) return; stopPlayback(); world.paused = false; showStep(Math.min(index + 1, steps.length - 1), true); updateMetrics(); }
function skip() { if (mode === 'manual' || !results) return; stopPlayback(); world.paused = false; showStep(steps.length - 1, true); updateMetrics(); }
function execute() {
  if (!world || !results) return;
  if (!model.complete) { hint('Jadwalkan semua task sebelum menjalankan eksekusi. Ambil task di antrean dan taruh pada VM.'); return; }
  if (world.execution) { world.paused = !world.paused; updateMetrics(); hint(world.paused ? 'Eksekusi dijeda. Lanjutkan eksekusi untuk meneruskan waktu komputasi.' : 'Eksekusi dilanjutkan.'); return; }
  stopPlayback(); world.paused = false; world.execute(); updateMetrics(); hint('Eksekusi paralel: garis putih = waktu komputasi. Waktu berjalan robot tidak dihitung.');
}
function showResult() {
  updateMetrics(); const rows = comparison(model.mapping, results, model.et), m = model.metrics;
  const best = Math.min(...rows.slice(1).map(r => r.makespan)), proof = enumerate(model.et), reference = proof?.makespan ?? best;
  const ratio = m.makespan / reference, stars = ratio <= 1 + 1e-9 ? 3 : ratio <= 1.25 ? 2 : ratio <= 1.5 ? 1 : 0;
  $('stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars); $('stars').setAttribute('aria-label', `${stars} dari 3 bintang`);
  $('result-title').textContent = mode === 'manual' ? 'Hasil jadwal pemain' : `Hasil ${mode === 'aco' ? 'Max-Min + ACO' : 'Min-Min + GA'}`;
  const hybridBest = Math.min(results.aco.final.makespan, results.ga.final.makespan);
  const assessment = m.makespan < hybridBest - 1e-8 ? 'Jadwal Anda mengalahkan kedua hybrid pada makespan.' : Math.abs(m.makespan - hybridBest) < 1e-8 ? 'Makespan sama dengan hybrid terbaik yang ditemukan.' : `Makespan ${fmt(m.makespan - hybridBest)} s lebih lama dari hybrid terbaik yang ditemukan.`;
  const idle = m.loads.map((load, v) => `VM${v + 1}: beban ${fmt(load)} s, idle ${fmt(m.makespan - load)} s`).join('; ');
  $('result-message').textContent = `${assessment} ${idle}. Bandingkan pembagian beban; memilih durasi tercepat untuk setiap task dapat menumpuk pekerjaan pada satu VM.`;
  $('result-rows').innerHTML = rows.map((r, i) => `<tr><th scope="row">${i === 0 && mode !== 'manual' ? 'Jadwal di pulau' : r.name}</th><td>${fmt(r.makespan)}</td><td>${fmt(r.doi)}</td><td>${fmt(r.utilization)}</td></tr>`).join('');
  $('proof').textContent = proof ? `Enumerasi lengkap ${proof.count} mapping membuktikan makespan optimum ${fmt(proof.makespan)} s.${Math.abs(m.makespan - proof.makespan) < 1e-8 ? ' Jadwal ini optimal untuk makespan.' : ''}` : 'Optimum global belum diketahui. Pembanding adalah solusi terbaik yang ditemukan dengan seed dan parameter aktif.';
  $('results').showModal(); audio.effect('win', stars); world.reward(stars);
}
function scenarioDetails() {
  $('scenario-name').textContent = $('scenario').value === 'training' ? 'Skenario latihan: 3 task, 2 VM' : `Skenario laboratorium: ${scenario.tasks.length} task, ${scenario.vms.length} VM, ${scenario.hosts.length} host`;
  const p = parameters;
  $('parameters').textContent = `Seed ${scenario.seed} · ${scenario.mode === 'custom' ? 'ETC custom independen' : 'ETC = MI/MIPS'}. ACO: ${p.ants} semut, ${p.iterations} iterasi, α ${fmt(p.alpha)}, β ${fmt(p.beta)}, ρ ${fmt(p.rho)}, Q ${fmt(p.q)}. GA: populasi ${p.population}, ${p.generations} generasi, turnamen ${p.tournament}, Pc ${fmt(p.crossover)}, Pm ${fmt(p.mutation)} per gen.`;
  $('etc').innerHTML = `<table><caption>ETC (detik) · bukan waktu berjalan robot</caption><thead><tr><th>Task</th>${scenario.vms.map((_, v) => `<th>VM${v + 1}</th>`).join('')}</tr></thead><tbody>${model.et.map((row, t) => `<tr><th>T${t + 1}</th>${row.map(v => `<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $('etc').innerHTML += `<p>Host: ${scenario.hosts.map((h, i) => `H${i + 1} kapasitas ${fmt(h.capacity)} MIPS`).join('; ')}.</p><p>VM: ${scenario.vms.map((v, i) => `VM${i + 1} pada H${v.host + 1}, ${fmt(v.mips)} MIPS`).join('; ')}.</p><p>Task: ${scenario.tasks.map((t, i) => `T${i + 1}: ${fmt(t.mi)} MI`).join('; ')}.</p>`;
  $('destination').innerHTML = model.et.map((_, t) => `<option value="task:${t}">T${t + 1}</option>`).join('') + scenario.vms.map((_, v) => `<option value="lane:${v}">VM${v + 1}</option>`).join('') + '<option value="tray:0">Antrean</option>';
}
function calculate() {
  delete document.body.dataset.ready;
  worker?.terminate(); results = null; $('loading').hidden = false; $('loading').textContent = 'Menghitung kedua hybrid dengan engine laboratorium…';
  document.querySelectorAll('[data-mode]').forEach(b => b.disabled = true); $('run').disabled = true;
  const id = ++workerId; worker = new Worker(new URL('../engine/worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (id !== workerId || leaving) return;
    if (data.error) { fail(data.error); return; }
    results = data.results; worker.terminate(); $('loading').hidden = true;
    document.querySelectorAll('[data-mode]').forEach(b => b.disabled = false); reset(); document.body.dataset.ready = 'true';
  };
  worker.onerror = e => fail(`Engine tidak dapat dimuat: ${e.message}. Gunakan server HTTP lokal.`);
  worker.postMessage({ id, scenario, parameters });
}
function changeScenario() {
  if ($('scenario').value === 'lab' && importError) { $('scenario').value = 'training'; hint(importError); return; }
  stopPlayback(); world.stopExecution();
  scenario = $('scenario').value === 'lab' ? structuredClone(imported.scenario) : training(imported?.scenario?.seed ?? 8);
  model = new ManualSchedule(scenario); world.build(model); scenarioDetails(); calculate();
}
function fail(message) {
  $('loading').hidden = true; $('fallback').hidden = false; $('failure').textContent = `${message} Presentasi 2D tetap dapat digunakan.`;
  worker?.terminate(); world?.dispose(); document.querySelectorAll('[data-mode],#run,#reset,#play,#next,#skip,#approach,#scenario,#camera,#speed').forEach(b => b.disabled = true);
}

life.listen($('audio'), 'click', toggleAudio);
life.listen($('run'), 'click', execute); life.listen($('reset'), 'click', reset);
life.listen($('play'), 'click', play); life.listen($('next'), 'click', next); life.listen($('skip'), 'click', skip);
life.listen($('again'), 'click', reset); life.listen($('close-result'), 'click', () => { $('results').close(); $('world').focus(); });
document.querySelectorAll('[data-mode]').forEach(b => life.listen(b, 'click', () => { if (b.dataset.mode === 'manual') reset(); else watch(b.dataset.mode); }));
life.listen($('scenario'), 'change', changeScenario);
life.listen($('camera'), 'change', () => { if (world) world.cameraMode = $('camera').value; });
life.listen($('speed'), 'change', () => { if (world) world.speed = Number($('speed').value); });
life.listen($('reduce'), 'change', () => { if (world) { world.reduced = isReduced(); if (world.reduced) { world.motion?.resolve(true); world.motion = null; world.visualHeld = null; world.retarget(true); } } });
life.listen(reduced, 'change', () => { if (world) world.reduced = isReduced(); });
life.listen($('approach'), 'click', () => { if (!world || mode !== 'manual' || world.execution) return; const [type, value] = $('destination').value.split(':'); world.paused = false; world.cancelMotion(); world.approach(type, Number(value)); $('world').focus(); });
life.listen($('world'), 'pointerdown', e => { world?.pointer(e); $('world').focus(); });
life.listen(window, 'resize', () => world?.resize());
life.listen($('world'), 'webglcontextlost', event => { event.preventDefault(); if (!leaving) fail('Konteks WebGL terputus. Muat ulang halaman 3D untuk mencoba lagi.'); });

try {
  if (new URLSearchParams(location.search).get('webgl') === 'off') throw new Error('WebGL dinonaktifkan untuk uji fallback.');
  const { World } = await import('./world.js?v=cloud-4');
  scenario = training(imported?.scenario?.seed ?? 8); model = new ManualSchedule(scenario);
  world = new World($('world'), model, { change: updateMetrics, sound: kind => audio.effect(kind), finish: showResult, focus: manualHint, clock: (time, duration) => hint(`Eksekusi t = ${fmt(time)} / ${fmt(duration)} s. Waktu komputasi simulasi; kedua VM berjalan paralel.`) });
  world.reduced = isReduced(); world.speed = Number($('speed').value); scenarioDetails(); if (!document.hidden) world.start(); calculate();
  life.add(() => { worker?.terminate(); world.dispose(); });
} catch (e) { fail(`Inisialisasi WebGL gagal: ${e.message}. Coba browser Chrome atau Edge dengan akselerasi grafis.`); }
