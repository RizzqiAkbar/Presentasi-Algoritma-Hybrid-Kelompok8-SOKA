import { pauseLab } from './simulation.js?v=cloud-1';
import { initBenchmark } from './ui/benchmark.js';
import { initWalkthrough } from './ui/walkthrough.js?v=guided-2';
import './ui/cloud-ops.js?v=cloud-2';

let current=1;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const reduceMotion=()=>reduced.matches||document.getElementById('reduce-motion').checked;
function goTo(n){
  n=Math.max(1,Math.min(5,n));const forward=n>=current;pauseLab();current=n;
  document.querySelectorAll('.slide').forEach((slide,i)=>{slide.hidden=i!==n-1;slide.classList.remove('enter-forward','enter-back');if(!slide.hidden&&!reduceMotion())slide.classList.add(forward?'enter-forward':'enter-back');});
  document.querySelectorAll('.slide-nav [data-slide]').forEach(button=>{if(Number(button.dataset.slide)===n)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  document.getElementById('slide-counter').textContent=`0${n} / 05`;
  document.getElementById('mobile-slide').value=String(n);
  document.getElementById('slide-prev').disabled=n===1;document.getElementById('slide-next').disabled=n===5;
  history.replaceState(null,'',`#${n}`);window.scrollTo({top:0,behavior:'instant'});
  if(n===1&&!reduceMotion()){const path=document.querySelector('.concept-route'),length=path.getTotalLength();path.animate([{strokeDasharray:`0 ${length}`},{strokeDasharray:`${length} ${length}`}],{duration:700,easing:'ease-out'});}
}
document.getElementById('mobile-slide').onchange=event=>goTo(Number(event.target.value));
document.getElementById('reduce-motion').onchange=event=>{document.body.classList.toggle('reduced-motion',event.target.checked);if(event.target.checked)document.getAnimations().forEach(animation=>animation.cancel());document.dispatchEvent(new Event('lab:motion'));};
document.querySelectorAll('[data-slide]').forEach(button=>button.onclick=()=>goTo(Number(button.dataset.slide)));
document.getElementById('slide-prev').onclick=()=>goTo(current-1);document.getElementById('slide-next').onclick=()=>goTo(current+1);
async function presentation(){
  const active=document.body.classList.toggle('presentation');document.getElementById('present').textContent=active?'Keluar layar penuh':'Layar penuh';
    if(active){try{await document.documentElement.requestFullscreen();}catch{}}
  else if(document.fullscreenElement)await document.exitFullscreen();
}
document.getElementById('present').onclick=presentation;
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){document.body.classList.remove('presentation');document.getElementById('present').textContent='Layar penuh';}});
document.addEventListener('keydown',event=>{
  if(document.querySelector('.cloud-ops-dialog[open]'))return;
  if(event.key==='Escape'&&!document.getElementById('config-dialog').open){document.body.classList.remove('presentation');document.getElementById('present').textContent='Layar penuh';return;}
  if(document.getElementById('config-dialog').open||event.target.closest('input,select,textarea,button,a,summary,[contenteditable]'))return;
  if(event.key==='ArrowRight'){event.preventDefault();goTo(current+1);}if(event.key==='ArrowLeft'){event.preventDefault();goTo(current-1);}
  if(event.key.toLowerCase()==='f')presentation();
  if(event.key==='Escape'){document.body.classList.remove('presentation');document.getElementById('present').textContent='Layar penuh';}
});
initBenchmark();initWalkthrough();
const requested=Number(location.hash.slice(1));goTo(Number.isInteger(requested)&&requested>=1&&requested<=5?requested:1);
