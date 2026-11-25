import { schedule, makespan } from '../engine/metrics.js';
export const colors = ['#12675e','#9c4426','#466480','#76602d','#68506c','#3f6d3c'];
export const color = i => colors[i % colors.length];
export const f = (n, digits = 2) => Number(n).toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const text = (x, y, value, size = 12, fill = '#252c2a', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(value)}</text>`;

export function topology(s, e, metrics, time = null) {
  if(s.hosts.length>4)return aggregateTopology(s,e,metrics,time);
  const compact=s.vms.length>8||s.hosts.length>3;
  const hostVMs = s.hosts.map((_, h) => s.vms.map((v, i) => ({...v, id:i})).filter(v => v.host === h));
  const cols = s.hosts.length === 1 ? 1 : 2, rackWidth = cols === 1 ? 470 : 230;
  const rows = Math.ceil(s.hosts.length / cols), rackHeight = Math.max(205, ...hostVMs.map(v => (compact?Math.min(v.length,3):v.length) * 55 + 75));
  const height = Math.max(320, rows * (rackHeight + 16) + 70), mid = height / 2;
  let links = '', racks = '', targets = [];
  const chosen = e.chosen || (e.task !== undefined && e.mapping[e.task] >= 0 ? { task:e.task, vm:e.mapping[e.task] } : null);
  hostVMs.forEach((vms, h) => {
    const x = 465 + (h % cols) * 245, y = 53 + Math.floor(h / cols) * (rackHeight + 16);
    const reserved = vms.reduce((n,v) => n + v.mips, 0);
    racks += `<g><path d="M${x},${y}h${rackWidth}v${rackHeight}h-${rackWidth}z" fill="#f4f2eb" stroke="#80887f"/>`;
    racks += `<path d="M${x+8},${y+8}v${rackHeight-16}m${rackWidth-16},0V${y+8}" fill="none" stroke="#80887f" stroke-width="2"/>`;
    racks += text(x+23,y+24,`Host ${h+1}`,19,'#252c2a','font-weight="600"') + text(x+23,y+45,`${reserved} / ${s.hosts[h].capacity} MIPS`,13,'#59615c');
    if (!vms.length) racks += text(x+23,y+90,'Tidak ada VM',12,'#59615c');
    vms.forEach((v, k) => {
      if(compact&&k>=2&&vms.length>3){targets[v.id]={x:x+23,y:y+185};return;}
      const vx=x+23, vy=y+58+k*55, width=rackWidth-46;
      targets[v.id] = { x:vx, y:vy+22 };
      const active = time !== null && metrics.slots.some(t => t.vm===v.id && t.start<=time && t.end>time);
      const selected = chosen?.vm === v.id;
      racks += `<g><rect x="${vx}" y="${vy}" width="${width}" height="45" rx="2" fill="${selected ? '#e5efea' : '#fffefa'}" stroke="${selected? '#12675e':'#80887f'}" stroke-width="${selected?2:1}"/><rect x="${vx+6}" y="${vy+7}" width="4" height="31" fill="${color(v.id)}"/>`;
      racks += text(vx+16,vy+18,`VM${v.id+1} · ${v.mips} MIPS`,18,'#252c2a','font-weight="600"') + text(vx+16,vy+36,`${active?'Eksekusi':'Beban'} ${f(metrics.loads[v.id])} s`,15,'#59615c',`data-vm-activity-label="${v.id}"`);
      racks += `<circle data-vm-activity="${v.id}" cx="${vx+width-10}" cy="${vy+32}" r="3" fill="${active?'#12675e':'#80887f'}"/></g>`;
    });
    if(compact&&vms.length>3)racks+=`<rect x="${x+23}" y="${y+168}" width="${rackWidth-46}" height="35" fill="#e9eae2" stroke="#80887f"/>`+text(x+35,y+190,`+${vms.length-2} VM · ${f(vms.slice(2).reduce((sum,v)=>sum+metrics.loads[v.id],0),1)} s`,14,'#252c2a');
    racks += '</g>';
  });
  targets.forEach((v, i) => {
    const selected = chosen?.vm === i;
    const d = `M330 ${mid} C390 ${mid},400 ${v.y},${v.x} ${v.y}`;
    links += `<path ${selected?'id="selected-route"':''} d="${d}" fill="none" stroke="${selected?'#12675e':'#80887f'}" stroke-width="${selected?3:1}" opacity="${selected?1:e.phase==='heuristic'?.6:.25}" ${!selected?'stroke-dasharray="3 4"':''}/>`;
  });
  const unassigned = e.mapping.map((v,t) => ({v,t})).filter(x => x.v < 0);
  let queue = '';
  const visibleQueue=unassigned.slice(0,7);
  if(chosen&&unassigned.some(x=>x.t===chosen.task)&&!visibleQueue.some(x=>x.t===chosen.task))visibleQueue[visibleQueue.length-1]={t:chosen.task,v:-1};
  visibleQueue.forEach(({t},i) => { const y=mid-81+i*26; queue += `<circle cx="127" cy="${y}" r="12" fill="#fffefa" stroke="${chosen?.task===t?'#12675e':'#80887f'}"/>`+text(127,y+4,`T${t+1}`,11,'#252c2a','text-anchor="middle"'); });
  if (unassigned.length>7) queue += text(127,mid+112,`+${unassigned.length-7} task`,10,'#59615c','text-anchor="middle"');
  const completed = time===null ? 0 : metrics.slots.filter(t=>t.end<=time).length;
  return `<svg viewBox="0 0 1040 ${height}" role="img" aria-label="Task queue terhubung ke scheduler dan datacenter dengan ${s.hosts.length} host yang memuat ${s.vms.length} VM">`+
    `<rect x="432" y="15" width="540" height="${height-30}" fill="none" stroke="#80887f" stroke-dasharray="5 4"/>`+text(448,36,'Datacenter · Linux / Xen',16,'#59615c')+links+
    `<path d="M45 ${mid}H100M150 ${mid}H220" stroke="#80887f" stroke-width="2" fill="none"/>`+
    `<path d="M24 ${mid-12}h20v24H24zM28 ${mid-6}h12m-12 6h12m-12 6h8" fill="none" stroke="#59615c" stroke-width="1.5"/>`+text(35,mid+40,'Submit',10,'#59615c','text-anchor="middle"')+
    `<rect x="102" y="${mid-103}" width="50" height="219" fill="#f4f2eb" stroke="#80887f"/>`+text(127,mid-115,'Antrean',11,'#59615c','text-anchor="middle"')+queue+
    `<rect x="220" y="${mid-43}" width="110" height="86" rx="3" fill="#252c2a"/>`+text(275,mid-9,'Broker',20,'#fffefa','text-anchor="middle" font-weight="600"')+text(275,mid+13,'Scheduler',16,'#fffefa','text-anchor="middle"')+text(275,mid+33,`${metrics.assigned}/${s.tasks.length} alokasi`,13,'#fffefa','text-anchor="middle"')+
    racks+`<path d="M972 ${mid}h30" fill="none" stroke="#80887f"/>`+text(1006,mid-10,'✓',18,'#12675e','text-anchor="middle"')+text(1006,mid+15,`${completed}/${s.tasks.length}`,10,'#59615c','text-anchor="middle" data-completed-counter')+text(1006,mid+32,'selesai',9,'#59615c','text-anchor="middle"')+(compact?text(450,height-2,'Mode ringkas: VM tambahan diagregasi; seluruh VM tetap ada pada matriks dan timeline.',12,'#59615c'):'')+
    (chosen?`<circle id="route-packet" r="6" cx="330" cy="${mid}" fill="#12675e" stroke="#fffefa" stroke-width="2"/>`:'')+'</svg>';
}

function aggregateTopology(s,e,m,time){
  const h=Math.ceil(s.hosts.length/2)*86+70,mid=h/2,chosen=e.chosen,completed=time===null?0:m.slots.filter(x=>x.end<=time).length;
  let racks='',links='';
  s.hosts.forEach((host,i)=>{
    const x=450+(i%2)*255,y=45+Math.floor(i/2)*86,vms=s.vms.map((v,id)=>({...v,id})).filter(v=>v.host===i),load=vms.reduce((sum,v)=>sum+m.loads[v.id],0),reserved=vms.reduce((sum,v)=>sum+v.mips,0),selected=chosen&&s.vms[chosen.vm].host===i;
    const route=`M320 ${mid}C380 ${mid},390 ${y+34},${x} ${y+34}`;
    links+=`<path ${selected?'id="selected-route"':''} d="${route}" stroke="${selected?'#12675e':'#80887f'}" stroke-width="${selected?3:1}" fill="none"/>`;
    racks+=`<rect x="${x}" y="${y}" width="235" height="74" fill="#f4f2eb" stroke="#80887f"/><path d="M${x+7} ${y+7}v60" stroke="#80887f" stroke-width="2"/>`+text(x+18,y+20,`Host ${i+1} · ${f(load,1)} s`,17,'#252c2a','font-weight="600"')+text(x+18,y+39,`${reserved}/${host.capacity} MIPS`,13,'#59615c')+text(x+18,y+61,vms.length?vms.map(v=>`VM${v.id+1}`).join(' · '):'Tanpa VM',14,'#252c2a');
  });
  return `<svg viewBox="0 0 1030 ${h}" role="img" aria-label="Topologi ringkas ${s.hosts.length} host. VM ditampilkan sebagai daftar di dalam rack host; rincian ada pada matriks."><rect x="425" y="12" width="540" height="${h-22}" fill="none" stroke="#80887f" stroke-dasharray="5 4"/>${text(440,32,'Datacenter · rack host ringkas',17,'#59615c')}${links}<path d="M55 ${mid}H210" stroke="#80887f" fill="none"/><rect x="35" y="${mid-52}" width="115" height="104" fill="#f4f2eb" stroke="#80887f"/>${text(92,mid-16,'Antrean',17,'#252c2a','text-anchor="middle"')}${text(92,mid+11,`${s.tasks.length-m.assigned} task`,17,'#59615c','text-anchor="middle"')}<rect x="210" y="${mid-43}" width="110" height="86" fill="#252c2a"/>${text(265,mid-7,'Broker',20,'#fffefa','text-anchor="middle"')}${text(265,mid+18,`${m.assigned}/${s.tasks.length}`,17,'#fffefa','text-anchor="middle"')}${racks}${text(990,mid,`${completed}/${s.tasks.length}`,14,'#12675e','text-anchor="middle" data-completed-counter')}${chosen?`<circle id="route-packet" r="6" cx="320" cy="${mid}" fill="#12675e"/>`:''}${text(435,h-2,'VM dikelompokkan per host; semua kapasitas dan alokasi tetap dihitung.',12,'#59615c')}</svg>`;
}

export function matrix(et, e) {
  const ct = e.completion, isCT = e.phase==='heuristic';
  return `<p class="inspector-note">${isCT ? 'CT = ET + ready time. Angka kecil di bawah = ET.' : 'Execution time (ET), dalam detik.'} Minimum baris diberi warna; pilihan akhir dibingkai.</p><div class="matrix-scroll"><table class="matrix"><caption>${isCT?'Completion time':'Execution time'} · ${et.length} × ${et[0].length}</caption><thead><tr><th scope="col">Task</th>${et[0].map((_,v)=>`<th scope="col">VM${v+1}</th>`).join('')}</tr></thead><tbody>${et.map((row,t)=>`<tr><th scope="row">T${t+1}${e.mapping[t]>=0?' ✓':''}</th>${row.map((value,v)=>{
    const assigned=e.mapping[t]>=0, minimum=isCT&&!assigned&&ct[t][v]===e.minima[t], winning=isCT&&e.chosen?.task===t&&e.chosen?.vm===v&&['choose','route','allocate'].includes(e.type);
    return `<td class="${winning?'winning':assigned?'assigned':minimum&&e.type!=='evaluate'?'minimum':e.type==='evaluate'?'evaluating':''}">${f(isCT?ct[t][v]:value)}${isCT?`<small>ET ${f(value)}</small>`:''}</td>`;
  }).join('')}</tr>`).join('')}</tbody>${isCT?`<tfoot><tr><th scope="row">Ready</th>${e.ready.map(v=>`<td>${f(v)}</td>`).join('')}</tr></tfoot>`:''}</table></div>`;
}

export function gantt(metrics, count, { max=metrics.makespan, time=null, interactive=true, prefix='', width=1000 } = {}) {
  max=Math.max(max,0.001);
  const left=65,right=50,plot=width-left-right,row=count>12?25:29,height=count*row+48;
  let out='';
  for(let k=0;k<=5;k++){ const x=left+plot*k/5;out+=`<path d="M${x} 24V${height-15}" stroke="#d5d8cf"/>`+text(x,15,f(max*k/5,1),10,'#59615c','text-anchor="middle"'); }
  for(let v=0;v<count;v++) out+=text(8,43+v*row,`VM${v+1}`,11,'#59615c')+`<rect x="${left}" y="${27+v*row}" width="${plot}" height="${row-5}" fill="#e9eae2"/>`;
  for(const slot of metrics.slots){const x=left+slot.start/max*plot,w=slot.duration/max*plot,y=27+slot.vm*row,done=time!==null&&slot.end<=time;
    out+=`<g class="gantt-task" data-task="${slot.task}" ${interactive?'tabindex="0" role="button"':''} aria-label="T${slot.task+1}, VM${slot.vm+1}, mulai ${f(slot.start)}, durasi ${f(slot.duration)}, selesai ${f(slot.end)} detik"><title>T${slot.task+1} → VM${slot.vm+1} | ${f(slot.start)}–${f(slot.end)} s | ET ${f(slot.duration)} s${done?' | Selesai':''}</title><rect id="${prefix}task-${slot.task}" x="${x}" y="${y}" width="${Math.max(w-1,0.1)}" height="${row-5}" fill="${color(slot.vm)}" ${done?'stroke="#252c2a" stroke-width="1.5"':''}/>${w>23?text(x+w/2,y+(row-5)/2+4,`T${slot.task+1}${done?' ✓':''}`,count>12?8:10,'#fffefa','text-anchor="middle"'):''}</g>`;
  }
  const msX=left+metrics.makespan/max*plot;
  out+=`<path d="M${msX} 23V${height-13}" stroke="#252c2a" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  if(time!==null){const x=left+time/max*plot;out+=`<path id="execution-playhead" d="M${x} 21V${height-10}" stroke="#9c4426" stroke-width="2"/><path id="execution-pointer" d="M${x-4} 20h8l-4 6z" fill="#9c4426"/>`;}
  if(!metrics.slots.length)out+=text(500,height/2+15,'Belum ada alokasi. Waktu eksekusi belum berjalan.',12,'#59615c','text-anchor="middle"');
  return `<svg viewBox="0 0 ${width} ${height}" role="${interactive?'group':'img'}" aria-label="Gantt chart ${count} VM. Makespan ${f(metrics.makespan)} detik. Area abu-abu adalah idle.">${out}</svg>`;
}

