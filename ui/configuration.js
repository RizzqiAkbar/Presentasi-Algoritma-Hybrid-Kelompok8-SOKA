import { generate, presets, defaults, validate, etc } from '../engine/scenario.js';
const $ = id => document.getElementById(id);
const num = id => Number($(id).value);
const parameterLabels = { ants:'ACO · jumlah semut', iterations:'ACO · iterasi', alpha:'ACO · alpha', beta:'ACO · beta', rho:'ACO · evaporasi', q:'ACO · Q', population:'GA · populasi', generations:'GA · generasi', tournament:'GA · tournament k', crossover:'GA · peluang crossover', mutation:'GA · peluang mutasi' };

export function configure(getCurrent, apply, pause) {
  let draft, generatedSpec;
  $('preset').innerHTML = Object.entries(presets).map(([key,p])=>`<option value="${key}">${p.name}</option>`).join('');
  $('parameter-inputs').innerHTML=Object.entries(defaults).map(([key,value])=>`<label>${parameterLabels[key]}<input id="p-${key}" type="number" step="${['alpha','beta','rho','q','crossover','mutation'].includes(key)?'any':'1'}" min="${key==='population'?2:key==='q'?0.001:['alpha','beta','rho','crossover','mutation'].includes(key)?0:1}" max="${['rho','crossover','mutation'].includes(key)?1:['alpha','beta'].includes(key)?5:key==='q'?10000:key==='tournament'?10:100}" value="${value}" required></label>`).join('');
  const spec = () => ({ hosts:num('host-count'),vms:num('vm-count'),tasks:num('task-count'),seed:num('seed'),capacity:num('host-capacity'),workload:$('workload').value,heterogeneous:$('heterogeneous').value==='true' });
  function showError(message){$('config-error').textContent=message;$('config-error').hidden=false;$('config-error').scrollIntoView({block:'nearest'});}
  $('config-form').addEventListener('invalid',event=>{
    let section=event.target.closest('details');
    while(section){section.open=true;section=section.parentElement.closest('details');}
  },true);
  function editors() {
    $('editors').innerHTML=`<fieldset><legend>Kapasitas host (MIPS)</legend>${draft.hosts.map((h,i)=>`<div class="edit-row"><label>Host ${i+1}<input type="number" data-host="${i}" min="1" max="1000000" value="${h.capacity}" required></label></div>`).join('')}</fieldset><fieldset><legend>VM & placement</legend>${draft.vms.map((v,i)=>`<div class="edit-row"><label>VM${i+1} MIPS<input type="number" data-vm="${i}" min="1" max="100000" value="${v.mips}" required></label><label>Host VM${i+1}<select data-placement="${i}">${draft.hosts.map((_,h)=>`<option value="${h}" ${h===v.host?'selected':''}>Host ${h+1}</option>`).join('')}</select></label></div>`).join('')}</fieldset><fieldset><legend>Panjang task (MI)</legend>${draft.tasks.map((t,i)=>`<div class="edit-row"><label>T${i+1} MI<input type="number" data-task-mi="${i}" min="1" max="100000000" value="${t.mi}" required></label></div>`).join('')}</fieldset>`;
    $('custom-matrix').value=etc(draft).map(row=>row.map(x=>Number(x.toPrecision(10))).join(', ')).join('\n');
  }
  function regenerate() {
    const input=spec();
    if(!Number.isInteger(input.hosts)||input.hosts<1||input.hosts>8||!Number.isInteger(input.vms)||input.vms<1||input.vms>24||!Number.isInteger(input.tasks)||input.tasks<1||input.tasks>100)throw new Error('Host 1–8, VM 1–24, task 1–100; gunakan bilangan bulat.');
    draft=generate(input);generatedSpec=JSON.stringify(input);$('etc-mode').value='derived';editors();
  }
  $('configure').onclick=()=>{
    pause();const current=getCurrent();draft=structuredClone(current.scenario);
    $('seed').value=draft.seed;$('host-count').value=draft.hosts.length;$('vm-count').value=draft.vms.length;$('task-count').value=draft.tasks.length;$('host-capacity').value=draft.hosts[0].capacity;
    generatedSpec=JSON.stringify(spec());$('etc-mode').value=draft.mode;
    for(const key of Object.keys(defaults))$(`p-${key}`).value=current.parameters[key];
    $('config-error').hidden=true;editors();$('config-dialog').showModal();
  };
  for(const id of ['close-config','cancel-config'])$(id).onclick=()=>$('config-dialog').close();
  $('generate').onclick=()=>{try{regenerate();$('config-error').hidden=true;}catch(e){showError(e.message);}};
  $('preset').onchange=()=>{
    const p=presets[$('preset').value];$('host-count').value=p.hosts;$('vm-count').value=p.vms;$('task-count').value=p.tasks;$('workload').value=p.workload;$('heterogeneous').value=String(p.heterogeneous);$('host-capacity').value=10000;
    regenerate();$('config-error').hidden=true;
  };
  $('config-form').onsubmit=event=>{
    event.preventDefault();
    try {
      if(JSON.stringify(spec())!==generatedSpec)throw new Error('Pengaturan generator berubah. Klik “Bangkitkan data dari pengaturan”, lalu terapkan.');
      document.querySelectorAll('[data-host]').forEach(x=>draft.hosts[Number(x.dataset.host)].capacity=Number(x.value));
      document.querySelectorAll('[data-vm]').forEach(x=>draft.vms[Number(x.dataset.vm)].mips=Number(x.value));
      document.querySelectorAll('[data-placement]').forEach(x=>draft.vms[Number(x.dataset.placement)].host=Number(x.value));
      document.querySelectorAll('[data-task-mi]').forEach(x=>draft.tasks[Number(x.dataset.taskMi)].mi=Number(x.value));
      draft.mode=$('etc-mode').value;
      if(draft.mode==='custom')draft.custom=$('custom-matrix').value.trim().split(/\n/).map(row=>row.split(',').map(s=>s.trim()===''?NaN:Number(s.trim())));
      const parameters=Object.fromEntries(Object.keys(defaults).map(key=>[key,num(`p-${key}`)]));
      validate(draft,parameters);$('config-dialog').close();apply(structuredClone(draft),parameters);
    }catch(e){showError(e.message);}
  };
}
