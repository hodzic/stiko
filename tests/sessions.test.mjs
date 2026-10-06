// Session model: validation, ordering, estimates, import/export and storage.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// In-memory localStorage for store.js.
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null, setItem:(k,v)=>mem.set(k,String(v)), removeItem:k=>mem.delete(k)};
const S=await import('../js/sessions.js');

const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const lib=JSON.parse(read('data/library.json'));
const byId=new Map(lib.exercises.map(e=>[e.id,e]));

test('cleanItem clamps values and fills defaults',()=>{
  assert.deepEqual(S.cleanItem({ex:'squat',block:'nope',sets:99,reps:'abc',rest:-5},byId),{ex:'squat',block:'main',sets:10,reps:10,rest:0});
  assert.deepEqual(S.cleanItem({ex:'forearm-plank',block:'cooldown',sets:2,hold:1,reps:12},byId),{ex:'forearm-plank',block:'cooldown',sets:2,hold:5,rest:20});
  assert.equal(S.cleanItem({ex:'unknown'},byId),null);
  assert.equal(S.cleanItem({ex:'squat',sets:''},byId).sets,3,'empty input falls back to the default');
});

test('items stay grouped by block',()=>{
  const items=[{ex:'a',block:'cooldown'},{ex:'b',block:'main'},{ex:'c',block:'warmup'},{ex:'d',block:'main'}];
  assert.deepEqual(S.sortItems(items).map(x=>x.ex),['c','b','d','a']);
});

test('moveItem swaps within a block and crosses block edges',()=>{
  const items=[{ex:'w',block:'warmup'},{ex:'m1',block:'main'},{ex:'m2',block:'main'},{ex:'c',block:'cooldown'}];
  assert.deepEqual(S.moveItem(items,2,-1).map(x=>x.ex),['w','m2','m1','c']);
  const up=S.moveItem(items,1,-1);
  assert.deepEqual(up.map(x=>x.ex+':'+x.block),['w:warmup','m1:warmup','m2:main','c:cooldown']);
  const down=S.moveItem(items,2,1);
  assert.deepEqual(down.map(x=>x.ex+':'+x.block),['w:warmup','m1:main','m2:cooldown','c:cooldown']);
  assert.equal(S.canMove(items,0,-1),false); assert.equal(S.canMove(items,3,1),false);
  assert.equal(S.canMove(items,1,-1),true);
  assert.equal(items[1].block,'main','input not mutated');
});

test('estimate adds countdown, work and rests between sets',()=>{
  const sq=byId.get('squat'), pl=byId.get('forearm-plank');
  const items=[{ex:'squat',block:'main',sets:2,reps:10,rest:30},{ex:'forearm-plank',block:'cooldown',sets:1,hold:30,rest:20}];
  const e=S.estimate(items,byId);
  assert.equal(e.main,5+2*10*sq.anim.cycle+30);
  assert.equal(e.cooldown,5+30);
  assert.equal(e.total,e.main+e.cooldown);
  assert.equal(S.itemSeconds(items[1],pl),35);
});

test('export round-trips through import',()=>{
  const s={id:'s-1',name:'Morning',items:[{ex:'squat',block:'main',sets:3,reps:10,rest:30}]};
  const r=S.parseImport(JSON.stringify(S.exportPayload([s])),byId,'en');
  assert.deepEqual(r,{sessions:[s],dropped:0});
});

test('import accepts a bare session, drops unknown exercises, rejects junk',()=>{
  const r=S.parseImport(JSON.stringify({name:'X',items:[{ex:'squat'},{ex:'nope'}]}),byId,'en');
  assert.equal(r.sessions.length,1); assert.equal(r.dropped,1); assert.equal(r.sessions[0].items.length,1);
  assert.equal(S.parseImport('not json',byId).error,'json');
  assert.equal(S.parseImport('{"hello":1}',byId).error,'format');
  assert.equal(S.parseImport('[]',byId).error,'format');
});

