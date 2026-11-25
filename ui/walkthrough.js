import { run } from '../engine/run.js';
import { generate, defaults } from '../engine/scenario.js';
import { schedule } from '../engine/metrics.js';
import { matrix, antGraph, pheromoneMatrix, genetics, f, gantt } from './renderers.js';

export function initWalkthrough(){
  const s=generate({tasks:6,vms:3,hosts:2,seed:8});
  for(const algorithm of ['aco','ga']){
    const r=run(s,{...defaults,iterations:3,generations:3},algorithm),root=document.getElementById(`walk-${algorithm}`);
    root.classList.toggle('ga-theme',algorithm==='ga');
    const find=type=>r.events.find(e=>e.type===type);
    const acoSteps=[['ETC & completion time','etc'],['Pilih Max-Min','choose'],['Seed feromon','pheromone'],['Eksplorasi semut','explore'],['Evaporasi & penguatan','reinforce']];
    const gaSteps=[['Pilih Min-Min','choose'],['Seed kromosom','chromosome'],['Fitness & seleksi','selection'],['Single-point crossover','crossover'],['Mutasi & elitisme','mutation']];
    const steps=algorithm==='aco'?acoSteps:gaSteps;
    let active=0;
    root.innerHTML=`<nav class="walk-steps" aria-label="Langkah ${algorithm.toUpperCase()}">${steps.map(([name,type],i)=>`<button data-walk="${type}" aria-pressed="${i===0}"><span>${String(i+1).padStart(2,'0')}</span>${name}</button>`).join('')}</nav><div class="walk-column"><div class="walk-display"></div><div class="walk-actions"><button data-walk-prev aria-label="Langkah ${algorithm.toUpperCase()} sebelumnya">Sebelumnya</button><output></output><button data-walk-next class="primary" aria-label="Langkah ${algorithm.toUpperCase()} berikutnya">Berikutnya</button></div></div>`;
    function render(type){
      const e=find(type),node=root.querySelector('.walk-display');
      active=steps.findIndex(step=>step[1]===type);
      root.querySelectorAll('[data-walk]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.walk===type)));
      let description='',visual='',interpretation='';
      if(type==='etc'){description=`Contoh yang dihitung: ${s.tasks[0].mi} MI / ${s.vms[0].mips} MIPS = ${f(r.et[0][0])} s. Setiap keputusan berikutnya menambahkan ready time VM pada ET.`;visual=matrix(r.et,e);}
      if(type==='choose'){description=`${algorithm==='aco'?'Max-Min memilih minimum terbesar':'Min-Min memilih minimum terkecil'}: T${e.chosen.task+1} → VM${e.chosen.vm+1}, CT ${f(e.chosen.value)} s. Periksa nilai minimum tiap baris pada matriks.`;visual=matrix(r.et,e);}
      if(type==='pheromone'){description='Mapping Max-Min menjadi prioritas awal, bukan keputusan permanen. Pasangan seed memperoleh τ = 3; jalur lain τ = 1.';visual=antGraph(e)+pheromoneMatrix(e.tau);}
      if(type==='explore'){description=`Semut mencoba pemetaan task ke VM berdasarkan feromon dan estimasi waktu. Kandidat semut 1 memiliki proyeksi makespan ${f(e.candidates[0].ms)} s. Semua ${defaults.ants} semut tetap dihitung; kandidatnya tidak harus lebih baik daripada seed.`;visual=antGraph(e,0,e.task);}
      if(type==='reinforce'){const evap=find('evaporate');description=`Setelah τ × (1−0,2) dengan floor 0,01, deposit = 100/${f(e.bestMs)} = ${f(e.deposit,3)} pada pasangan global best. Contoh τ(T1,VM1): ${f(find('pheromone').tau[0][0],3)} → ${f(evap.tau[0][0],3)} → ${f(e.tau[0][0],3)}.`;visual=antGraph(e)+pheromoneMatrix(e.tau);}
      if(type==='chromosome'){description='Gen T1, T2, … berisi nomor VM. Kromosom pertama berasal dari Min-Min; anggota lain acak. Skor di kanan dihitung dari makespan aktual.';visual=genetics(e,r.et);}
      if(type==='selection'){description='Fitness = 1/makespan. Dua tournament berukuran 3 memilih induk dengan makespan paling rendah dari peserta yang ditarik.';visual=genetics(e,r.et);}
      if(type==='crossover'){description='Single-point crossover berpeluang 0,8. Segmen sebelum titik potong dari A, sisanya dari B; bila tidak dipicu anak menyalin A.';visual=genetics(e,r.et);}
      if(type==='mutation'){description='Setiap gen berpeluang 0,05 dipilih ulang, termasuk kemungkinan VM yang sama. Elitisme menyalin global best tanpa mutasi ke slot 0 generasi berikutnya.';visual=genetics(e,r.et)+`<details><summary>Jadwal global best setelah generasi 1</summary>`+gantt(schedule(find('elitism').mapping,r.et),s.vms.length,{interactive:false,prefix:'walk-'})+'</details>';}
      if(type==='etc')interpretation='Baris menunjukkan task, kolom menunjukkan VM, dan setiap sel adalah perkiraan durasi eksekusinya.';
      if(type==='choose')interpretation=`Sel terpilih adalah minimum pada baris T${e.chosen.task+1}. ${algorithm==='aco'?'Max-Min membandingkan minimum antarbaris dan mengambil yang terbesar.':'Min-Min membandingkan minimum antarbaris dan mengambil yang terkecil.'}`;
      if(type==='pheromone')interpretation='Rute tegas mengikuti jadwal Max-Min. Bobot awal rute ini 3, sedangkan pasangan lain 1; pilihannya tetap dapat berubah selama pencarian.';
      if(type==='explore')interpretation='Titik task dan kotak VM dihubungkan oleh jalur dengan tebal menurut feromon. Persentase menunjukkan peluang pemilihan VM, bukan jaminan bahwa VM tersebut dipilih.';
      if(type==='reinforce')interpretation='Bandingkan nilai feromon awal, sesudah evaporasi dan sesudah penguatan. Hanya pasangan pada global best yang memperoleh deposit.';
      if(type==='chromosome')interpretation='Baca setiap kolom sebagai task. Angka pada gen adalah nomor VM; nilai di kanan adalah makespan dan fitness kromosom itu.';
      if(type==='selection')interpretation=`Tournament pada contoh memilih K${e.operations[0].a.winner} dan K${e.operations[0].b.winner}. Induk ini menjadi sumber gen untuk anak berikutnya.`;
      if(type==='crossover')interpretation=e.operations[0].point===null?'Pada operasi ini crossover tidak dipicu. Baris anak menyalin A; tidak ada pertukaran yang dipaksakan untuk keperluan ilustrasi.':`Garis potong berada sebelum T${e.operations[0].point+1}. Cocokkan gen anak di kiri dengan A dan di kanan dengan B.`;
      if(type==='mutation')interpretation=e.operations[0].mutations.length?`${e.operations[0].mutations.length} gen terkena percobaan mutasi. Kotak yang ditandai dan keterangan VM lama/baru menunjukkan hasil aktual; elit tidak ikut dimutasi.`:'Pada anak contoh tidak ada mutasi yang dipicu. Generasi tetap dihitung dan elit global tetap dipertahankan.';
      node.innerHTML=`<h3>${steps[active][0]}</h3><p>${description}</p><div class="svg-scroll">${visual}</div><p class="walk-interpretation"><strong>Cara membaca diagram:</strong> ${interpretation}</p>`;
      root.querySelector('[data-walk-prev]').disabled=active===0;
      root.querySelector('[data-walk-next]').disabled=active===steps.length-1;
      root.querySelector('.walk-actions output').textContent=`Langkah ${active+1} / ${steps.length}`;
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.getElementById('reduce-motion').checked)node.animate([{opacity:.35},{opacity:1}],{duration:220});
    }
    root.querySelector('.walk-steps').onclick=event=>{const b=event.target.closest('[data-walk]');if(b)render(b.dataset.walk);};render(steps[0][1]);
    root.querySelector('[data-walk-prev]').onclick=()=>render(steps[active-1][1]);
    root.querySelector('[data-walk-next]').onclick=()=>render(steps[active+1][1]);
  }
}
