// Search: normalising, word-prefix matching, ranking, languages and sessions.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null, setItem:(k,v)=>mem.set(k,String(v)), removeItem:k=>mem.delete(k)};
const I=await import('../js/i18n.js');
const Q=await import('../js/search.js');
const S=await import('../js/sessions.js');
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const lib=JSON.parse(read('data/library.json'));
const byId=new Map(lib.exercises.map(e=>[e.id,e]));
const find=(q,how=false)=>Q.search(lib.exercises,ex=>Q.exerciseFields(ex,how),q).map(e=>e.id);

test('normalising drops case and accents',()=>{
  assert.equal(Q.norm('Vježba ĐAK Übung Élève Straße'),'vjezba dak ubung eleve strasse');
  assert.deepEqual(Q.tokens('  Sh-PR '),['sh','pr']);
});

test('every typed word must start a word; names rank first',()=>{
  I.setLang('en');
  assert.equal(find('sh pr')[0],'shoulder-press');
  assert.ok(find('squat').length>3);
  assert.equal(find('squat')[0].includes('squat'),true,'a squat is ranked before exercises that only mention squats elsewhere');
  assert.deepEqual(find('zzzz'),[]);
  assert.equal(find('').length,lib.exercises.length,'an empty query matches everything, in library order');
});

test('labels match: muscles, equipment, style',()=>{
  I.setLang('en');
  assert.ok(find('glutes').includes('glute-bridge'));
  assert.ok(find('band').every(id=>{ const ex=byId.get(id); return ex.equipment.includes('band')||/band/i.test(ex.name.en); }));
  assert.ok(find('yoga').includes('downward-dog'));
});

test('searches the app language and English, accent-insensitive',()=>{
  I.setLang('de');
  assert.ok(find('kniebeuge').includes('squat'));
  assert.ok(find('squat').includes('squat'),'English still works in German');
  I.setLang('bs');
  assert.ok(find('cucanj').includes('squat'),'typed without the accent');
  I.setLang('en');
});

test('instructions are searched only when asked',()=>{
  I.setLang('en');
  const word='countertop';  // appears only in instruction text, if at all
  const inHow=lib.exercises.filter(ex=>Q.score(Q.exerciseFields(ex,true),[word])>0);
  const inNames=lib.exercises.filter(ex=>Q.score(Q.exerciseFields(ex,false),[word])>0);
  assert.equal(inNames.length,0);
  const w2='heels';
  assert.ok(find(w2,true).length>find(w2,false).length);
});

test('sessions match their name, sport and exercises, keeping their order',()=>{
  I.setLang('en');
  const st=S.parseImport(read('data/starters.json'),byId,'en').sessions;
  const hits=Q.search(st,s=>Q.sessionFields(s,byId),'squat',true);
  assert.ok(hits.length>3&&hits.every(s=>s.items.some(it=>/squat/.test(it.ex))||/squat/i.test(S.nameOf(s,'en'))));
  assert.deepEqual(hits.map(s=>st.indexOf(s)),[...hits.map(s=>st.indexOf(s))].sort((a,b)=>a-b),'original order kept');
  assert.ok(Q.search(st,s=>Q.sessionFields(s,byId),'skiing',true).some(s=>s.sport==='alpine-skiing'));
});
