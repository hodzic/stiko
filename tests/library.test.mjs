// Validates data/library.json against the schema the app relies on.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VOCAB, DOSE_MODES, FACES, JOINTS, ACTIONS, MUSCLES, PROPS, regionOf, familyOf} from '../js/vocab.js';
import {UI} from '../js/i18n.js';

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
  test(`${ex.id}: taxonomy`,()=>{
    bilingual(ex.name,'name'); bilingual(ex.short,'short');
    assert.equal(ex.region,undefined,'region is derived from muscles, not stored');
    assert.ok(ex.pattern===null||VOCAB.pattern.includes(ex.pattern),`pattern "${ex.pattern}"`);
    for(const g of ['component','position','laterality','chain']) assert.ok(VOCAB[g].includes(ex[g]),`${g} "${ex[g]}"`);
    assert.ok(ex.planes.length&&ex.planes.every(v=>VOCAB.plane.includes(v)),'planes');
    assert.ok(ex.blocks.length&&ex.blocks.every(v=>VOCAB.block.includes(v)),'blocks');
    const {primary,secondary}=ex.muscles;
    assert.ok(primary.length>=1,'at least one primary muscle');
    for(const m of [...primary,...secondary]) assert.ok(m in MUSCLES,`muscle "${m}"`);
    assert.ok(!primary.some(m=>secondary.includes(m)),'a muscle is primary or secondary, not both');
    assert.ok(Object.keys(ex.joints).length>=1,'at least one joint');
    for(const [j,acts] of Object.entries(ex.joints)){
      assert.ok(JOINTS.includes(j),`joint "${j}"`);
      for(const a of acts) assert.ok(ACTIONS.includes(a),`action "${a}"`);
    }
    if(ex.dose.mode==='reps') assert.ok(Object.values(ex.joints).some(a=>a.length),'dynamic exercises list at least one joint action');
    assert.ok(VOCAB.region.includes(regionOf(ex)));
    assert.ok(Array.isArray(ex.equipment));
    for(const e of ex.equipment) assert.ok(VOCAB.equipment.includes(e)&&e!=='none',`equipment "${e}"`);
    assert.ok([1,2,3].includes(ex.level));
    for(const k of ['easier','harder']) assert.ok(ex[k]===null||ids.has(ex[k]),`${k} → unknown id ${ex[k]}`);
    const d=ex.dose;
    assert.ok(DOSE_MODES.includes(d.mode));
    assert.ok(d.sets>=1&&d.rest>=0);
    assert.ok(d[d.mode]>0,`dose.${d.mode} missing`);
    if(d.mode!=='hold') assert.ok(ex.anim.cycle>0,`${d.mode} dose needs anim.cycle`);
  });
  test(`${ex.id}: instructions`,()=>{
    const h=ex.howto;
    for(const k of ['setup','breathe','easier','harder']) bilingual(h[k],`howto.${k}`);
    assert.ok(h.steps.length>=1); h.steps.forEach((s,i)=>bilingual(s,`howto.steps[${i}]`));
    assert.ok(h.mistakes.length>=1); h.mistakes.forEach((s,i)=>bilingual(s,`howto.mistakes[${i}]`));
    // Each keyframe belongs to a step (frame.step, default its index); every step needs a keyframe.
    const used=new Set(ex.anim.frames.map((f,i)=>f.step??i));
    assert.deepEqual([...used].sort((a,b)=>a-b),h.steps.map((_,i)=>i),'every step has a keyframe and no keyframe points past the steps');
  });
  test(`${ex.id}: keyframes`,()=>{
    const F=ex.anim.frames;
    assert.equal(F[0].t,0);
    F.forEach((f,i)=>{
      bilingual(f.label,`frames[${i}].label`);
      assert.ok(FACES.includes(f.face));
      if(i) assert.ok(f.t>F[i-1].t&&f.t<1,'t strictly increasing in [0,1)');
      // Missing keys interpolate from 0, so every keyframe must set the same pose keys.
      assert.deepEqual(Object.keys(f.pose).sort(),Object.keys(F[0].pose).sort(),`frame ${i} pose keys differ from frame 0`);
    });
    for(const pr of ex.anim.props||[]){
      assert.ok(PROPS.includes(pr.type),`prop "${pr.type}"`);
      assert.ok(ex.equipment.includes(pr.type),`prop ${pr.type} drawn but not listed in equipment`);
    }
    assert.ok(['side','front',undefined].includes(ex.anim.spec.view));
  });
}

test('every taxonomy value has an EN and BS label',()=>{
  const groups={family:VOCAB.family,pattern:VOCAB.pattern,component:VOCAB.component,region:VOCAB.region,muscle:VOCAB.muscle,
    position:VOCAB.position,equipment:VOCAB.equipment,plane:VOCAB.plane,laterality:VOCAB.laterality,chain:VOCAB.chain,
    block:VOCAB.block,level:VOCAB.level,joint:JOINTS,action:ACTIONS};
  for(const l of ['en','bs']) for(const [g,vals] of Object.entries(groups)) for(const v of vals)
    assert.ok(UI[l][g]?.[v],`${l}.${g}.${v} missing`);
  for(const p of VOCAB.pattern) assert.ok(familyOf(p),`pattern ${p} has no family`);
});
