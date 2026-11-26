import { pauseLab, labSnapshot } from '../simulation.js?v=cloud-1';

const button = document.getElementById('open-3d');
let dialog, frame, closing = false;
function close() {
  if (!dialog || closing) return;
  closing = true;
  frame.contentWindow?.postMessage({ type: 'cloud-ops:dispose' }, location.origin);
  // The timeout also provides a return path if WebGL or the game module failed.
  const mounted = dialog;
  setTimeout(() => finish(mounted), 600);
}
function finish(mounted = dialog) {
  if (!dialog || mounted !== dialog) return;
  dialog.close(); frame.src = 'about:blank'; dialog.remove(); dialog = frame = null;
  closing = false; button.focus();
}
button.addEventListener('click', () => {
  if (dialog) return;
  pauseLab();
  try { sessionStorage.setItem('cloud-ops:lab', JSON.stringify(labSnapshot())); } catch { /* The training scenario remains available when storage is disabled. */ }
  dialog = document.createElement('dialog'); dialog.className = 'cloud-ops-dialog';
  dialog.setAttribute('aria-label', 'Cloud Ops 3D — Jadilah Scheduler');
  const emergency = document.createElement('button'); emergency.textContent = 'Kembali ke presentasi'; emergency.className = 'cloud-ops-return'; emergency.onclick = close;
  frame = document.createElement('iframe'); frame.title = 'Cloud Ops 3D — Jadilah Scheduler'; frame.src = './cloud-ops/'; frame.width = '1920'; frame.height = '1080';
  dialog.append(emergency, frame); document.body.append(dialog);
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  frame.addEventListener('load', () => { frame.focus(); });
  dialog.showModal();
});
window.addEventListener('message', event => {
  if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'cloud-ops:close') close();
  if (event.data?.type === 'cloud-ops:ready') dialog.querySelector('.cloud-ops-return').hidden = true;
  if (event.data?.type === 'cloud-ops:disposed') finish();
});
