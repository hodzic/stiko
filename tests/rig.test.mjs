// Rig sanity: pins land where specified, bones keep their length, every frame renders without NaN.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FLOOR, L, SIDES, fk, solve, getPt, framesAt, figureSVG} from '../js/rig.js';

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
      const J=solve(spec,pose), p=getPt(J,spec.pin.point), sides=SIDES[J.view];
      // lift and slide move the whole figure off its pin on purpose.
      near(p[0]-(pose.slide||0),spec.pin.at[0]); near(p[1]+(pose.lift||0),FLOOR+spec.pin.at[1]);
      if(spec.level) near(getPt(J,spec.level.point)[1],FLOOR+spec.level.y,1);
      // IK targets must be reachable: the hand or ankle lands on its target.
      for(const s of sides) for(const limb of ['an','hd']){
        const t=spec.ik?.[limb+'_'+s]??spec.ik?.[limb];
        if(t&&!pose['free_'+limb+'_'+s]) assert.ok(dist(J[s][limb],[t[0],FLOOR+t[1]])<2.5,`${s}.${limb} misses its IK target by ${dist(J[s][limb],[t[0],FLOOR+t[1]]).toFixed(1)}px`);
      }
      // Nothing sinks below the floor surface.
      for(const s of sides) for(const k of ['kn','an','toe','hd','el']) assert.ok(J[s][k][1]<=FLOOR+8,`${s}.${k} below floor`);
    }
  });
  test(`${ex.id}: renders every phase`,()=>{
    for(let ph=0;ph<1;ph+=0.05){
      const fr=framesAt(a.frames,ph,a.loopAdd);
      const J=solve(a.spec,fr.pose);
      for(const s of SIDES[J.view]) for(const k of ['kn','an','toe','hd']) assert.ok(J[s][k][1]<=FLOOR+9,`${s}.${k} below floor at phase ${ph.toFixed(2)}`);
      const svg=figureSVG(J,fr.face,{floorWork:a.floorWork,farShift:a.farShift,props:a.props,joints:true,flip:true});
      assert.ok(!svg.includes('NaN'),`NaN at phase ${ph}`);
    }
  });
}

test('a partly freed limb blends between its free and IK positions',()=>{
  const spec={pin:{point:'hip',at:[200,-95]},ik:{hd:[236,-120]}};
  const pose={shoulder:0,elbow:0};
  const ik=solve(spec,pose).n.hd, free=solve(spec,{...pose,free_hd_n:1}).n.hd, half=solve(spec,{...pose,free_hd_n:0.5}).n.hd;
  near(ik[0],236); near(half[0],(ik[0]+free[0])/2); near(half[1],(ik[1]+free[1])/2);
});

test('three-quarter view keeps 3D bone lengths and lands its pin',()=>{
  const spec={view:'quarter',pin:{point:'r.an',at:[200,-5]}};
  const pose={yaw:-20,torso:15,spine:10,twist:30,bend:-10,drop:12,az_l:40,el_l:10,reach_l:40,eo_l:60,az_r:-30,el_r:-20,reach_r:90,af_l:12,heel_r:20};
  const J=solve(spec,pose), W=J.w, d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  for(const s of ['l','r']){
    near(d3(W[s].hp,W[s].kn),L.thigh,1e-6); near(d3(W[s].kn,W[s].an),L.shin,1e-6);
    near(d3(W[s].sp,W[s].el),L.ua,1e-6); near(d3(W[s].el,W[s].hd),L.fa,1e-6); near(d3(W[s].an,W[s].toe),L.foot,1e-6);
  }
  near(d3(W.hip,W.sh),L.torso,1);
  near(J.r.an[0],200); near(J.r.an[1],FLOOR-5);
  assert.ok(!figureSVG(J,'effort',{joints:true}).includes('NaN'));
});
