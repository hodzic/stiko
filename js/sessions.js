// Sessions: data model, validation, import/export format and on-device storage.
// Pure apart from store.js, so it can be unit-tested in Node.
import * as store from './store.js';
import {SPORTS} from './vocab.js';

export const BLOCKS=['warmup','main','cooldown'];
export const FILE_KIND='stiko-sessions';
const KEY='sessions';

export const uid=()=>'s-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const int=(v,lo,hi,def)=>{ const n=Math.round(Number(v)); return v!==''&&v!==null&&Number.isFinite(n)?Math.min(hi,Math.max(lo,n)):def; };
export const LIMITS={sets:[1,10],reps:[1,100],hold:[5,600],time:[10,600],rest:[0,600]};

export function defaultItem(ex,block='main'){
  const d=ex.dose;
  return {ex:ex.id, block, sets:d.sets, [d.mode]:d[d.mode], rest:d.rest};
}
// Coerce a raw item into a valid one; null if its exercise isn't in the library.
export function cleanItem(raw,byId){
  const ex=raw&&byId.get(raw.ex); if(!ex) return null;
  const d=ex.dose, it={ex:ex.id, block:BLOCKS.includes(raw.block)?raw.block:'main', sets:int(raw.sets,...LIMITS.sets,d.sets)};
  it[d.mode]=int(raw[d.mode],...LIMITS[d.mode],d[d.mode]);  // reps, hold or time
  it.rest=int(raw.rest,...LIMITS.rest,d.rest);
  return it;
}
// Items are always kept grouped by block, in block order (stable within a block).
export const sortItems=items=>items.map((it,i)=>[it,i]).sort((a,b)=>BLOCKS.indexOf(a[0].block)-BLOCKS.indexOf(b[0].block)||a[1]-b[1]).map(x=>x[0]);

// A session name is plain text, or for starter sessions a set of translations ({en, bs, ...}) kept in `names`
// so the name follows the app language until the user renames it.
const cleanNames=v=>{
  if(!v||typeof v!=='object'||Array.isArray(v)) return null;
  const o={}; for(const [k,t] of Object.entries(v)) if(/^[a-z]{2}$/.test(k)&&typeof t==='string'&&t.trim()) o[k]=t.trim().slice(0,80);
  return o.en?o:null;
};
export const nameOf=(s,lang='en')=>s.names?.[lang]??s.names?.en??s.name;

export function cleanSession(raw,byId,lang='en'){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.items)) return null;
  const items=[]; let dropped=0;
  for(const r of raw.items){ const it=cleanItem(r,byId); it?items.push(it):dropped++; }
  const names=cleanNames(raw.name)||cleanNames(raw.names);
  const name=String((names?names[lang]??names.en:raw.name)??'').trim().slice(0,80)||'Session';
  const session={id:typeof raw.id==='string'&&raw.id?raw.id:uid(), name, items:sortItems(items)};
  if(names) session.names=names;
  if(SPORTS.includes(raw.sport)) session.sport=raw.sport;
  return {session, dropped};
}

export const itemDose=(it,ex)=>({mode:ex.dose.mode, sets:it.sets, [ex.dose.mode]:it[ex.dose.mode], rest:it.rest});

// Rough duration in seconds: get-ready countdown + work (both sides for unilateral) + rests between sets.
export const READY=5, SWITCH=4;
export function workSeconds(dose,ex){ return dose.mode==='reps'?dose.reps*ex.anim.cycle:dose[dose.mode]; }
export function itemSeconds(it,ex){
  const w=workSeconds(itemDose(it,ex),ex), set=ex.laterality==='unilateral'?2*w+SWITCH:w;
  return READY+it.sets*set+(it.sets-1)*it.rest;
}
export function estimate(items,byId){
  const per=Object.fromEntries(BLOCKS.map(b=>[b,0]));
  for(const it of items){ const ex=byId.get(it.ex); if(ex) per[it.block]+=itemSeconds(it,ex); }
  return {total:BLOCKS.reduce((s,b)=>s+per[b],0), ...per};
}
export const minutes=s=>Math.max(1,Math.round(s/60));

// Move item i one place up (-1) or down (+1). At a block edge it crosses into the neighbouring block.
export function moveItem(items,i,dir){
  const out=items.map(x=>({...x})), it=out[i], j=i+dir, bi=BLOCKS.indexOf(it.block);
  if(j>=0&&j<out.length&&out[j].block===it.block){ [out[i],out[j]]=[out[j],out[i]]; return out; }
  const nb=BLOCKS[bi+dir]; if(!nb) return out;
  it.block=nb; return sortItems(out);
}
export const canMove=(items,i,dir)=>{ const it=items[i]; return !((dir<0&&i===0&&it.block===BLOCKS[0])||(dir>0&&i===items.length-1&&it.block===BLOCKS.at(-1))); };

