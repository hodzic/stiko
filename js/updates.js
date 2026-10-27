// Updates: a new version downloads in the background and waits; a toast (or Check for updates on the About page)
// switches to it and reloads. The app checks again whenever it comes back to the front.
import {U} from './i18n.js';
import {toast} from './ui.js';

let reg=null, waiting=null;
const listeners=new Set();
export const onUpdateState=f=>{ listeners.add(f); return ()=>listeners.delete(f); };
const offer=w=>{ waiting=w; listeners.forEach(f=>f()); toast(U('updateReady'),{ms:15000,onTap:applyUpdate}); };
export const updateWaiting=()=>!!waiting;
export function applyUpdate(){ waiting?.postMessage({type:'SKIP_WAITING'}); }

// Check now. Resolves to 'ready', 'downloading', 'current', 'failed' or 'none' (no service worker).
export async function checkForUpdate(){
  if(waiting) return 'ready';
  if(!reg) return 'none';
  try{ await reg.update(); }catch{ return 'failed'; }
  const w=reg.installing||reg.waiting;
  if(!w) return 'current';
  if(w.state==='installed'){ offer(w); return 'ready'; }
  return 'downloading';
}

export function registerUpdates(){
  if(!('serviceWorker' in navigator)) return;
  // The first install also takes control; only an update replacing a running version reloads.
  // Checked at each change, not at page load, so a page opened before the first install updates too.
  let ctl=navigator.serviceWorker.controller, reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{ const had=ctl; ctl=navigator.serviceWorker.controller; if(had&&!reloading){ reloading=true; location.reload(); } });
  navigator.serviceWorker.register('/stiko/sw.js').then(r=>{
    reg=r;
    if(r.waiting&&navigator.serviceWorker.controller) offer(r.waiting);
    r.addEventListener('updatefound',()=>{ const w=r.installing;
      w?.addEventListener('statechange',()=>{ if(w.state==='installed'&&navigator.serviceWorker.controller) offer(w); }); });
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState!=='visible') return;
      if(r.waiting&&navigator.serviceWorker.controller) offer(r.waiting); else r.update().catch(()=>{}); });
  }).catch(()=>{});
}
