import { makespan } from '../engine/metrics.js';
import { f } from './renderers.js';

export const terms = {
  MI: 'Ukuran pekerjaan task dalam juta instruksi. Semakin besar MI, semakin banyak instruksi yang perlu dikerjakan.',
  MIPS: 'Kapasitas VM memproses juta instruksi per detik. Pada model normal, durasi task = MI / MIPS.',
  ETC: 'Estimated Time to Compute: matriks perkiraan waktu eksekusi setiap task pada setiap VM. Nilai setiap sel disebut ET.',
  CT: 'Completion time: waktu eksekusi (ET) ditambah ready time VM. CT dipakai untuk memilih alokasi berikutnya.',
  'Ready time': 'Waktu ketika VM siap menerima pekerjaan berikutnya, setelah seluruh task yang sudah dialokasikan padanya selesai.',
  'Seed feromon': 'Hasil Max-Min diberi bobot feromon awal lebih besar: 3 pada pasangan terpilih, 1 pada pasangan lain.',
  Feromon: 'Bobot pasangan task–VM yang memengaruhi probabilitas pemilihan VM oleh semut. Bobot bukan durasi eksekusi.',
  'Seed kromosom': 'Hasil Min-Min dipakai sebagai kromosom pertama. Kromosom lain pada populasi awal dibuat secara acak.',
  Kromosom: 'Satu pemetaan task ke VM. Posisi gen menunjukkan task dan nilai gen menunjukkan nomor VM.',
  Fitness: 'Ukuran kualitas kromosom: 1/makespan. Makespan lebih kecil berarti fitness lebih besar.',
  Evaporasi: 'Pengurangan feromon pada semua pasangan task–VM agar bobot lama tidak terus mendominasi pencarian.',
  Reinforcement: 'Penambahan feromon pada pasangan task–VM milik solusi global best.',
  'Tournament selection': 'Beberapa kromosom diambil acak, lalu yang memiliki makespan terkecil dipilih sebagai induk. Peserta boleh terambil berulang.',
  Crossover: 'Penggabungan gen dua induk. Single-point crossover mengambil segmen sebelum titik potong dari A dan sisanya dari B.',
  Mutasi: 'Pemilihan ulang nilai gen secara acak. VM baru dapat sama dengan VM semula.',
  Elitisme: 'Mempertahankan solusi terbaik dengan menyalinnya tanpa mutasi ke populasi berikutnya.',
  Konvergensi: 'Perkembangan kualitas solusi selama iterasi/generasi. Garis mendatar menunjukkan belum ada perbaikan pada ukuran tersebut.',
  'Current-best': 'Makespan terbaik pada satu iterasi/generasi. Pada ACO nilainya dapat lebih buruk daripada global best. Pada GA ini, elitisme membuat kedua kurva berimpit.',
  'Global-best': 'Makespan terendah yang sudah disimpan sejak seed awal. Pada implementasi ini hanya diperbarui jika makespan turun.',
  Makespan: 'Waktu yang dibutuhkan sampai seluruh task dalam jadwal selesai; sama dengan beban waktu terbesar di antara VM pada model lab.',
  DoI: 'Degree of Imbalance: (beban maksimum − minimum) / rata-rata beban. Lebih kecil berarti beban waktu antar-VM lebih merata.',
  Utilisasi: 'Total waktu kerja seluruh VM dibagi makespan × jumlah VM. VM menganggur tetap masuk perhitungan.',
  'Waktu algoritma': 'Waktu nyata untuk menghitung jadwal. Di lab, timer juga mencakup pembuatan trace; bukan clock eksekusi task atau runtime CloudSim.'
};

export function phaseTerms(event, algorithm) {
  if (event.phase === 'setup') return ['MI', 'MIPS'];
  if (event.phase === 'etc') return ['ETC', 'MI', 'MIPS'];
  if (event.phase === 'heuristic') return ['CT', 'Ready time'];
  if (event.phase === 'seed') return algorithm === 'aco' ? ['Seed feromon', 'Feromon'] : ['Seed kromosom', 'Kromosom'];
  if (event.phase === 'convergence') return ['Konvergensi', 'Current-best', 'Global-best'];
  if (event.phase === 'final') return ['Makespan', 'DoI', 'Utilisasi', 'Waktu algoritma'];
  const operation = { explore:['Feromon', 'Global-best'], evaluation:['Current-best', 'Global-best'], evaporate:['Evaporasi', 'Feromon'], reinforce:['Reinforcement', 'Global-best'], fitness:['Fitness', 'Kromosom'], selection:['Tournament selection', 'Fitness'], crossover:['Crossover', 'Kromosom'], mutation:['Mutasi', 'Kromosom'], elitism:['Elitisme', 'Global-best'] };
  return operation[event.type] || ['Makespan'];
}

