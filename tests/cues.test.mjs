import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countdownCue} from '../js/cues.js';

test('countdown: tens spoken, last three beep, the rest tick',()=>{
  const seq=[...Array(30)].map((_,i)=>30-i).map(s=>`${s}:${countdownCue(s)}`);
  assert.deepEqual(seq.filter(x=>x.endsWith('say')),['30:say','20:say','10:say']);
  assert.deepEqual(seq.filter(x=>x.endsWith('beep')),['3:beep','2:beep','1:beep']);
  assert.equal(seq.filter(x=>x.endsWith('tick')).length,24);
  assert.equal(countdownCue(0),null);
  assert.equal(countdownCue(60),'say'); assert.equal(countdownCue(45),'tick'); assert.equal(countdownCue(4),'tick');
});
