import { f, esc } from './renderers.js';
import { algorithms, metricDefinitions, filterRows, improvement, validateHistorical, validateControlled, selectHybrid, chartPoints, comparisonCounts } from './academic-data.js';

const $ = id => document.getElementById(id), series = ['hybrid-aco','aco','gwo'];
let historical, controlled, currentTab = 'hybrid';
const label = id => algorithms[id].label;
const fmt = (value, metric) => f(value, metricDefinitions[metric].digits);
const legend = ids => ids.map(id => `<span><i class="academic-swatch" style="background:${algorithms[id].color}"></i>${label(id)}</span>`).join('');

function drawChart(points, metric, uncertainty, unitOverride) {
  const meta = metricDefinitions[metric], ns = [...new Set(points.map(p => p.n))], ids = [...new Set(points.map(p => p.algorithm))];
  const unit = unitOverride || meta.unit;
  if (!points.length) return '<p>Tidak ada dataset dalam filter ini.</p>';
  const w = 1300, h = 310, left = 78, right = 22, top = 32, bottom = 256, group = (w-left-right)/ns.length;
  const max = Math.max(...points.map(p => p.value + (uncertainty ? p.sd : 0)), .000001) * 1.1;
  const y = value => bottom - value / max * (bottom-top);
  let out = `<text x="${left}" y="17" fill="#59615c" font-size="12">${esc(meta.label)} (${esc(unit)})</text>`;
  for (let k=0;k<=4;k++) { const value = max*k/4; out += `<path d="M${left} ${y(value)}H${w-right}" stroke="#d5d8cf"/><text x="${left-12}" y="${y(value)+4}" text-anchor="end" fill="#59615c" font-size="12">${f(value, metric==='doi'?3:metric==='throughput'?2:0)}</text>`; }
  ns.forEach((n, i) => {
    const bar = Math.min(32, group/(ids.length+1)), center = left + group*(i+.5);
    points.filter(p => p.n === n).forEach((p, a) => {
      const x = center + (a-(ids.length-1)/2)*bar - bar*.43;
      const tooltip = `${n} task · ${label(p.algorithm)} · ${meta.label}: ${fmt(p.value,metric)} ${unit}${uncertainty?` · SD ${fmt(p.sd,metric)} · terbaik ${fmt(p.best,metric)} · terburuk ${fmt(p.worst,metric)} · ${p.runs} run`: ' · satu run historis'}`;
      out += `<g tabindex="0" role="img" aria-label="${esc(tooltip)}"><title>${esc(tooltip)}</title><rect x="${x}" y="${y(p.value)}" width="${bar*.86}" height="${bottom-y(p.value)}" fill="${algorithms[p.algorithm].color}"/>`;
      if (uncertainty) { const cx = x+bar*.43, high=y(p.value+p.sd), low=y(Math.max(0,p.value-p.sd)); out += `<path d="M${cx} ${high}V${low}M${cx-4} ${high}h8M${cx-4} ${low}h8" stroke="#252c2a" stroke-width="1.5"/>`; }
      out += '</g>';
    });
    out += `<text x="${center}" y="${bottom+23}" text-anchor="middle" fill="#59615c" font-size="12">${n}</text>`;
  });
  out += `<text x="${(left+w-right)/2}" y="305" text-anchor="middle" fill="#59615c" font-size="12">Jumlah task GoCJ</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(meta.label)}, ${ns.length} dataset. ${uncertainty?'Rata-rata dan simpangan baku 10 seed.':'Rekaman historis konfigurasi lama.'} Nilai tersedia pada tabel.">${out}</svg>`;
}
function renderHybrid() {
  const chosen = selectHybrid(historical.hybrid), name = chosen.selected ? label(chosen.selected) : 'Tidak ada hybrid dominan';
  $('hybrid-selection').textContent = `${name} dipilih untuk demonstrasi utama: makespan lebih rendah pada ${Math.max(chosen.aco,chosen.ga)} dari ${chosen.count} dataset historis. Kesimpulan ini berlaku pada rekaman tersebut.`;
  const pairs = Array.from({length:10},(_,i)=>(i+1)*100).map(n=>({a:historical.hybrid.find(r=>r.n===n&&r.algorithm==='hybrid-aco'),g:historical.hybrid.find(r=>r.n===n&&r.algorithm==='hybrid-ga')}));
  const doi = pairs.filter(({a,g})=>a.doi<g.doi).length, util = pairs.filter(({a,g})=>a.util>g.util).length, time = pairs.filter(({a,g})=>g.time<a.time).length;
  $('hybrid-findings').innerHTML = `<p><strong>Keseimbangan dan utilisasi</strong><br>Max-Min + ACO memberi DoI lebih rendah pada ${doi}/${pairs.length} dataset dan utilisasi lebih tinggi pada ${util}/${pairs.length}.</p><p><strong>Trade-off waktu komputasi</strong><br>Min-Min + GA lebih cepat menghitung pada ${time}/${pairs.length} dataset. Runtime algoritma berbeda dari makespan eksekusi task.</p><p><strong>Makna pemilihan</strong><br>Hybrid utama dipilih berdasarkan makespan eksperimen ini. Parameter, workload dan infrastruktur lain dapat memberi hasil berbeda.</p>`;
}
function renderControlled() {
  if (!controlled) return;
  const metric = $('benchmark-metric').value, range = $('benchmark-filter').value, policy = $('comparison-budget').value;
  const rows = controlled.cohorts[policy].rows, selected = selectHybrid(historical.hybrid).selected;
  const ids = [selected || 'hybrid-aco', 'aco', 'gwo'], filtered = filterRows(rows,range), meta=metricDefinitions[metric];
  const points = chartPoints(rows,ids,metric,range);
  $('controlled-chart').innerHTML = drawChart(points,metric,true);
  $('controlled-caption').textContent = `${meta.label} (${meta.unit}) · mean ± SD sampel, 10 seed per sel. Δ positif berarti hybrid lebih baik.`;
  $('controlled-head').innerHTML = `<tr><th>Task</th>${ids.map(id=>`<th>${label(id)}</th>`).join('')}<th>Δ vs ACO (%)</th><th>Δ vs GWO (%)</th></tr>`;
  const ns=[...new Set(points.map(p=>p.n))];
  $('controlled-body').innerHTML = ns.map(n=>{
    const p=ids.map(id=>points.find(p=>p.n===n&&p.algorithm===id));
    const delta=p.slice(1).map(other=>improvement(p[0].value,other.value,meta.higher));
    return `<tr><th scope="row">${n}</th>${p.map(v=>`<td>${fmt(v.value,metric)} ± ${fmt(v.sd,metric)}</td>`).join('')}${delta.map(v=>`<td>${v===null?'Tidak terdefinisi':f(v,2)}</td>`).join('')}</tr>`;
  }).join('');
  const counts=ids.slice(1).map(id=>({id,...comparisonCounts(filtered,ids[0],id,metric)}));
  $('controlled-summary').textContent = `${label(ids[0])}: rata-rata ${meta.label.toLowerCase()} ${meta.higher?'lebih tinggi':'lebih rendah'} dari ${counts.map(c=>`${label(c.id)} pada ${c.wins}/${c.count} dataset${c.ties?` (${c.ties} seri)`:''}`).join(' dan ')}. Perbandingan memakai konfigurasi dan rumus yang sama; bukan jaminan universal.`;
  $('budget-note').textContent = policy==='tuned' ? 'Parameter asli: hybrid 25×50, ACO murni 20×100, GWO 50×25. Total evaluasi makespan 1.251 / 2.000 / 1.300; anggaran berbeda.' : 'Anggaran pencarian: 1.250 kandidat stokastik per metode (hybrid 25×50; ACO 25×50; GWO 50×(24+1)). Hybrid juga mengevaluasi satu seed Max-Min.';
  $('controlled-statistics').innerHTML = filtered.map(r=>{const m=r.metrics[metric];return `<tr><th>${r.n}</th><td>${label(r.algorithm)}</td><td>${fmt(m.mean,metric)}</td><td>${fmt(m.sd,metric)}</td><td>${fmt(m.best,metric)}</td><td>${fmt(m.worst,metric)}</td><td>${r.runs}</td></tr>`;}).join('');
  $('controlled-provenance').textContent = `${controlled.cohorts[policy].successfulRuns} run berhasil dalam cohort ini. Seed ${controlled.seeds.join(', ')}; SD sampel ddof=1. ${controlled.hardware}. Gap model–CloudSim terbesar ${f(controlled.cohorts[policy].maxModelGapPct,5)}%. Hasil Min-Min + GA tambahan tersedia pada statistik/JSON cohort parameter asli.`;
}
function renderHistorical() {
  if (!historical) return;
  const key=$('meta-history-metric').value, range=$('benchmark-filter').value, meta=metricDefinitions[key];
  const points=chartPoints(historical.meta,['aco','gwo'],key,range,false);
  $('historical-meta-chart').innerHTML=drawChart(points,key,false,key==='cost'?'satuan model lama':undefined);
  $('historical-meta-caption').textContent=`${meta.label} (${key==='cost'?'satuan biaya model lama':meta.unit}) · satu run seed 42; konfigurasi berbeda dari hybrid historis dan eksperimen baru.`;
  $('historical-meta-body').innerHTML=[...new Set(points.map(p=>p.n))].map(n=>`<tr><th scope="row">${n}</th>${['aco','gwo'].map(id=>`<td>${fmt(points.find(p=>p.n===n&&p.algorithm===id).value,key)}</td>`).join('')}</tr>`).join('');
}
function render() {
  if (!historical || !controlled) return;
  renderControlled(); renderHistorical();
  $('academic-legend').innerHTML = legend(currentTab==='hybrid'?['hybrid-aco','hybrid-ga']:series);
}
function setTab(next, focus=false) {
  currentTab=next;
  for(const name of ['hybrid','meta']) {
    const active=name===next, button=$(`tab-${name}`);
    button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
  }
  $('hybrid-benchmark').hidden=next!=='hybrid';$('cross-benchmark').hidden=next!=='meta';
  if(focus)$(`tab-${next}`).focus(); render();
}
async function load() {
  $('academic-status').hidden=false;$('academic-status').textContent='Memuat rekaman dan hasil eksperimen terkontrol…';$('retry-academic').hidden=true;$('tab-meta').disabled=true;
  try {
    const get=async name=>{const response=await fetch(new URL(`../data/benchmarks/${name}.json`,import.meta.url));if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);return response.json();};
    const [h,c]=await Promise.all([get('historical'),get('controlled')]);
    historical=validateHistorical(h);controlled=validateControlled(c);
    renderHybrid();render();$('tab-meta').disabled=false;$('academic-status').hidden=true;
    const matched=historical.datasetAudit.filter(r=>r.orderedEqual).length;
    $('dataset-audit').textContent=`${matched}/${historical.datasetAudit.length} pasangan dataset identik pada urutan length_mi setelah parsing. Hash file JSON dan TXT berbeda karena format; hash workload terurut cocok. Konfigurasi historis tetap berbeda, sehingga dataset yang sama belum cukup untuk membandingkan makespan langsung.`;
  } catch(error) {
    $('academic-status').textContent=`Data pembanding belum dapat dimuat: ${error.message}. Benchmark hybrid asli tetap tersedia. Gunakan server HTTP dan coba muat ulang data.`;
    $('retry-academic').hidden=false;
  }
}
$('tab-hybrid').addEventListener('click',()=>setTab('hybrid'));
$('tab-meta').addEventListener('click',()=>setTab('meta'));
for(const id of ['tab-hybrid','tab-meta'])$(id).addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();if($('tab-meta').disabled)return;
  setTab(event.key==='Home'?'hybrid':event.key==='End'?'meta':currentTab==='hybrid'?'meta':'hybrid',true);
});
for(const id of ['benchmark-filter','benchmark-metric','comparison-budget'])$(id).addEventListener('change',render);
$('meta-history-metric').addEventListener('change',renderHistorical);
$('retry-academic').addEventListener('click',load);
load();