export function compareCandidate(value, previous) {
  const delta = value - previous;
  if (Math.abs(delta) < 1e-8) return `sama dengan global best sebelumnya (${f(previous)} s)`;
  return `${delta < 0 ? 'lebih baik' : 'lebih buruk'} ${f(Math.abs(delta))} s daripada global best sebelumnya (${f(previous)} s)`;
}

export function lesson(event, scenario, result, parameters, { ant=0, operation=0, preview=null }={}) {
  const e=event, algorithm=result.algorithm;
  const before=e.iteration>1 ? result.history[e.iteration-2].best : result.initial.makespan;
  const candidate=e.candidates?.[ant];
  const op=e.operations?.[operation];
  if(preview) {
    const ms=makespan(preview.mapping,result.et);
    return `Inspeksi ${preview.label}: proyeksi makespan ${f(ms)} s, ${compareCandidate(ms,before)}. Gantt dan metrik menunjukkan kandidat ini untuk menjelaskan pengaruh alokasinya; solusi global best tetap disimpan.`;
  }
  if(e.phase==='setup') return `${scenario.tasks.length} task menunggu penjadwalan pada ${scenario.vms.length} VM di ${scenario.hosts.length} host. Skenario yang sama digunakan untuk kedua hybrid agar perbandingannya setara. Belum ada task dijadwalkan atau selesai.`;
  if(e.phase==='etc') return scenario.mode==='custom'
    ? `Matriks ETC memuat estimasi waktu input: T1 pada VM1 = ${f(result.et[0][0])} s. Scheduler memakai nilai ini untuk membandingkan VM. Mode custom tidak menghitung waktu dari MI/MIPS.`
    : `ETC menghitung durasi setiap pasangan task–VM agar scheduler dapat membandingkannya. T1 pada VM1: ${scenario.tasks[0].mi} MI / ${scenario.vms[0].mips} MIPS = ${f(result.et[0][0])} s. Waktu kesiapan VM ditambahkan pada tahap berikutnya.`;
  if(e.phase==='heuristic') {
    const {task,vm,value}=e.chosen, name=algorithm==='aco'?'Max-Min':'Min-Min';
    if(e.type==='evaluate')return `Scheduler menambahkan ready time ke ET untuk menghitung CT semua task tersisa. Nilai ini memperhitungkan pekerjaan yang sudah dialokasikan. Minimum CT tiap task menjadi dasar pemilihan ${name}.`;
    return `${name} memilih T${task+1} karena minimum CT-nya ${algorithm==='aco'?'terbesar':'terkecil'}, yaitu ${f(value)} s pada VM${vm+1}. ${e.type==='allocate'?`Alokasi ini membuat ready time VM${vm+1} menjadi ${f(e.ready[vm])} s; ${e.mapping.filter(v=>v>=0).length}/${scenario.tasks.length} task sudah terjadwal.`:'Pemilihan ini menentukan pasangan task–VM berikutnya; minimum pada matriks memperlihatkan perbandingannya.'} Task belum dieksekusi pada tahap ini.`;
  }
  if(e.type==='pheromone')return `Jadwal Max-Min dengan makespan ${f(result.initial.makespan)} s menjadi seed feromon. Pasangan terpilih diberi bobot 3 dan yang lain 1 untuk membimbing pencarian awal. Semua VM tetap dapat dipilih oleh semut.`;
  if(e.type==='chromosome')return `Jadwal Min-Min (${f(result.initial.makespan)} s) menjadi kromosom 0; ${parameters.population-1} kromosom lain dibuat acak. Seeding mempertahankan solusi awal, sementara anggota lain menyediakan variasi pemetaan task ke VM.`;
  if(e.type==='explore')return `Semut ${ant+1} menyusun pemetaan dengan probabilitas dari feromon dan estimasi waktu. Proyeksi kandidat lengkap ${f(candidate.ms)} s, ${compareCandidate(candidate.ms,before)}. Gantt menunjukkan bagian yang sudah dibangun; seluruh ${parameters.ants} kandidat dievaluasi pada substep evaluasi.`;
  if(e.type==='evaluation')return `${parameters.ants} kandidat dibandingkan berdasarkan makespan. Current-best iterasi ini ${f(e.iterationBest)} s, ${compareCandidate(e.iterationBest,before)}. Global-best yang dipertahankan ${f(e.bestMs)} s; pencarian tidak harus memperbaiki seed.`;
  if(e.type==='evaporate')return `Feromon pada semua pasangan dikurangi ${f(parameters.rho*100,0)}% dengan batas bawah 0,01 agar jejak lama tidak terus mendominasi. Matriks sekarang menunjukkan bobot sesudah evaporasi; global-best tetap ${f(e.bestMs)} s.`;
  if(e.type==='reinforce')return `Jalur global-best diperkuat dengan Q/makespan = ${parameters.q}/${f(e.bestMs)} = ${f(e.deposit,3)} agar solusi terbaik memengaruhi pencarian berikutnya. Global-best ${f(e.bestMs)} s, ${compareCandidate(e.bestMs,before)}.`;
  if(e.type==='fitness')return `Setiap kromosom dinilai dari makespan; fitness = 1/makespan. Penilaian ini diperlukan untuk memilih induk. Populasi berisi ${e.population.length} kromosom dan global-best sebelum generasi ini ${f(e.bestMs)} s.`;
  if(e.type==='selection')return `Dua tournament, masing-masing ${parameters.tournament} peserta, memilih induk dengan makespan terkecil. Operasi anak ${operation+1} memilih K${op.a.winner} dan K${op.b.winner}. Induk terpilih digunakan untuk membentuk pemetaan baru.`;
  if(e.type==='crossover')return op.point===null
    ? `Crossover tidak dipicu untuk anak ${operation+1}; anak menyalin induk A. Makespan anak sebelum mutasi ${f(makespan(op.crossed,result.et))} s, ${compareCandidate(makespan(op.crossed,result.et),before)}. Tidak setiap operasi menghasilkan perbaikan.`
    : `Anak ${operation+1} menggabungkan gen A sebelum T${op.point+1} dengan gen B mulai T${op.point+1} untuk mencoba pemetaan baru. Makespan sebelum mutasi ${f(makespan(op.crossed,result.et))} s, ${compareCandidate(makespan(op.crossed,result.et),before)}.`;
  if(e.type==='mutation')return `${op.mutations.length ? `Mutasi dipicu pada ${op.mutations.length} gen anak ${operation+1}; nilai sebelum/sesudah ditandai pada diagram.` : `Tidak ada mutasi yang dipicu pada anak ${operation+1}.`} Mutasi menambah variasi, tanpa menjamin perbaikan. Makespan anak ${f(makespan(op.child,result.et))} s, ${compareCandidate(makespan(op.child,result.et),before)}.`;
  if(e.type==='elitism')return `Elit global sebelum generasi ini disalin ke slot 0 agar tidak hilang. Setelah ${parameters.population-1} anak dievaluasi, global-best ${f(e.bestMs)} s, ${compareCandidate(e.bestMs,before)}. Populasi baru siap untuk generasi berikutnya.`;
  if(e.phase==='convergence')return `Garis putus-putus menunjukkan current-best pada setiap iterasi/generasi; garis berwarna menunjukkan global-best yang disimpan. ${algorithm==='ga'?'Pada GA ini keduanya berimpit karena elitisme. ':''}Nilai akhir ${f(result.final.makespan)} s dari seed ${f(result.initial.makespan)} s. Plateau berarti belum ada perbaikan pada metrik tersebut.`;
  const change=result.initial.makespan-result.final.makespan;
  return `Jadwal akhir memiliki makespan ${f(result.final.makespan)} s (${change>1e-8?'turun '+f(change)+' s dari seed':'sama dengan seed'}), DoI ${f(result.final.doi,3)} dan utilisasi ${f(result.final.utilization,1)}%. Gunakan Jalankan eksekusi untuk melihat task berjalan paralel. Alokasi belum berarti task selesai; makespan lebih kecil juga tidak menjamin DoI lebih rendah.`;
}
