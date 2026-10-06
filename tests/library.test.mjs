// Validates data/library.json against the schema the app relies on.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VOCAB, DOSE_MODES, FACES} from '../js/vocab.js';

const lib=JSON.parse(fs.readFileSync(new URL('../data/library.json',import.meta.url),'utf8'));
const LANGS=['en','bs'];
const ids=new Set(lib.exercises.map(e=>e.id));

function bilingual(x,where){
  assert.equal(typeof x,'object',`${where} must be {en,bs}`);
  for(const l of LANGS) assert.ok(typeof x[l]==='string'&&x[l].trim(),`${where}.${l} missing`);
}

test('ids are unique slugs',()=>{
  assert.equal(ids.size,lib.exercises.length);
  for(const id of ids) assert.match(id,/^[a-z0-9]+(-[a-z0-9]+)*$/);
});

for(const ex of lib.exercises){
  test(`${ex.id}: tags and dose`,()=>{
    bilingual(ex.name,'name'); bilingual(ex.short,'short');
    for(const g of ['pattern','region','type']) assert.ok(VOCAB[g].includes(ex[g]),`${g} "${ex[g]}"`);
    assert.ok(Array.isArray(ex.equipment));
    for(const e of ex.equipment) assert.ok(VOCAB.equipment.includes(e)&&e!=='none',`equipment "${e}"`);
    assert.ok([1,2,3].includes(ex.level));
    for(const k of ['easier','harder']) assert.ok(ex[k]===null||ids.has(ex[k]),`${k} → unknown id ${ex[k]}`);
    const d=ex.dose;
    assert.ok(DOSE_MODES.includes(d.mode));
    assert.ok(d.sets>=1&&d.rest>=0);
    if(d.mode==='reps') assert.ok(d.reps>=1&&ex.anim.cycle>0,'reps needs reps and anim.cycle');
    else assert.ok(d.hold>0);
  });
  test(`${ex.id}: instructions`,()=>{
    const h=ex.howto;
    for(const k of ['setup','breathe','easier','harder']) bilingual(h[k],`howto.${k}`);
    assert.ok(h.steps.length>=1); h.steps.forEach((s,i)=>bilingual(s,`howto.steps[${i}]`));
    assert.ok(h.mistakes.length>=1); h.mistakes.forEach((s,i)=>bilingual(s,`howto.mistakes[${i}]`));
    // The player highlights step i while keyframe i plays.
    assert.equal(h.steps.length,ex.anim.frames.length,'one step per keyframe');
  });
  test(`${ex.id}: keyframes`,()=>{
    const F=ex.anim.frames;
    assert.equal(F[0].t,0);
    F.forEach((f,i)=>{
      bilingual(f.label,`frames[${i}].label`);
      assert.ok(FACES.includes(f.face));
      if(i) assert.ok(f.t>F[i-1].t&&f.t<1,'t strictly increasing in [0,1)');
    });
  });
}
