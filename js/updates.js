// Updates: a new version downloads in the background and waits; a toast (or Check for updates on the About page)
// switches to it and reloads. The mechanics are /shared/update.js on hodzic.github.io, shared by the apps there
// (loaded on its own, so the app still runs without it).
import {U} from './i18n.js';
import {toast} from './ui.js';

let m=null;
const load=import('/shared/update.js').then(x=>m=x).catch(()=>null);
const listeners=new Set();
export const onUpdateState=f=>{ listeners.add(f); return ()=>listeners.delete(f); };
export const updateWaiting=()=>!!m?.updateWaiting();
export const applyUpdate=()=>m?.applyUpdate();
// Check now. Resolves to 'ready', 'downloading', 'current', 'failed' or 'none' (no service worker).
export const checkForUpdate=async()=>(await load)?m.checkForUpdate():'none';

export function registerUpdates(){
  load.then(x=>x?.registerUpdates('/stiko/sw.js',()=>{ listeners.forEach(f=>f()); toast(U('updateReady'),{ms:15000,onTap:applyUpdate}); }));
}
