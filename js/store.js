// Per-device preferences. Storage can be missing or throw (private mode), so every access is guarded.
const P='stiko-';
export function load(key,def){
  try{ const v=localStorage.getItem(P+key); return v===null?def:JSON.parse(v); }catch(e){ return def; }
}
export function save(key,val){
  try{ localStorage.setItem(P+key,JSON.stringify(val)); }catch(e){}
}
