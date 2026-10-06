// Rig sanity: pins land where specified, bones keep their length, every frame renders without NaN.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FLOOR, L, fk, solve, getPt, framesAt, figureSVG} from '../js/rig.js';

const lib=JSON.parse(fs.readFileSync(new URL('../data/library.json',import.meta.url),'utf8'));
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const near=(a,b,eps=0.5)=>assert.ok(Math.abs(a-b)<eps,`${a} ≉ ${b}`);

test('fk keeps segment lengths',()=>{
  const J=fk({torso:20,hip:60,knee:80,shoulder:90,elbow:30});
  near(dist(J.hip,J.sh),L.torso,1e-9); near(dist(J.hip,J.n.kn),L.thigh,1e-9);
  near(dist(J.n.kn,J.n.an),L.shin,1e-9); near(dist(J.sh,J.n.el),L.ua,1e-9);
});

for(const ex of lib.exercises){
  const a=ex.anim;
  const poses=[...a.frames.map(f=>({spec:a.spec,pose:f.pose,face:f.face})),
    ...(a.restPose?[{spec:a.restPose.spec,pose:a.restPose.pose,face:'smile'}]:[])];
  test(`${ex.id}: pin, level and IK hold`,()=>{
    for(const {spec,pose} of poses){
      const J=solve(spec,pose), p=getPt(J,spec.pin.point);
      near(p[0],spec.pin.at[0]); near(p[1],FLOOR+spec.pin.at[1]);
      if(spec.level) near(getPt(J,spec.level.point)[1],FLOOR+spec.level.y,1);
      if(spec.ik){ near(J.n.an[0],spec.ik.an[0]); near(J.n.an[1],FLOOR+spec.ik.an[1]); near(dist(J.hip,J.n.kn),L.thigh,0.01); }
      // Nothing sinks below the floor surface.
      for(const s of ['n','f']) for(const k of ['kn','an','toe','hd']) assert.ok(J[s][k][1]<=FLOOR+8,`${s}.${k} below floor`);
    }
  });
  test(`${ex.id}: renders every phase`,()=>{
    for(let ph=0;ph<1;ph+=0.05){
      const fr=framesAt(a.frames,ph);
      const svg=figureSVG(solve(a.spec,fr.pose),fr.face,{floorWork:a.floorWork,farShift:a.farShift,joints:true});
      assert.ok(!svg.includes('NaN'),`NaN at phase ${ph}`);
    }
  });
}
