// Stiko rig: forward kinematics, pinning, leg IK and SVG rendering.
// Pure module (no DOM access) so it can be unit-tested in Node.

export const FLOOR = 262;
export const L = {torso:56, neck:5, head:27, ua:33, fa:31, thigh:46, shin:44, foot:15};
const rad = d => d*Math.PI/180;
const deg = r => r*180/Math.PI;
export const dir = a => [Math.cos(rad(a)), Math.sin(rad(a))];
const add = (p,a,len) => { const d=dir(a); return [p[0]+d[0]*len, p[1]+d[1]*len]; };

// Forward kinematics from the hip at (0,0). Angles: 0 = forward (right), 90 = down.
export function fk(p){
  const rot=p.rot||0, hip=[0,0];
  const tA=-90+rot+(p.torso||0);
  const sh=add(hip,tA,L.torso);
  const nA=tA+(p.neck||0);
  const nk=add(sh,nA,L.neck);
  const hc=add(nk,nA,L.head);
  const J={hip,sh,nk,hc,tA,nA};
  for(const s of ['n','f']){
    const g=k=>p[k+'_'+s]!==undefined?p[k+'_'+s]:(p[k]||0);
    const uaA=p.uaAbs!==undefined?p.uaAbs:tA+180-g('shoulder');
    const el=add(sh,uaA,L.ua);
    const faA=p.faAbs!==undefined?p.faAbs:uaA-g('elbow');
    const hd=add(el,faA,L.fa);
    const thA=90+rot-g('hip');
    const kn=add(hip,thA,L.thigh);
    const shA=thA+g('knee');
    const an=add(kn,shA,L.shin);
    const ftA=p.footAbs!==undefined?p.footAbs:shA-90+g('ankle');
    const toe=add(an,ftA,L.foot);
    J[s]={el,hd,kn,an,toe};
  }
  return J;
}
export function getPt(J,name){ const [a,b]=name.split('.'); return b?J[a][b]:J[a]; }
export function shift(o,dx,dy){
  if(Array.isArray(o)&&o.length===2&&typeof o[0]==='number'){o[0]+=dx;o[1]+=dy;return;}
  if(o&&typeof o==='object') for(const k in o) if(typeof o[k]==='object') shift(o[k],dx,dy);
}
// Spec coordinates: x is absolute, y is relative to the floor line (negative = above it).
const atFloor = ([x,y]) => [x, FLOOR+y];
function place(spec,pose){
  const J=fk({...pose, footAbs: pose.footAbs!==undefined?pose.footAbs:spec.footAbs});
  const p=getPt(J,spec.pin.point), at=atFloor(spec.pin.at);
  shift(J,at[0]-p[0],at[1]-p[1]); return J;
}
function legIK(leg,hip,an,footAbs){
  const dx=an[0]-hip[0], dy=an[1]-hip[1];
  const d=Math.min(Math.hypot(dx,dy), L.thigh+L.shin-0.01);
  const base=deg(Math.atan2(dy,dx));
  const a=deg(Math.acos((L.thigh*L.thigh+d*d-L.shin*L.shin)/(2*L.thigh*d)));
  const k1=add(hip,base-a,L.thigh), k2=add(hip,base+a,L.thigh);
  leg.kn=k1[1]<k2[1]?k1:k2; leg.an=[an[0],an[1]]; leg.toe=add(an,footAbs,L.foot);
}
// Solve a pose: pin one point, optionally solve whole-body rotation to level a second point, optionally IK the legs.
export function solve(spec,pose){
  let p=pose;
  if(spec.level){
    let [lo,hi]=spec.level.range;
    const y=FLOOR+spec.level.y;
    const f=r=>getPt(place(spec,{...pose,rot:r}),spec.level.point)[1]-y;
    let flo=f(lo);
    for(let i=0;i<28;i++){const m=(lo+hi)/2,fm=f(m); if((fm>0)===(flo>0)){lo=m;flo=fm;}else hi=m;}
    p={...pose,rot:(lo+hi)/2};
  }
  const J=place(spec,p); J.tA=-90+(p.rot||0)+(p.torso||0); J.nA=J.tA+(p.neck||0);
  if(spec.ik) for(const s of ['n','f']) legIK(J[s],J.hip,atFloor(spec.ik.an),spec.footAbs||0);
  return J;
}
export function lerpJ(a,b,u){
  if(typeof a==='number') return a+(b-a)*u;
  if(Array.isArray(a)) return a.map((v,i)=>lerpJ(v,b[i],u));
  const o={}; for(const k in a) o[k]=lerpJ(a[k],b[k],u); return o;
}

// Keyframe interpolation over one rep. phase in [0,1); the last frame eases back to the first.
export function framesAt(frames,phase){
  const n=frames.length;
  let i=0; for(let k=0;k<n;k++) if(phase>=frames[k].t) i=k;
  const a=frames[i], b=i+1<n?frames[i+1]:{...frames[0],t:1};
  const span=b.t-a.t; let u=span>0?(phase-a.t)/span:0;
  u=0.5-0.5*Math.cos(Math.PI*Math.min(1,Math.max(0,u)));
  const pose={}; for(const k of new Set([...Object.keys(a.pose),...Object.keys(b.pose)])){
    const va=a.pose[k]??0, vb=b.pose[k]??0; pose[k]=va+(vb-va)*u;
  }
  return {pose, face:u>0.55?b.face:a.face, label:a.label, idx:i};
}