export function metricHTML(m, total, computeMs, time=null) {
  const completed = time===null?0:m.slots.filter(s=>s.end<=time).length;
  return [['Makespan proyeksi',f(m.makespan),'s'],['Degree of Imbalance',f(m.doi,3),''],['Utilisasi proyeksi',f(m.utilization,1),'%'],['Rata-rata beban',f(m.average),'s'],['Terjadwal / total',`${m.assigned} / ${total}`,''],['Selesai eksekusi',`${completed} / ${total}`,''],['Komputasi + trace',f(computeMs,1),'ms']].map(([label,value,unit])=>`<div><span>${label}</span><strong>${value}</strong> <small>${unit}</small></div>`).join('');
}

export function convergence(history, accent='#12675e', height=150) {
  if(!history?.length)return '<p class="inspector-note">Kurva muncul setelah iterasi pertama dihitung.</p>';
  const w=600,left=52,top=18,bottom=height-30,values=history.flatMap(h=>[h.current,h.best]);
  const min=Math.min(...values)*.94,max=Math.max(...values)*1.06,span=Math.max(max-min,1e-6);
  const x=i=>left+i/Math.max(history.length-1,1)*(w-left-20),y=v=>bottom-(v-min)/span*(bottom-top);
  const line=key=>history.map((h,i)=>`${i?'L':'M'}${x(i)},${y(h[key])}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${height}" role="img" aria-label="Konvergensi makespan. Garis gelap terbaik iterasi, garis berwarna global best."><path d="M${left} ${top}V${bottom}H${w-15}" fill="none" stroke="#80887f"/>${text(left-5,top+4,f(max,1),10,'#59615c','text-anchor="end"')}${text(left-5,bottom,f(min,1),10,'#59615c','text-anchor="end"')}<path d="${line('current')}" fill="none" stroke="#59615c" stroke-dasharray="4 3" stroke-width="1.5"/><path d="${line('best')}" fill="none" stroke="${accent}" stroke-width="2.5"/>${text(left,bottom+20,'1',10,'#59615c')}${text(w-20,bottom+20,`${history.length} iterasi / generasi`,10,'#59615c','text-anchor="end"')}</svg>`;
}

export function pheromoneMatrix(tau) {
  return `<details><summary>Nilai matriks feromon τ</summary><div class="matrix-scroll"><table class="matrix"><caption>Feromon aktual setelah operasi ini</caption><thead><tr><th scope="col">Task</th>${tau[0].map((_,v)=>`<th scope="col">VM${v+1}</th>`).join('')}</tr></thead><tbody>${tau.map((row,t)=>`<tr><th scope="row">T${t+1}</th>${row.map(x=>`<td>${f(x,3)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}

export function antGraph(e, ant=0, task=0, includeGraph=true, candidateView=false) {
  const tau=e.tau, probs=e.probs?.[task], candidate=e.candidates?.[ant]?.mapping || e.mapping, selected=candidateView?candidate:e.mapping;
  if(!tau)return '';
  const tasks=[...new Set([...Array.from({length:Math.min(12,tau.length)},(_,i)=>i),task])].sort((a,b)=>a-b);
  const vms=[...new Set([...Array.from({length:Math.min(7,tau[0].length)},(_,i)=>i),selected[task],candidate[task]])].filter(v=>v>=0).sort((a,b)=>a-b);
  const h=Math.max(tasks.length,vms.length)*26+40,max=Math.max(...tau.flat());
  let out='';
  tasks.forEach((t,i)=>vms.forEach((v,j)=>{
    const chosen=selected[t]===v,weight=tau[t][v];
    out+=`<path ${t===task&&chosen?'class="ant-selected-path"':''} d="M100 ${24+i*26} C300 ${24+i*26},510 ${24+j*26},710 ${24+j*26}" stroke="#12675e" stroke-width="${.6+weight/max*4}" opacity="${chosen ? .9 : .12+weight/max*.2}" fill="none"/>`;
  }));
  tasks.forEach((t,i)=>{out+=`<circle cx="90" cy="${24+i*26}" r="${t===task?9:6}" fill="${t===task?'#12675e':'#fffefa'}" stroke="#12675e"/>`+text(72,29+i*26,`T${t+1}`,15,'#252c2a','text-anchor="end"');});
  vms.forEach((v,j)=>{out+=`<rect x="710" y="${16+j*26}" width="16" height="16" fill="${color(v)}"/>`+text(740,29+j*26,`VM${v+1}`,15);});
  return `${includeGraph?`<svg class="ant-graph" viewBox="0 0 825 ${h}" role="img" aria-label="Graph task ke VM, lebar jalur menurut feromon aktual. Rute tegas mengikuti jadwal yang ditampilkan pada Gantt.">${out}<circle id="ant-agent" r="3.5" cx="100" cy="24" fill="#252c2a"/></svg>`:''}<p class="inspector-note">${tasks.length}/${tau.length} task · ${vms.length}/${tau[0].length} VM ditampilkan. Tebal = τ; rute tegas = ${candidateView?'kandidat inspeksi':'jadwal event / Gantt'}.</p>${probs?`<div class="probabilities">${probs.map((p,v)=>`<span class="${candidate[task]===v?'selected':''}">VM${v+1}: ${f(p*100,1)}%</span>`).join('')}</div><p class="inspector-note">Probabilitas semut ${ant+1}, T${task+1} saat konstruksi: r = ${f(e.candidates[ant].draws[task],5)}, terpilih VM${candidate[task]+1}; MS kandidat lengkap ${f(e.candidates[ant].ms)} s.</p>`:'<p class="inspector-note">Jalur seed = 3,0. Jalur lain = 1,0.</p>'}`;
}

function chromosome(mapping, et, label, { point=null, mutations=[], inspect=null }={}) {
  const ms=makespan(mapping,et);
  return `<div class="chromosome"><span class="row-label">${esc(label)}</span>${mapping.map((v,t)=>`<span class="gene ${point===t?'cut':''} ${mutations.some(m=>m.task===t)?'mutated':''}" style="background:${color(v)}" title="T${t+1} → VM${v+1}">${v+1}</span>`).join('')}<span class="fitness">${f(ms)} s · f ${f(1/ms,5)}</span>${inspect===null?'':`<button data-chromosome="${inspect}">Inspeksi</button>`}</div>`;
}
export function genetics(e, et, operation=0) {
  if(!e.population)return '<p class="inspector-note">Kromosom akan muncul setelah Min-Min selesai.</p>';
  const labels=`<div class="chromosome-labels">${et.map((_,t)=>`<span>T${t+1}</span>`).join('')}</div>`;
  let html='<p class="inspector-note">Nilai gen = nomor VM. Warna mengikuti VM; fitness = 1/makespan. Geser horizontal untuk task lebih banyak.</p><div class="population">'+labels;
  const op=e.operations?.[operation];
  if(op && ['selection','crossover','mutation'].includes(e.type)) {
    html+=chromosome(op.a.mapping,et,'Induk A',{point:op.point})+chromosome(op.b.mapping,et,'Induk B',{point:op.point});
    if(e.type!=='selection') html+=chromosome(op.crossed,et,'Crossover',{point:op.point});
    if(e.type==='mutation')html+=chromosome(op.child,et,'Anak',{mutations:op.mutations});
    html+='</div><p class="operation-note">'+(e.type==='selection'?`Tournament A: ${op.a.indices.map(i=>`K${i}`).join(', ')} → K${op.a.winner}. B: ${op.b.indices.map(i=>`K${i}`).join(', ')} → K${op.b.winner}.`:e.type==='crossover'?op.point===null?'Crossover tidak dipicu pada anak ini; salinan induk A.':`Potong sebelum T${op.point+1}: segmen kiri dari A, kanan dari B. Titik 0 sah seperti implementasi Java.`:op.mutations.length?op.mutations.map(m=>`T${m.task+1}: VM${m.old+1} → VM${m.value+1}${m.old===m.value?' (nilai sama)':''}`).join(' · '):'Tidak ada mutasi yang dipicu pada anak ini.')+'</p>';
    if(e.type==='crossover'&&op.point!==null) html+=`<svg viewBox="0 0 500 45" role="img" aria-label="Segmen kiri induk A dan kanan induk B digabungkan menjadi anak"><path class="cross-connector" d="M80 6V22H220V36M420 6V22H280V36" fill="none" stroke="#9c4426" stroke-width="2"/>${text(250,17,'A kiri + B kanan',11,'#9c4426','text-anchor="middle"')}</svg>`;
  } else {
    e.population.slice(0,5).forEach((c,i)=>{html+=chromosome(c,et,`K${i}${i===0?' (seed/elit)':''}`,{inspect:i});});
    html+='</div><p class="inspector-note">Sampel 5 pertama (atau seluruhnya bila lebih kecil). Seluruh '+e.population.length+' kromosom dihitung.'+(e.type==='elitism'?' Slot 0 menyalin global best sebelum generasi ini; perbaikan baru dipertahankan untuk generasi berikutnya.':'')+'</p>';
  }
  return html;
}

export function explain(e, s, result, p) {
  const chosen=e.chosen;
  if(e.phase==='setup')return `${s.tasks.length} task menunggu pada antrean. ${s.vms.length} VM berada di ${s.hosts.length} host. Belum ada task dijadwalkan atau dieksekusi. Seed ${s.seed}.`;
  if(e.phase==='etc')return s.mode==='custom'?'ETC custom independen dalam detik. Nilainya berasal dari input matriks, bukan pembagian MI/MIPS.':`ETᵢⱼ = MIᵢ / MIPSⱼ. Contoh T1 pada VM1: ${s.tasks[0].mi} / ${s.vms[0].mips} = ${f(result.et[0][0])} detik. Ready time awal setiap VM = 0.`;
  if(chosen){const t=chosen.task,v=chosen.vm;return e.type==='allocate'?`T${t+1} dialokasikan ke VM${v+1}. Ready time VM${v+1} kini ${f(e.ready[v])} s. Ini reservasi jadwal; task belum selesai dieksekusi.`:`Minimum T${t+1} = ${f(chosen.value)} s pada VM${v+1}. ${result.algorithm==='aco'?'Max-Min memilih nilai terbesar':'Min-Min memilih nilai terkecil'} di antara minimum task yang belum terjadwal. CT = ET + ready time.`;}
  if(e.type==='pheromone')return 'Mapping Max-Min menjadi feromon awal: 3,0 pada pasangan seed dan 1,0 pada pasangan lain. Seluruh jalur masih dapat dieksplorasi.';
  if(e.type==='chromosome')return `Mapping Min-Min menjadi kromosom 0; ${p.population-1} kromosom lain dibangkitkan acak. Posisi adalah task, nilai adalah VM.`;
  if(e.type==='explore')return `Iterasi ${e.iteration}: semut membangun kandidat dari Pᵢⱼ ∝ τᵢⱼ^${p.alpha} × ηᵢⱼ^${p.beta}. Titik konstruksi semut 1 disampel; semua ${p.ants} semut tetap dihitung. Inspeksi kandidat lain melalui pilihan semut.`;
  if(e.type==='evaluation')return `Terbaik iterasi ${f(e.iterationBest)} s. Global best ${f(e.bestMs)} s. Pembaruan hanya jika makespan turun; DoI tidak memecahkan nilai seri.`;
  if(e.type==='evaporate')return `Semua τ dikalikan ${f(1-p.rho,2)}, lalu dibatasi minimum 0,01. Jalur melemah sesuai nilai yang benar-benar dihitung.`;
  if(e.type==='reinforce')return `Deposit Q/MSbest = ${p.q}/${f(e.bestMs)} = ${f(e.deposit,3)} ditambahkan hanya pada rute global best. Rute lain mempertahankan nilai sesudah evaporasi.`;
  if(e.type==='fitness')return `Generasi ${e.iteration}: fitness = 1/makespan. Populasi lama dievaluasi untuk tournament; objective tetap makespan minimum.`;
  if(e.type==='selection')return `Dua tournament masing-masing ${p.tournament} peserta (dengan replacement) memilih induk. Anda dapat menginspeksi operasi semua anak pada generasi ini.`;
  if(e.type==='crossover')return `P(crossover) = ${p.crossover}. Jika dipicu, gen mulai titik potong diambil dari induk B. Angka dan segmen di bawah berasal dari operasi aktual.`;
  if(e.type==='mutation')return `Setiap gen berpeluang ${p.mutation} untuk dipilih ulang secara acak. VM baru dapat sama dengan VM lama. Tidak ada perubahan yang dipaksakan.`;
  if(e.type==='elitism')return `Elit global disalin ke slot 0, ${p.population-1} anak membentuk populasi berikutnya. Global best saat ini ${f(e.bestMs)} s.`;
  if(e.type==='convergence')return 'Kurva menunjukkan hasil setiap iterasi/generasi yang benar-benar dihitung: garis putus-putus terbaik iterasi, garis berwarna global best. Plateau adalah hasil yang sah.';
  const delta=result.initial.makespan-result.final.makespan;
  return `Makespan awal ${f(result.initial.makespan)} s → akhir ${f(result.final.makespan)} s (${delta>0?'turun '+f(delta)+' s':'tidak berubah'}). Jadwal belum dijalankan. Gunakan “Jalankan eksekusi” untuk mengamati task berjalan paralel.`;
}