test('mergeImport skips identical copies and re-ids clashes',()=>{
  const a={id:'s-1',name:'A',items:[]};
  const m=S.mergeImport([a],[{...a},{id:'s-1',name:'A2',items:[]},{id:'s-2',name:'B',items:[]}]);
  assert.equal(m.added,2); assert.equal(m.skipped,1);
  assert.equal(new Set(m.sessions.map(s=>s.id)).size,3);
});

test('storage: create, put, duplicate, remove',()=>{
  mem.clear();
  assert.equal(S.hasStore(),false);
  const s=S.create('Evening');
  assert.equal(S.hasStore(),true);
  s.items.push({ex:'forearm-plank',block:'cooldown',sets:1,hold:30,rest:20},{ex:'squat',block:'warmup',sets:1,reps:5,rest:10});
  S.put(s);
  assert.deepEqual(S.get(s.id).items.map(x=>x.ex),['squat','forearm-plank']);
  const c=S.duplicate(s.id,'Evening (copy)');
  assert.notEqual(c.id,s.id);
  assert.deepEqual(S.loadAll().map(x=>x.name),['Evening','Evening (copy)']);
  S.remove(s.id);
  assert.deepEqual(S.loadAll().map(x=>x.id),[c.id]);
});

test('starter sessions reference only library exercises',()=>{
  const r=S.parseImport(read('data/starters.json'),byId,'bs');
  assert.ok(r.sessions?.length>=1); assert.equal(r.dropped,0);
  assert.equal(r.sessions.find(s=>s.id==='starter-basics').name,'Tri osnovne');
  const raw=JSON.parse(read('data/starters.json'));
  for(const s of raw.sessions) for(const l of ['en','bs','fr','de']) assert.ok(s.name[l],`${s.id} name.${l} missing`);
  assert.ok(r.sessions.every(s=>s.items.length>=3),'every starter has at least 3 exercises');
});

test('service worker precaches every app file',()=>{
  const sw=read('sw.js');
  for(const f of fs.readdirSync(new URL('../js',import.meta.url))) assert.ok(sw.includes(`'js/${f}'`),`sw.js is missing js/${f}`);
  for(const f of ['data/library.json','data/starters.json','css/app.css','index.html']) assert.ok(sw.includes(`'${f}'`),`sw.js is missing ${f}`);
});

test('starter names follow the language until renamed',()=>{
  const r=S.parseImport(read('data/starters.json'),byId,'en');
  const basics=r.sessions.find(s=>s.id==='starter-basics');
  assert.equal(S.nameOf(basics,'fr'),'Les trois bases');
  assert.equal(S.nameOf(basics,'de'),'Drei Grundübungen');
  assert.equal(S.nameOf(basics,'xx'),'Three basics','unknown language falls back to English');
  assert.equal(S.nameOf({name:'Mine'},'fr'),'Mine','plain names are used as is');
  // Export keeps the translations, and import restores them.
  const back=S.parseImport(JSON.stringify(S.exportPayload([basics])),byId,'bs').sessions[0];
  assert.deepEqual(back.names,basics.names);
});

test('attachNames repairs stored starters but leaves renamed ones alone',()=>{
  const starters=S.parseImport(read('data/starters.json'),byId,'en').sessions;
  const stored=[
    {id:'starter-basics',name:'Three basics',items:[]},          // saved in English before translations were kept
    {id:'starter-desk-break',name:'My desk routine',items:[]},   // renamed by the user
    {id:'s-1',name:'Evening',items:[]},
  ];
  const {list,changed}=S.attachNames(stored,starters);
  assert.equal(changed,true);
  assert.equal(S.nameOf(list[0],'fr'),'Les trois bases');
  assert.equal(list[1].names,undefined); assert.equal(list[2].names,undefined);
  assert.equal(S.attachNames(list,starters).changed,false,'second run changes nothing');
});

test('a duplicate gets its own fixed name',()=>{
  mem.clear();
  const s=S.put({id:'starter-basics',name:'Three basics',names:{en:'Three basics',fr:'Les trois bases'},items:[]});
  const c=S.duplicate(s.id,'Three basics (copy)');
  assert.equal(c.names,undefined); assert.equal(S.nameOf(c,'fr'),'Three basics (copy)');
  assert.ok(S.get(s.id).names,'the original keeps its translations');
});
