// Full backup: everything on this device that differs from what ships with the app. Your own sessions and the
// starter sessions you changed (in full), which starters you deleted and the list order, favourites and settings.
// Starters left as shipped are only listed by id, so they keep getting updates after a restore.
// Pure, so it is unit-tested in Node; sessions-list.js reads and writes the stores.
import {FILE_KIND, isOriginal, cleanSession, strip} from './sessions.js';

export const VERSION=2;
// Per-device preferences that travel with a backup (store.js keys).
export const SETTINGS=['lang','sound','voice','voiceName','speechRate','speed','autoRead','searchHow',
  'sessionSport','sessionFavOnly','exFiltersOpen','sessionFiltersOpen'];

// state: {sessions, starters (as shipped), offered (starter ids this device has had), seen (starterItems),
//         favs:{ex:[], session:[]}, settings:{key:value}}
export function makeBackup(state){
  const {sessions,starters,offered,seen,favs,settings}=state;
  const shipped=new Map(starters.map(s=>[s.id,s])), ids=new Set(sessions.map(s=>s.id));
  const kept=sessions.filter(s=>!shipped.has(s.id)||!isOriginal(s,shipped.get(s.id)));
  const keptIds=new Set(kept.map(s=>s.id));
  return {
    kind:FILE_KIND, version:VERSION, exported:new Date().toISOString(),
    sessions:kept.map(strip),  // the only part older versions of the app read
    order:sessions.map(s=>s.id),
    deleted:offered.filter(id=>!ids.has(id)),
    offered:[...offered],
    starterItems:Object.fromEntries(Object.entries(seen).filter(([id])=>keptIds.has(id))),
    favorites:{ex:[...favs.ex], session:[...favs.session]},
    settings:Object.fromEntries(SETTINGS.filter(k=>settings[k]!==undefined).map(k=>[k,settings[k]])),
  };
}

export const isBackup=raw=>!!raw&&raw.kind===FILE_KIND&&raw.version>=2&&Array.isArray(raw.sessions);

const strs=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'):[];
const union=(a,b)=>[...new Set([...a,...b])];

// Restore a backup over the device state (same shape as makeBackup's input, minus settings). The backup wins:
// its sessions replace ones with the same id, its unchanged starters come back as shipped, starters it had
// deleted go. Sessions on the device that the backup doesn't know are kept, after the backup's.
// Returns {sessions, offered, seen, favs, settings, restored, dropped}.
export function applyBackup(raw,state,byId,lang='en'){
  const shipped=new Map(state.starters.map(s=>[s.id,s]));
  const mine=new Map(); let dropped=0;
  for(const r of raw.sessions){ const c=cleanSession(r,byId,lang); if(c){ mine.set(c.session.id,c.session); dropped+=c.dropped; } }
  const deleted=new Set(strs(raw.deleted));
  const out=[], has=new Set();
  const add=s=>{ if(s&&!has.has(s.id)){ out.push(s); has.add(s.id); } };
  for(const id of strs(raw.order)) add(mine.get(id)||(shipped.has(id)?structuredClone(shipped.get(id)):null));
  for(const s of mine.values()) add(s);
  const restored=out.length;
  for(const s of state.sessions) if(!deleted.has(s.id)) add(s);
  const seen={...state.seen};
  for(const [id,v] of Object.entries(raw.starterItems||{})) if(typeof v==='string') seen[id]=v;
  const f=raw.favorites||{};
  const settings=Object.fromEntries(SETTINGS.filter(k=>raw.settings&&k in raw.settings).map(k=>[k,raw.settings[k]]));
  return {
    sessions:out,
    offered:union(union(state.offered,strs(raw.offered)),deleted),
    seen,
    favs:{ex:union(state.favs.ex,strs(f.ex)), session:union(state.favs.session,strs(f.session))},
    settings, restored, dropped,
  };
}