const f1=n=>n.toFixed(1);
const pts=(...ps)=>ps.map((p,i)=>(i?'L':'M')+f1(p[0])+' '+f1(p[1])).join(' ');

export function headSVG(J,face,blink){
  const c=J.hc, r=L.head, up=dir(J.nA), fd=dir(J.nA+90);
  const P=(a,b)=>[c[0]+fd[0]*a*r+up[0]*b*r, c[1]+fd[1]*a*r+up[1]*b*r];
  const off=(p,a,b)=>[p[0]+fd[0]*a+up[0]*b, p[1]+fd[1]*a+up[1]*b];
  let s=`<circle class="head" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}"/>`;
  const bh=Math.sqrt(1-0.52*0.52);
  s+=`<path class="band" d="${pts(P(-bh,0.52),P(bh,0.52))}"/>`;
  s+=`<circle class="head-o" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}"/>`;
  const eyes=[P(0.14,0.04),P(0.56,0.04)];
  if(blink||face==='effort'){
    for(const e of eyes){
      if(face==='effort') s+=`<path class="eye-l" d="${pts(off(e,-3.5,2.2),off(e,1.5,0),off(e,-3.5,-2.2))}"/>`;
      else s+=`<path class="eye-l" d="${pts(off(e,-3,0),off(e,3,0))}"/>`;
    }
  } else for(const e of eyes) s+=`<circle class="eye" cx="${f1(e[0])}" cy="${f1(e[1])}" r="3.4"/>`;
  const m=P(0.36,-0.4);
  if(face==='puff'){
    const ch=P(0.66,-0.24);
    s+=`<circle class="cheek puff" cx="${f1(ch[0])}" cy="${f1(ch[1])}" r="7.5"/>`;
    const mm=P(0.44,-0.46);
    s+=`<circle class="mouth" cx="${f1(mm[0])}" cy="${f1(mm[1])}" r="2.6"/>`;
  } else {
    const ch=P(0.7,-0.2);
    s+=`<circle class="cheek" cx="${f1(ch[0])}" cy="${f1(ch[1])}" r="4.6"/>`;
    if(face==='effort'){
      s+=`<path class="mouth" d="${pts(off(m,-6,0),off(m,-2,1.6),off(m,2,-1.6),off(m,6,0))}"/>`;
      const sw=P(1.02,0.78);
      s+=`<ellipse class="sweat" cx="${f1(sw[0])}" cy="${f1(sw[1])}" rx="2.8" ry="4"/>`;
    } else {
      const a=off(m,-6.5,0), b=off(m,6.5,0), q=off(m,0,-6.5);
      s+=`<path class="mouth" d="M${f1(a[0])} ${f1(a[1])} Q${f1(q[0])} ${f1(q[1])} ${f1(b[0])} ${f1(b[1])}"/>`;
    }
  }
  return s;
}

export function figureSVG(J,face,opt={}){
  const fs=opt.farShift||[6,-2];
  const F=p=>[p[0]+fs[0],p[1]+fs[1]];
  let s='';
  if(opt.floorWork) s+=`<rect class="mat" x="28" y="${FLOOR-1}" width="344" height="9" rx="4.5"/>`;
  else s+=`<ellipse class="shadow" cx="${f1(J.n.an[0]+4)}" cy="${FLOOR+3}" rx="34" ry="5"/>`;
  s+=`<line class="floor" x1="10" y1="${FLOOR+8}" x2="390" y2="${FLOOR+8}"/>`;
  // far side
  s+=`<path class="limb far" d="${pts(F(J.hip),F(J.f.kn),F(J.f.an),F(J.f.toe))}"/>`;
  s+=`<path class="limb far" d="${pts(F(J.sh),F(J.f.el),F(J.f.hd))}"/>`;
  const fh=F(J.f.hd); s+=`<circle class="hand far" cx="${f1(fh[0])}" cy="${f1(fh[1])}" r="5"/>`;
  // body
  s+=`<path class="limb" d="${pts(J.hip,J.sh,J.nk)}"/>`;
  s+=`<path class="limb" d="${pts(J.hip,J.n.kn,J.n.an,J.n.toe)}"/>`;
  s+=`<path class="limb" d="${pts(J.sh,J.n.el,J.n.hd)}"/>`;
  s+=`<circle class="hand" cx="${f1(J.n.hd[0])}" cy="${f1(J.n.hd[1])}" r="5"/>`;
  s+=headSVG(J,face,opt.blink);
  if(opt.joints) for(const p of [J.hip,J.sh,J.nk,J.n.el,J.n.hd,J.n.kn,J.n.an,J.n.toe]) s+=`<circle class="jt" cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.2"/>`;
  return s;
}

// Static picture of an exercise at one keyframe (used for library thumbnails).
export function stillSVG(ex,frameIdx){
  const a=ex.anim, fr=a.frames[Math.min(frameIdx,a.frames.length-1)];
  const J=solve(a.spec,framesAt(a.frames,fr.t).pose);
  return figureSVG(J,fr.face,{floorWork:a.floorWork,farShift:a.farShift});
}