// ---- Import / export ----
const strip=s=>({id:s.id, name:s.name, ...(s.names?{names:s.names}:{}), ...(s.sport?{sport:s.sport}:{}), items:s.items});
export const exportPayload=sessions=>({kind:FILE_KIND, version:1, exported:new Date().toISOString(), sessions:sessions.map(strip)});

// Accepts an export file, a bare array of sessions, or a single session. Returns {sessions, dropped} or {error}.
export function parseImport(text,byId,lang){
  let raw; try{ raw=JSON.parse(text); }catch(e){ return {error:'json'}; }
  const list=Array.isArray(raw)?raw:raw&&raw.kind===FILE_KIND&&Array.isArray(raw.sessions)?raw.sessions:raw&&Array.isArray(raw.items)?[raw]:null;
  if(!list) return {error:'format'};
  const sessions=[]; let dropped=0;
  for(const r of list){ const c=cleanSession(r,byId,lang); if(c){ sessions.push(c.session); dropped+=c.dropped; } }
  if(!sessions.length) return {error:'format'};
  return {sessions, dropped};
}
const same=(a,b)=>nameOf(a)===nameOf(b)&&JSON.stringify(a.items)===JSON.stringify(b.items);
// Merge imported sessions: an identical copy already stored is skipped; an id clash with different content gets a new id.
export function mergeImport(existing,incoming){
  const out=[...existing]; let added=0, skipped=0;
  for(const s of incoming){
    const hit=out.find(x=>x.id===s.id);
    if(hit&&same(hit,s)){ skipped++; continue; }
    out.push({...s, id:hit?uid():s.id}); added++;
  }
  return {sessions:out, added, skipped};
}

// Keep stored starter sessions' translations up to date with data/starters.json: devices that saved only one
// language's name, and ones saved before a language was added. Renaming drops `names`, so a session without them
// keeps its name unless it is still a starter name.
export function attachNames(list,starters){
  let changed=false;
  const out=list.map(s=>{
    const st=starters.find(x=>x.id===s.id);
    if(!st?.names||JSON.stringify(s.names)===JSON.stringify(st.names)) return s;
    if(!s.names&&!Object.values(st.names).includes(s.name)) return s;
    changed=true; return {...s,names:st.names};
  });
  return {list:out,changed};
}

// Bring stored starter sessions' exercises up to date when data/starters.json changes, unless the user edited them.
// seen maps a starter id to the item list this device last got. Without a record (older devices), a stored list
// counts as unedited when it is the new list minus the exercises the starter just gained (its "added" list).
const itemKey=it=>[it.ex,it.block,it.sets,it.reps,it.time,it.hold,it.rest].join(':');
export const itemsKey=items=>items.map(itemKey).join('|');
export function refreshItems(list,starters,seen={},added={}){
  let changed=false; const next={...seen};
  const out=list.map(s=>{
    const st=starters.find(x=>x.id===s.id); if(!st) return s;
    const mine=itemsKey(s.items), theirs=itemsKey(st.items), was=seen[s.id];
    const prev=was??itemsKey(st.items.filter(x=>!(added[s.id]||[]).includes(x.ex)));
    if(mine===theirs){ next[s.id]=theirs; return s; }
    if(mine!==prev) return s;  // edited by the user: keep it
    next[s.id]=theirs; changed=true; return {...s,items:st.items.map(x=>({...x}))};
  });
  return {list:out,seen:next,changed};
}

// ---- Storage ----
export const hasStore=()=>store.load(KEY,null)!==null;
export const loadAll=()=>{ const v=store.load(KEY,[]); return Array.isArray(v)?v:[]; };
export const saveAll=list=>store.save(KEY,list.map(strip));
export const get=id=>loadAll().find(s=>s.id===id)||null;
export function put(session){
  const list=loadAll(), i=list.findIndex(s=>s.id===session.id);
  const s={...session, items:sortItems(session.items)};
  if(i<0) list.push(s); else list[i]=s;
  saveAll(list); return s;
}
export const remove=id=>saveAll(loadAll().filter(s=>s.id!==id));
export function create(name){ return put({id:uid(), name, items:[]}); }
export function duplicate(id,name){
  const list=loadAll(), i=list.findIndex(s=>s.id===id); if(i<0) return null;
  const copy={...list[i], id:uid(), name, items:list[i].items.map(x=>({...x}))};
  delete copy.names;  // a copy is the user's own, with a fixed name
  list.splice(i+1,0,copy); saveAll(list); return copy;
}
