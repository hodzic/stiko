// Full backup: only what differs from the shipped data, and a restore that brings the device back to it.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null, setItem:(k,v)=>mem.set(k,String(v)), removeItem:k=>mem.delete(k)};
const S=await import('../js/sessions.js');
const B=await import('../js/backup.js');

const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const lib=JSON.parse(read('data/library.json'));
const byId=new Map(lib.exercises.map(e=>[e.id,e]));
const starters=S.parseImport(read('data/starters.json'),byId,'en').sessions;
const ids=starters.map(s=>s.id);
const seenAll=Object.fromEntries(starters.map(s=>[s.id,S.itemsKey(s.items)]));

// A device that edited one starter, deleted another, added its own session first, starred some things.
function device(){
  const edited={...structuredClone(starters[0]), items:starters[0].items.slice(1)};
  const own={id:'s-mine', name:'My session', items:[{ex:'squat',block:'main',sets:2,reps:8,rest:30}]};
  const sessions=[own, edited, ...structuredClone(starters.slice(2))];
  return {sessions, starters, offered:[...ids], seen:{...seenAll},
    favs:{ex:['squat'], session:['s-mine']}, settings:{lang:'de', speed:0.5, sound:false}};
}

test('a backup holds only what differs from the shipped data',()=>{
  const b=B.makeBackup(device());
  assert.ok(B.isBackup(b));
  assert.deepEqual(b.sessions.map(s=>s.id),['s-mine',ids[0]],'own and edited sessions only');
  assert.deepEqual(b.deleted,[ids[1]]);
  assert.equal(b.order.length,starters.length);
  assert.deepEqual(Object.keys(b.starterItems),[ids[0]],'merge base kept for the edited starter');
  assert.deepEqual(b.favorites,{ex:['squat'], session:['s-mine']});
  assert.deepEqual(b.settings,{lang:'de', speed:0.5, sound:false});
});

test('restoring on a fresh device brings everything back in order',()=>{
  const d=device(), b=JSON.parse(JSON.stringify(B.makeBackup(d)));
  const fresh={sessions:structuredClone(starters), starters, offered:[...ids], seen:{...seenAll}, favs:{ex:[], session:[]}};
  const r=B.applyBackup(b,fresh,byId,'en');
  assert.deepEqual(r.sessions.map(s=>s.id),d.sessions.map(s=>s.id),'same sessions, same order, deleted starter gone');
  assert.equal(S.itemsKey(r.sessions[1].items),S.itemsKey(d.sessions[1].items),'edited starter restored as edited');
  assert.ok(r.offered.includes(ids[1]),'deleted starter is not offered again');
  assert.deepEqual(r.favs,d.favs);
  assert.deepEqual(r.settings,d.settings);
  assert.equal(r.restored,d.sessions.length);
  assert.equal(r.dropped,0);
});

test('unchanged starters restore as currently shipped, and the device keeps sessions the backup lacks',()=>{
  const b=B.makeBackup(device());
  const newer=structuredClone(starters); newer[2].items=newer[2].items.slice(0,2);  // a later app version
  const here={sessions:[...structuredClone(newer),{id:'s-other',name:'Other',items:[]}], starters:newer, offered:[...ids], seen:{}, favs:{ex:['plank'], session:[]}};
  const r=B.applyBackup(b,here,byId,'en');
  assert.equal(r.sessions.find(s=>s.id===ids[2]).items.length,2,'not frozen at the backup');
  assert.equal(r.sessions.at(-1).id,'s-other');
  assert.ok(!r.sessions.some(s=>s.id===ids[1]));
  assert.deepEqual(r.favs.ex,['plank','squat'],'favourites are added to, not replaced');
});

test('restore ignores junk and settings it does not know',()=>{
  const r=B.applyBackup({kind:S.FILE_KIND, version:2, sessions:[{items:'x'},{id:'s-a',name:'A',items:[{ex:'nope'},{ex:'squat'}]}],
    order:[5,null,'s-a'], deleted:'x', favorites:{ex:[1,'squat']}, settings:{lang:'fr', evil:1}},
    {sessions:[], starters, offered:[], seen:{}, favs:{ex:[], session:[]}},byId,'en');
  assert.deepEqual(r.sessions.map(s=>s.id),['s-a']);
  assert.equal(r.dropped,1);
  assert.deepEqual(r.favs.ex,['squat']);
  assert.deepEqual(r.settings,{lang:'fr'});
});

test('older export files are not taken for full backups, and still import',()=>{
  const old=S.exportPayload(starters.slice(0,2));
  assert.ok(!B.isBackup(old));
  assert.equal(S.parseImport(JSON.stringify(old),byId,'en').sessions.length,2);
  assert.equal(S.parseImport(JSON.stringify(B.makeBackup(device())),byId,'en').sessions.length,2,'a backup still imports in older apps');
});
