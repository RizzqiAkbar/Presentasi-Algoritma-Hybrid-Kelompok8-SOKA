import { defaults, generate } from './engine/scenario.js';
import { schedule, makespan } from './engine/metrics.js';
import { Playback } from './ui/playback.js?v=guided-2';
import { configure } from './ui/configuration.js?v=guided-2';
import { lesson, phaseTerms, terms } from './ui/learning.js?v=guided-2';
import { topology, matrix, gantt, metricHTML, convergence, antGraph, pheromoneMatrix, genetics, color, f, esc } from './ui/renderers.js';

const $=id=>document.getElementById(id);
const phaseLabels={setup:'Setup',etc:'Matriks ETC',heuristic:'Heuristik',seed:'Seeding',optimize:'Optimasi',convergence:'Konvergensi',final:'Jadwal akhir'};
let scenario=generate(),parameters={...defaults},results,algorithm='aco',inspector='matrix',ant=0,task=0,operation=0,preview=null,elapsed=null;
let worker,requestId=0,animations=[],executionFrame,lastRenderIndex=-1,lastPhase='',lastSchedule=null;
let mainView='infrastructure', interactionMode='guided';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const reduceMotion=()=>reduced.matches||$('reduce-motion').checked;
const playback=new Playback(render);
playback.mode='guided';
function cancelAnimations(){animations.forEach(a=>a.cancel());animations=[];}
function stopExecution(){cancelAnimationFrame(executionFrame);executionFrame=null;$('execute').textContent='Jalankan eksekusi';}
export function pauseLab(){playback.pause();cancelAnimations();stopExecution();if(results&&!document.body.classList.contains('busy'))render();}
export function labSnapshot(){return structuredClone({scenario,parameters});}
function navigate(index){preview=null;elapsed=null;stopExecution();playback.seek(index);}
function phase(direction){
  if(!results||algorithm==='compare')return;
  const phases=results[algorithm].phases;
  const next=direction>0?phases.find(p=>p.index>playback.index):[...phases].reverse().find(p=>p.index<playback.index);
  navigate(next?.index??(direction>0?playback.trace.length-1:0));
}
function status(message,error=false){$('status').hidden=!message;$('status').textContent=message;$('status').classList.toggle('loading',!error);}
function calculate(){
  playback.pause();cancelAnimations();stopExecution();requestId++;const id=requestId;
  worker?.terminate();document.body.classList.add('busy');status('Menghitung kedua algoritma dan membangun trace…');
  for(const b of document.querySelectorAll('[data-algo]'))b.disabled=true;
  $('interaction-mode').disabled=true;
  try{
    worker=new Worker(new URL('./engine/worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      if(data.id!==requestId)return;
      document.body.classList.remove('busy');for(const b of document.querySelectorAll('[data-algo]'))b.disabled=false;
      $('interaction-mode').disabled=false;
      if(data.error){status(data.error,true);return;}
      results=data.results;status('');preview=null;elapsed=null;lastRenderIndex=-1;lastPhase='';lastSchedule=null;
      $('scenario-summary').textContent=`${scenario.tasks.length} task · ${scenario.vms.length} VM · ${scenario.hosts.length} host · seed ${scenario.seed} · ${scenario.mode==='custom'?'ETC custom':'MI/MIPS'}`;
      selectAlgorithm(algorithm);
    };
    worker.onerror=event=>{document.body.classList.remove('busy');$('interaction-mode').disabled=false;status(`Engine tidak dapat dimuat: ${event.message}. Muat ulang melalui server HTTP.`,true);for(const b of document.querySelectorAll('[data-algo]'))b.disabled=false;};
    worker.postMessage({id,scenario,parameters});
  }catch(e){document.body.classList.remove('busy');$('interaction-mode').disabled=false;status(e.message,true);for(const b of document.querySelectorAll('[data-algo]'))b.disabled=false;}
}
function selectAlgorithm(value){
  playback.pause();cancelAnimations();stopExecution();algorithm=value;preview=null;elapsed=null;ant=0;task=0;operation=0;lastPhase='';lastSchedule=null;lastRenderIndex=-1;
  $('slide-4').classList.toggle('ga-theme',value==='ga');
  document.querySelectorAll('[data-algo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.algo===value)));
  $('lab-workspace').hidden=value==='compare';$('comparison').hidden=value!=='compare';
  if(!results)return;
  if(value==='compare')renderComparison();else playback.setTrace(results[value].events);
}
function displayedSchedule(e,r){
  const mapping=preview?.mapping||e.mapping;
  return schedule(mapping,r.et,!preview&&e.phase==='heuristic'?e.order:undefined);
}
function render(){
  if(!results||algorithm==='compare')return;
  cancelAnimations();
  const r=results[algorithm],e=r.events[playback.index];if(!e)return;
  const changed=lastRenderIndex!==playback.index;
  if(changed){preview=null;elapsed=null;ant=0;operation=0;stopExecution();if(e.type==='explore')task=e.task;}
  if(e.phase!==lastPhase){inspector=['seed','optimize','convergence','final'].includes(e.phase)?'optimizer':'matrix';mainView=['seed','optimize'].includes(e.phase)?'algorithm':'infrastructure';lastPhase=e.phase;}
  const m=displayedSchedule(e,r);
  $('event-title').textContent=e.title;
  $('event-location').textContent=`${phaseLabels[e.phase]}${e.iteration?` / ${algorithm==='aco'?'Iterasi':'Generasi'} ${e.iteration} dari ${algorithm==='aco'?parameters.iterations:parameters.generations}`:e.round?` / Putaran ${e.round} dari ${scenario.tasks.length}`:''}`;
  $('explanation').textContent=lesson(e,scenario,r,parameters,{ant,operation,preview});
  const definitions=phaseTerms(e,algorithm);
  $('help-title').textContent=`Bantuan: ${definitions.join(', ')}`;
  $('help-content').innerHTML=definitions.map(term=>`<div><dt>${esc(term)}</dt><dd>${esc(terms[term])}</dd></div>`).join('');
  $('slide-4').dataset.currentPhase=e.phase;
  $('phases').innerHTML=r.phases.map((p,i)=>`<button data-phase="${p.index}" class="${p.key===e.phase?'current':p.index<playback.index?'done':''}" ${p.key===e.phase?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span>${p.key==='heuristic'?(algorithm==='aco'?'Max-Min':'Min-Min'):p.key==='seed'?(algorithm==='aco'?'Seed feromon':'Seed kromosom'):phaseLabels[p.key]}</button>`).join('');
  const algorithmCanvas=mainView==='algorithm'&&(e.tau||e.population);
  $('main-view').hidden=!(e.tau||e.population);$('main-view').textContent=algorithmCanvas?'Lihat infrastruktur':'Lihat optimizer';
  $('canvas-title').textContent=algorithmCanvas?(algorithm==='aco'?'Eksplorasi task → VM':'Evolusi kromosom'):'Infrastruktur cloud';
  $('topology').classList.toggle('algorithm-canvas',Boolean(algorithmCanvas));
  $('topology').innerHTML=algorithmCanvas?(algorithm==='aco'?antGraph(e,Math.min(ant,(e.candidates?.length||1)-1),task,true,Boolean(preview)):genetics(e,r.et,operation)):topology(scenario,e,m,elapsed);
  $('topology-state').textContent=elapsed===null?'Konstruksi jadwal · belum dieksekusi':`Eksekusi · t = ${f(elapsed)} s`;
  $('topology-legend').innerHTML=scenario.vms.slice(0,8).map((_,v)=>`<span><i class="swatch" style="background:${color(v)}"></i>VM${v+1}</span>`).join('')+(scenario.vms.length>8?`<span>+${scenario.vms.length-8} VM (nomor tetap unik)</span>`:'');
  renderInspector(e,r);
  if(changed&&e.chosen&&inspector==='matrix'){
    const cell=$('inspect-content').querySelector('.winning'),container=$('inspect-content').querySelector('.matrix-scroll');
    if(cell&&container)container.scrollTop+=cell.getBoundingClientRect().top-container.getBoundingClientRect().top-container.clientHeight/2+cell.clientHeight/2;
  }
  renderSubsteps(e,r);
  $('gantt').classList.toggle('many-lanes',scenario.vms.length>8);
  $('gantt').innerHTML=gantt(m,scenario.vms.length,{time:elapsed,width:Math.max(650,$('gantt').clientWidth)});
  $('metrics').innerHTML=metricHTML(m,scenario.tasks.length,r.computeMs,elapsed);
  $('play').textContent=playback.playing?'Jeda':playback.index===r.events.length-1?'Putar ulang':'Putar';
  $('prev-event').disabled=playback.index===0;$('next-event').disabled=playback.index===r.events.length-1;
  $('prev-phase').disabled=playback.index===0;$('next-phase').disabled=e.phase==='final';
  $('scrubber').max=r.events.length-1;$('scrubber').value=playback.index;
  $('event-count').textContent=interactionMode==='guided'?`Langkah ${playback.guidedIndices.filter(index=>index<=playback.index).length} / ${playback.guidedIndices.length}`:`Event ${playback.index+1} / ${r.events.length}`;
  $('execute').disabled=m.assigned!==scenario.tasks.length;
  $('execute').hidden=interactionMode==='guided'&&e.phase!=='final'&&elapsed===null;
  $('elapsed').hidden=interactionMode==='guided'&&e.phase!=='final'&&elapsed===null;
  $('execution-time').disabled=m.assigned!==scenario.tasks.length;
  $('execution-time').value=elapsed===null?0:elapsed/Math.max(m.makespan,1e-9)*1000;
  $('elapsed').textContent=`${f(elapsed??0)} s`;
  if(preview)$('task-detail').textContent=`Inspeksi ${preview.label}. Timeline dan metrik mengikuti kandidat ini; global best tidak diubah.`;
  else $('task-detail').textContent='Pilih task pada timeline untuk melihat waktu mulai, durasi, dan selesai.';
  if(changed&&!reduceMotion()){
    animatePath($('topology').querySelector('#selected-route'),$('topology').querySelector('#route-packet'));
    animatePath($('inspect-content').querySelector('.ant-selected-path'),$('inspect-content').querySelector('#ant-agent'));
    animatePath($('topology').querySelector('.ant-selected-path'),$('topology').querySelector('#ant-agent'));
    if(e.type==='evaluate')$('inspect-content').querySelectorAll('.evaluating').forEach((node,i)=>animations.push(node.animate([{opacity:.2},{opacity:1}],{duration:220,delay:Math.min(i*12,400)})));
    if(e.type==='pheromone')$('topology').querySelectorAll('svg path[opacity="0.9"]').forEach((node,i)=>{const length=node.getTotalLength();animations.push(node.animate([{strokeDasharray:`${length} ${length}`,strokeDashoffset:length},{strokeDasharray:`${length} ${length}`,strokeDashoffset:0}],{duration:600/playback.speed,delay:Math.min(i*25,250)}));});
    if(e.type==='chromosome')$('topology').querySelector('.chromosome')?.querySelectorAll('.gene').forEach((node,i)=>animations.push(node.animate([{transform:'translateY(12px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:400/playback.speed,delay:Math.min(i*25,300)})));
    if(e.type==='crossover'){
      const op=e.operations[operation];if(op.point!==null)$('topology').querySelectorAll('.chromosome:nth-of-type(4) .gene').forEach((node,t)=>animations.push(node.animate([{transform:`translate(${t>=op.point?12:-12}px,-12px)`,opacity:.3},{transform:'translate(0,0)',opacity:1}],{duration:650/playback.speed})));
    }
    if(lastSchedule){
      for(const slot of m.slots){const prev=lastSchedule.slots.find(s=>s.task===slot.task),node=$('gantt').querySelector(`#task-${slot.task}`);if(prev&&prev.vm!==slot.vm&&node)animations.push(node.animate([{transform:`translateY(${(prev.vm-slot.vm)*(scenario.vms.length>12?25:29)}px)`},{transform:'translateY(0)'}],{duration:450/playback.speed,easing:'ease-out'}));}
    }
    if(e.type==='allocate'){const node=$('gantt').querySelector(`#task-${e.chosen.task}`);if(node)animations.push(node.animate([{opacity:0},{opacity:1}],{duration:500/playback.speed}));}
    document.querySelectorAll('#topology .gene.mutated,#topology .cross-connector,#inspect-content .gene.mutated').forEach(node=>animations.push(node.animate([{opacity:.25},{opacity:1}],{duration:650/playback.speed})));
  }
  lastRenderIndex=playback.index;lastSchedule=m;
}
function animatePath(path,marker){
  if(!path||!marker)return;
  const length=path.getTotalLength(),points=Array.from({length:40},(_,i)=>{const p=path.getPointAtLength(length*i/39);return{transform:`translate(${p.x}px,${p.y}px)`};});
  marker.setAttribute('cx',0);marker.setAttribute('cy',0);
  animations.push(marker.animate(points,{duration:850/playback.speed,easing:'ease-in-out',fill:'forwards'}));
  animations.push(path.animate([{strokeDasharray:`0 ${length}`},{strokeDasharray:`${length} ${length}`}],{duration:450/playback.speed,fill:'forwards'}));
}
function renderInspector(e,r){
  if(interactionMode==='guided'){renderGuidedInspector(e,r);return;}
  document.querySelectorAll('[data-inspect]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.inspect===inspector)));
  if(inspector==='matrix'){$('inspect-content').innerHTML=matrix(r.et,e);return;}
  let html='';
  if(algorithm==='aco'&&e.tau){
    ant=Math.min(ant,(e.candidates?.length||1)-1);task=Math.min(task,scenario.tasks.length-1);
    html=`<div class="inspect-selects">${e.candidates?`<label>Inspeksi jadwal<select id="ant-select"><option value="" ${!preview?'selected':''}>Jadwal event / global</option>${e.candidates.map((c,i)=>`<option value="${i}" ${preview&&ant===i?'selected':''}>Semut ${i+1} · ${f(c.ms)} s</option>`).join('')}</select></label>`:''}<label>Task inspeksi<select id="ant-task">${scenario.tasks.map((_,i)=>`<option value="${i}" ${task===i?'selected':''}>T${i+1}</option>`).join('')}</select></label></div>`;
    html+=antGraph(e,ant,task,mainView!=='algorithm',Boolean(preview))+pheromoneMatrix(e.tau);
  }else if(algorithm==='ga'&&e.population){
    operation=Math.min(operation,(e.operations?.length||1)-1);
    html=e.operations?`<div class="inspect-selects"><label>Operasi anak<select id="operation-select">${e.operations.map((_,i)=>`<option value="${i}" ${i===operation?'selected':''}>Anak ${i+1}</option>`).join('')}</select></label><label>Kromosom<select id="chromosome-select"><option value="">Pilih inspeksi</option>${e.population.map((c,i)=>`<option value="${i}">K${i}</option>`).join('')}</select></label></div>`:'';
    html+=mainView==='algorithm'?`<p class="inspector-note">Populasi ${e.population.length} · gen ${scenario.tasks.length}. Diagram utama menampilkan ${e.operations&&['selection','crossover','mutation'].includes(e.type)?'operasi anak '+(operation+1):'sampel 5 kromosom'}. Pilih kandidat untuk memetakan ulang timeline.</p><p class="inspector-note">${e.bestMs?`Global best ${e.type==='elitism'?'setelah':'sebelum'} generasi ini: ${f(e.bestMs)} s.`:'K0 berasal dari Min-Min; anggota lain dibangkitkan acak.'}</p>`:genetics(e,r.et,operation);
  }else html='<p class="inspector-note">'+(['setup','etc','heuristic'].includes(e.phase)?'Selesaikan heuristik untuk melihat seeding dan optimasi.':'Pencarian selesai. Periksa kurva dan jadwal global best.')+'</p>';
  if(e.history?.length)html+='<div class="convergence"><p class="inspector-note">Makespan: global best (warna) / terbaik iterasi (putus-putus)</p>'+convergence(e.history,algorithm==='aco'?'#12675e':'#9c4426')+'</div>';
  $('inspect-content').innerHTML=html;
  if(mainView==='algorithm'&&e.tau){const detail=$('inspect-content').querySelector('details');if(detail)detail.open=true;}
}
function renderGuidedInspector(e,r){
  if(['setup','etc','heuristic'].includes(e.phase)){
    $('inspect-content').innerHTML=`<h3 class="guided-inspector-title">${e.phase==='heuristic'?'Perhitungan completion time':'Estimasi waktu eksekusi'}</h3>`+matrix(r.et,e);return;
  }
  let html='';
  if(e.tau){
    const selectedTask=Math.min(task,scenario.tasks.length-1),vm=e.mapping[selectedTask];
    html='<h3 class="guided-inspector-title">Probabilitas dan feromon</h3>'+antGraph(e,Math.min(ant,(e.candidates?.length||1)-1),selectedTask,false,Boolean(preview));
    if(!e.candidates&&vm>=0)html+=`<p class="guided-readout">Seed T${selectedTask+1} → VM${vm+1}: τ = ${f(e.tau[selectedTask][vm],1)}. Pasangan lain memulai pada τ = 1.</p>`;
    html+=pheromoneMatrix(e.tau);
  }else if(e.population){
    const ms=displayedSchedule(e,r).makespan;
    html=`<h3 class="guided-inspector-title">Kualitas jadwal</h3><p class="guided-readout">${e.population.length} kromosom · ${scenario.tasks.length} gen per kromosom.</p><p class="guided-readout">Jadwal pada Gantt: makespan <strong>${f(ms)} s</strong> dan fitness <strong>${f(1/ms,5)}</strong>.</p><p class="inspector-note">${e.bestMs?`Global best ${e.type==='elitism'?'setelah':'sebelum'} generasi ini: ${f(e.bestMs)} s.`:'Kromosom 0 berasal dari Min-Min. Anggota lain dibangkitkan acak.'}</p>`;
  }
  if(e.history?.length)html+=`<div class="convergence"><h3 class="guided-inspector-title">Perkembangan makespan</h3><p class="inspector-note">Putus-putus: current-best per iterasi/generasi. Warna: global-best yang disimpan.</p>${convergence(e.history,algorithm==='aco'?'#12675e':'#9c4426')}</div>`;
  if(!html)html='<p class="inspector-note">Jadwal akhir tersedia pada Gantt di bawah.</p>';
  if(preview)html+='<button id="return-event">Kembali ke jadwal event</button>';
  $('inspect-content').innerHTML=html;
}
function renderSubsteps(e,r){
  const active=e.phase==='optimize'&&interactionMode==='advanced';$('substeps').hidden=!active;
  if(!active)return;
  const iterationEvents=r.events.map((event,index)=>({event,index})).filter(x=>x.event.phase==='optimize'&&x.event.iteration===e.iteration);
  const max=algorithm==='aco'?parameters.iterations:parameters.generations;
  $('substeps').innerHTML=`<label>${algorithm==='aco'?'Iterasi':'Generasi'}<select id="iteration-select">${Array.from({length:max},(_,i)=>`<option value="${i+1}" ${i+1===e.iteration?'selected':''}>${i+1} / ${max}</option>`).join('')}</select></label><div role="group" aria-label="Operasi dalam iterasi">${iterationEvents.map(({event,index})=>`<button data-substep="${index}" aria-pressed="${index===playback.index}">${event.type==='explore'?`Pilih T${event.task+1}`:event.type==='evaluation'?'Evaluasi':event.type==='evaporate'?'Evaporasi':event.type==='reinforce'?'Reinforcement':event.type==='fitness'?'Fitness':event.type==='selection'?'Seleksi':event.type==='crossover'?'Crossover':event.type==='mutation'?'Mutasi':'Elitisme'}</button>`).join('')}</div>`;
}
function renderComparison(){
  const a=results.aco,g=results.ga,max=Math.max(a.initial.makespan,g.initial.makespan,a.final.makespan,g.final.makespan),delta=g.final.makespan-a.final.makespan;
  $('comparison').innerHTML=`<p class="comparison-scale">Workload, ETC, placement dan seed identik. Semua timeline memakai skala 0–${f(max)} s. Belum ada eksekusi task pada tampilan perbandingan.</p><div class="compare-grid">${['aco','ga'].map(algo=>{const r=results[algo],change=r.initial.makespan-r.final.makespan;return `<article class="compare-column ${algo==='ga'?'ga-theme':''}"><h3 class="${algo}-text">${algo==='aco'?'Max-Min + ACO':'Min-Min + GA'}</h3><h4>Jadwal heuristik · ${f(r.initial.makespan)} s</h4><div class="svg-scroll">${gantt(r.initial,scenario.vms.length,{max,interactive:false,prefix:algo+'-initial-'})}</div><h4>Jadwal akhir · ${f(r.final.makespan)} s</h4><div class="svg-scroll">${gantt(r.final,scenario.vms.length,{max,interactive:false,prefix:algo+'-final-'})}</div><div class="metrics">${metricHTML(r.final,scenario.tasks.length,r.computeMs).replace(/<div><span>Selesai eksekusi[\s\S]*?<\/div>/,'')}</div><p class="inspector-note">${change>0?'Perbaikan '+f(change)+' s ('+f(change/r.initial.makespan*100,1)+'%).':'Makespan sama dengan seed.'} Tidak ada jaminan perbaikan DoI.</p><h4>Riwayat optimasi</h4>${convergence(r.history,algo==='aco'?'#12675e':'#9c4426',180)}<details><summary>Mapping akhir per task</summary><p class="inspector-note">${r.best.map((v,t)=>`T${t+1} → VM${v+1}`).join(' · ')}</p></details></article>`;}).join('')}</div><p class="compare-summary">${Math.abs(delta)<1e-8?'Makespan akhir kedua algoritma sama.':`${delta>0?'ACO':'GA'} menghasilkan makespan ${f(Math.abs(delta))} s lebih rendah pada skenario dan seed ini.`} DoI ACO ${f(a.final.doi,3)}; GA ${f(g.final.doi,3)}. Perbandingan runtime adalah komputasi + trace browser, bukan benchmark CloudSim.</p>`;
}

$('phases').onclick=e=>{const b=e.target.closest('[data-phase]');if(b)navigate(Number(b.dataset.phase));};
$('substeps').onclick=e=>{const b=e.target.closest('[data-substep]');if(b)navigate(Number(b.dataset.substep));};
$('substeps').onchange=e=>{if(e.target.id==='iteration-select'){const index=playback.trace.findIndex(x=>x.phase==='optimize'&&x.iteration===Number(e.target.value));navigate(index);}};
$('main-view').onclick=()=>{mainView=mainView==='algorithm'?'infrastructure':'algorithm';render();};
$('interaction-mode').onchange=()=>{
  playback.pause();cancelAnimations();stopExecution();
  interactionMode=$('interaction-mode').value;
  $('slide-4').classList.toggle('guided-mode',interactionMode==='guided');
  playback.mode=interactionMode==='guided'?'guided':$('detail').value;
  $('prev-event').textContent=interactionMode==='guided'?'Sebelumnya':'‹ Event';
  $('next-event').textContent=interactionMode==='guided'?'Berikutnya':'Event ›';
  $('prev-event').setAttribute('aria-label',interactionMode==='guided'?'Langkah sebelumnya':'Event sebelumnya');
  $('next-event').setAttribute('aria-label',interactionMode==='guided'?'Langkah berikutnya':'Event berikutnya');
  $('mode-description').textContent=interactionMode==='guided'?'Ikuti langkah utama dengan Berikutnya atau Putar. Iterasi lanjutan diringkas; semua perhitungan tetap dijalankan.':'Navigasi setiap event, pilih iterasi atau inspeksi kandidat. Pergantian mode mempertahankan posisi saat ini.';
  render();
};
document.querySelectorAll('[data-algo]').forEach(b=>b.onclick=()=>selectAlgorithm(b.dataset.algo));
document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>{inspector=b.dataset.inspect;render();});
$('inspect-content').onchange=event=>{
  const e=results[algorithm].events[playback.index];playback.pause();stopExecution();elapsed=null;
  if(event.target.id==='ant-select'){if(event.target.value==='')preview=null;else{ant=Number(event.target.value);preview={mapping:e.candidates[ant].mapping,label:`semut ${ant+1}`};}}
  if(event.target.id==='ant-task'){task=Number(event.target.value);if(e.candidates)preview={mapping:e.candidates[ant].mapping,label:`semut ${ant+1}`};}
  if(event.target.id==='operation-select'){operation=Number(event.target.value);const op=e.operations[operation];preview={mapping:e.type==='selection'?op.a.mapping:e.type==='crossover'?op.crossed:op.child,label:`anak ${operation+1}`};}
  if(event.target.id==='chromosome-select'&&event.target.value!==''){const i=Number(event.target.value);preview={mapping:e.population[i],label:`kromosom K${i}`};}
  render();
};
$('inspect-content').onclick=event=>{if(event.target.id==='return-event'){preview=null;render();return;}const b=event.target.closest('[data-chromosome]');if(!b)return;const e=results[algorithm].events[playback.index],i=Number(b.dataset.chromosome);playback.pause();preview={mapping:e.population[i],label:`kromosom K${i}`};render();};
$('topology').onclick=event=>{const b=event.target.closest('[data-chromosome]');if(!b)return;const e=results[algorithm].events[playback.index],i=Number(b.dataset.chromosome);playback.pause();preview={mapping:e.population[i],label:`kromosom K${i}`};render();};
$('play').onclick=()=>{stopExecution();preview=null;if(playback.playing){playback.pause();render();}else playback.play();};
$('prev-event').onclick=()=>{preview=null;playback.step(-1);};$('next-event').onclick=()=>{preview=null;playback.step(1);};
$('prev-phase').onclick=()=>phase(-1);$('next-phase').onclick=()=>phase(1);
$('reset').onclick=()=>navigate(0);$('final').onclick=()=>navigate(playback.trace.length-1);
$('scrubber').oninput=()=>navigate(Number($('scrubber').value));
$('detail').onchange=()=>{if(interactionMode==='advanced')playback.mode=$('detail').value;};
$('speed').onchange=()=>{cancelAnimations();playback.setSpeed(Number($('speed').value));};
$('gantt').onclick=e=>taskDetails(e.target.closest('[data-task]'));
$('gantt').onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();taskDetails(e.target.closest('[data-task]'));}};
function taskDetails(node){if(!node)return;const r=results[algorithm],e=r.events[playback.index],m=displayedSchedule(e,r),slot=m.slots.find(s=>s.task===Number(node.dataset.task));if(slot)$('task-detail').textContent=`T${slot.task+1} → VM${slot.vm+1} · mulai ${f(slot.start)} s · durasi ${f(slot.duration)} s · selesai ${f(slot.end)} s · ${scenario.mode==='custom'?'ETC custom':scenario.tasks[slot.task].mi+' MI / '+scenario.vms[slot.vm].mips+' MIPS'}`;}
$('execution-time').oninput=()=>{playback.pause();stopExecution();const r=results[algorithm],m=displayedSchedule(r.events[playback.index],r);elapsed=Number($('execution-time').value)/1000*m.makespan;render();};
$('execute').onclick=()=>{
  if(executionFrame){stopExecution();return;}
  playback.pause();cancelAnimations();
  const r=results[algorithm],e=r.events[playback.index],m=displayedSchedule(e,r);
  if(m.assigned!==scenario.tasks.length)return;
  if(elapsed===null||elapsed>=m.makespan)elapsed=0;
  render();
  let last=performance.now();
  const frame=now=>{const dt=now-last;last=now;elapsed=Math.min(m.makespan,elapsed+dt/1000*m.makespan/12*playback.speed);renderExecution(m);$('execute').textContent='Jeda eksekusi';if(elapsed<m.makespan)executionFrame=requestAnimationFrame(frame);else stopExecution();};
  executionFrame=requestAnimationFrame(frame);
};
function renderExecution(m){
  $('elapsed').textContent=`${f(elapsed)} s`;$('execution-time').value=elapsed/m.makespan*1000;
  $('topology-state').textContent=`Eksekusi · t = ${f(elapsed)} s`;
  const svg=$('gantt').querySelector('svg'),width=svg.viewBox.baseVal.width,height=svg.viewBox.baseVal.height,x=65+elapsed/m.makespan*(width-115);
  $('gantt').querySelector('#execution-playhead').setAttribute('d',`M${x} 21V${height-10}`);
  $('gantt').querySelector('#execution-pointer').setAttribute('d',`M${x-4} 20h8l-4 6z`);
  const completed=m.slots.filter(s=>s.end<=elapsed).length;
  const counter=$('topology').querySelector('[data-completed-counter]');if(counter)counter.textContent=`${completed}/${scenario.tasks.length}`;
  $('metrics').children[5].querySelector('strong').textContent=`${completed} / ${scenario.tasks.length}`;
  for(const slot of m.slots){
    const node=$('gantt').querySelector(`[data-task="${slot.task}"]`),done=slot.end<=elapsed;
    if(done&&node.dataset.completed!=='true'){
      node.dataset.completed='true';node.querySelector('rect').setAttribute('stroke','#252c2a');node.querySelector('rect').setAttribute('stroke-width','1.5');
      const label=node.querySelector('text');if(label)label.textContent=`T${slot.task+1} ✓`;
    }
  }
  scenario.vms.forEach((_,v)=>{
    const active=m.slots.some(s=>s.vm===v&&s.start<=elapsed&&s.end>elapsed),indicator=$('topology').querySelector(`[data-vm-activity="${v}"]`),label=$('topology').querySelector(`[data-vm-activity-label="${v}"]`);
    if(indicator)indicator.setAttribute('fill',active?'#12675e':'#80887f');
    if(label)label.textContent=`${active?'Eksekusi':'Beban'} ${f(m.loads[v])} s`;
  });
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseLab();});
reduced.addEventListener('change',()=>cancelAnimations());
document.addEventListener('lab:motion',cancelAnimations);
document.addEventListener('keydown',e=>{
  if(document.querySelector('.cloud-ops-dialog[open]'))return;
  if($('slide-4').hidden||$('config-dialog').open||e.target.closest('input,select,textarea,button,a,summary,[contenteditable]'))return;
  if(e.code==='Space'&&algorithm!=='compare'){e.preventDefault();$('play').click();}
  if(e.key==='[')phase(-1);if(e.key===']')phase(1);
});
configure(()=>({scenario,parameters}),(s,p)=>{scenario=s;parameters=p;calculate();},pauseLab);
calculate();
