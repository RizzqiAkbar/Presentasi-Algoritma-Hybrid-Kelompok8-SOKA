import { f } from './renderers.js';
export const benchmark = [
  {n:100,ms:[899.7,852.8],doi:[.160,.027],util:[93.1,98.9],cost:[25131,25297],time:[19.6,60.9]},
  {n:200,ms:[1704.7,1605.2],doi:[.271,.011],util:[94.3,99.6],cost:[48221,47953],time:[28.2,88.6]},
  {n:300,ms:[2299.2,2248.1],doi:[.069,.003],util:[97.7,99.8],cost:[67367,67336],time:[26.3,130.2]},
  {n:400,ms:[4406.1,4154.9],doi:[.207,.007],util:[94.3,99.8],cost:[124682,124396],time:[31.5,152.4]},
  {n:500,ms:[4375.9,4199.2],doi:[.092,.005],util:[95.8,99.8],cost:[125812,125741],time:[36.9,170.9]},
  {n:600,ms:[5623.5,5493.2],doi:[.135,.003],util:[96.8,99.9],cost:[163310,164640],time:[45.3,207.5]},
  {n:700,ms:[6782.1,6485.2],doi:[.186,.004],util:[94.8,99.9],cost:[192795,194383],time:[53.3,246.8]},
  {n:800,ms:[6609.1,6389.1],doi:[.239,.002],util:[93.7,99.9],cost:[185812,191522],time:[64.6,280.0]},
  {n:900,ms:[9299.7,8898.3],doi:[.180,.003],util:[94.4,99.9],cost:[263342,266631],time:[68.7,314.7]},
  {n:1000,ms:[7638.4,7412.9],doi:[.105,.003],util:[96.0,99.9],cost:[219898,222191],time:[92.5,354.0]}
];
export function initBenchmark(){
  const filter=document.getElementById('benchmark-filter'),metric=document.getElementById('benchmark-metric');
  function render(){
    const rows=benchmark.filter(r=>filter.value==='all'||filter.value==='low'&&r.n<=300||filter.value==='mid'&&r.n>=400&&r.n<=700||filter.value==='high'&&r.n>=800),key=metric.value;
    document.getElementById('benchmark-body').innerHTML=rows.map(r=>`<tr><th scope="row">${r.n}</th><td>${f(r.ms[0],1)}</td><td>${f(r.ms[1],1)}</td><td>${f(r.ms[1]-r.ms[0],1)}</td><td>${r.doi.map(x=>f(x,3)).join(' / ')}</td><td>${r.util.map(x=>f(x,1)+'%').join(' / ')}</td><td>${r.cost.map(x=>f(x,0)).join(' / ')}</td><td>${r.time.map(x=>f(x,1)).join(' / ')}</td></tr>`).join('');
    const w=1300,h=300,left=70,top=25,bottom=255,plot=w-left-25,group=plot/rows.length,max=Math.max(...rows.flatMap(r=>r[key]))*1.1;
    let out='';
    for(let k=0;k<=4;k++){const y=bottom-(bottom-top)*k/4;out+=`<path d="M${left} ${y}H${w-20}" stroke="#d5d8cf"/><text x="${left-12}" y="${y+4}" text-anchor="end" fill="#59615c" font-size="12">${f(max*k/4,key==='doi'?3:key==='util'?1:0)}</text>`;}
    rows.forEach((r,i)=>{
      const bar=Math.min(group*.27,36),center=left+group*(i+.5);
      for(let algo=0;algo<2;algo++){const val=r[key][algo],height=val/max*(bottom-top),x=center+(algo===0?-bar-2:2);out+=`<g><title>${r.n} task · ${algo===0?'GA':'ACO'}: ${val}</title><rect x="${x}" y="${bottom-height}" width="${bar}" height="${height}" fill="${algo===0?'#9c4426':'#12675e'}"/></g>`;}
      out+=`<text x="${center}" y="${bottom+23}" text-anchor="middle" fill="#59615c" font-size="12">${r.n}</text>`;
    });
    document.getElementById('benchmark-chart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik ${metric.options[metric.selectedIndex].text} pada ${rows.length} dataset. Nilai lengkap tersedia pada tabel di bawah.">${out}</svg>`;
  }
  filter.onchange=render;metric.onchange=render;render();
}
