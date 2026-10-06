// Stiko rig: forward kinematics, pinning, leg IK and SVG rendering.
// Pure module (no DOM access) so it can be unit-tested in Node.

export const FLOOR = 262;
export const L = {torso:56, neck:5, head:27, ua:33, fa:31, thigh:46, shin:44, foot:15};
const rad = d => d*Math.PI/180;
const deg = r => r*180/Math.PI;
export const dir = a => [Math.cos(rad(a)), Math.sin(rad(a))];
const add = (p,a,len) => { const d=dir(a); return [p[0]+d[0]*len, p[1]+d[1]*len]; };

// Pose keys may be set per side with a suffix (_n/_f in side view, _l/_r in front view); the bare key applies to both.
const sideGet=(p,s)=>k=>p[k+'_'+s]!==undefined?p[k+'_'+s]:p[k];
const sideNum=(p,s)=>{ const g=sideGet(p,s); return k=>g(k)||0; };

// Side view. Forward kinematics from the hip at (0,0). Angles: 0 = forward (right), 90 = down.
// n = near side (drawn dark), f = far side (drawn light).
function fkSide(p){
  const rot=p.rot||0, hip=[0,0];
  // torso tilts the lower trunk; spine bends the upper trunk relative to it (+ = flexion).
  const tA=-90+rot+(p.torso||0), uA=tA+(p.spine||0);
  const mid=add(hip,tA,L.torso/2);
  const sh=add(mid,uA,L.torso/2);
  const nA=uA+(p.neck||0);
  const nk=add(sh,nA,L.neck);
  const hc=add(nk,nA,L.head);
  const J={view:'side',rot,hip,mid,sh,nk,hc,tA,uA,nA};
  for(const s of ['n','f']){
    const g=sideNum(p,s), abs=sideGet(p,s);
    const uaA=abs('uaAbs')??uA+180-g('shoulder');
    const el=add(sh,uaA,L.ua);
    const faA=abs('faAbs')??uaA-g('elbow');
    const hd=add(el,faA,L.fa);
    const thA=90+rot-g('hip');
    const kn=add(hip,thA,L.thigh);
    const shA=thA+g('knee');
    const an=add(kn,shA,L.shin);
    const ftA=abs('footAbs')??shA-90+g('ankle');
    const toe=add(an,ftA,L.foot);
    J[s]={hp:[hip[0],hip[1]],el,hd,kn,an,toe};  // own copy: shift() moves every array once
  }
  return J;
}

// Front view (for frontal-plane moves). l = screen left, r = screen right; both drawn dark.
// shoulder/hip = abduction (0 = hanging/straight down, 90 = out to the side), elbow/knee bend toward the midline when positive,
// torso = lateral flexion, rot = whole-body roll (±90 lies the body on its side).
const HIP_W=6, SH_W=10, FOOT_F=9;
function fkFront(p){
  const rot=p.rot||0, hip=[0,0];
  // torso = lateral tilt of the lower trunk, spine = side bend of the upper trunk.
  const tA=-90+rot+(p.torso||0), uA=tA+(p.spine||0);
  const mid=add(hip,tA,L.torso/2);
  const sh=add(mid,uA,L.torso/2);
  const nA=uA+(p.neck||0);
  const nk=add(sh,nA,L.neck);
  const hc=add(nk,nA,L.head);
  const J={view:'front',rot,hip,mid,sh,nk,hc,tA,uA,nA};
  const across=rot;  // body's left-right axis (0 = +x when upright)
  for(const [s,sg] of [['l',-1],['r',1]]){
    const g=sideNum(p,s), abs=sideGet(p,s);
    const sp=add(sh,uA+90,sg*SH_W);  // shoulder point: front view shows the shoulder width
    const uaA=abs('uaAbs')??uA+180-sg*g('shoulder');
    const el=add(sp,uaA,L.ua);
    const faA=abs('faAbs')??uaA-sg*g('elbow');
    const hd=add(el,faA,L.fa);
    const hp=add(hip,across,sg*HIP_W);
    const thA=90+rot-sg*g('hip');
    const kn=add(hp,thA,L.thigh);
    const shA=thA+sg*g('knee');
    const an=add(kn,shA,L.shin);
    const toe=add(an,abs('footAbs')??(sg>0?across:across+180),FOOT_F);
    J[s]={hp,sp,el,hd,kn,an,toe};
  }
  return J;
}
export const SIDES={side:['n','f'],front:['l','r']};
export function fk(p,view='side'){ return view==='front'?fkFront(p):fkSide(p); }

export function getPt(J,name){ const [a,b]=name.split('.'); return b?J[a][b]:J[a]; }
export function shift(o,dx,dy){
  if(Array.isArray(o)&&o.length===2&&typeof o[0]==='number'){o[0]+=dx;o[1]+=dy;return;}
  if(o&&typeof o==='object') for(const k in o) if(typeof o[k]==='object') shift(o[k],dx,dy);
}
// Spec coordinates: x is absolute, y is relative to the floor line (negative = above it).
const atFloor = ([x,y]) => [x, FLOOR+y];
function place(spec,pose){
  const J=fk({...pose, footAbs: pose.footAbs!==undefined?pose.footAbs:spec.footAbs},spec.view);
  const p=getPt(J,spec.pin.point), at=atFloor(spec.pin.at);
  shift(J,at[0]-p[0],at[1]-p[1]); return J;
}
// Two-bone IK. Legs: the knee bends to the body's front in side view (anatomical knee flexion), outward in front view.
// Arms: the elbow points behind the body in side view, outward in front view.
function twoBone(root,l1,l2,target,pickFn){
  const dx=target[0]-root[0], dy=target[1]-root[1];
  const d=Math.min(Math.max(Math.hypot(dx,dy),Math.abs(l1-l2)+0.01), l1+l2-0.01);
  const base=deg(Math.atan2(dy,dx));
  const a=deg(Math.acos((l1*l1+d*d-l2*l2)/(2*l1*d)));
  const j1=add(root,base-a,l1), j2=add(root,base+a,l1);
  const j=pickFn(j1,j2,dx,dy);
  return [j,add(j,deg(Math.atan2(target[1]-j[1],target[0]-j[0])),l2)];  // end clamped to reach
}
function limbIK(J,s,limb,target,footAbs){
  const leg=J[s], front=J.view==='front', out=s==='r'?1:-1;
  const root=limb==='an'?leg.hp:(leg.sp||J.sh);
  const [l1,l2]=limb==='an'?[L.thigh,L.shin]:[L.ua,L.fa];
  const cross=(j,dx,dy)=>dx*(j[1]-root[1])-dy*(j[0]-root[0]);
  const want=limb==='an'?-1:1;  // side view: knee anterior (cross<0), elbow posterior (cross>0)
  const pick=(j1,j2,dx,dy)=>front?((j1[0]-j2[0])*out>0?j1:j2):(Math.sign(cross(j1,dx,dy))===want?j1:j2);
  const [mj,end]=twoBone(root,l1,l2,target,pick);
  if(limb==='an'){
    leg.kn=mj; leg.an=end;
    const fa=footAbs!==undefined?footAbs:(front?(s==='r'?J.rot:J.rot+180):0);
    leg.toe=add(end,fa,front?FOOT_F:L.foot);
  } else { leg.el=mj; leg.hd=end; }
}
// Solve a pose: pin one point, optionally solve whole-body rotation to level a second point, optionally IK the legs.
// spec.ik: ankle targets {an} for both legs or per side {an_n, an_f} / {an_l, an_r}; hand targets likewise {hd, hd_n, ...}.
// A pose can release one limb from IK for that frame with free_an_n: 1 (etc.).
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
  const J=place(spec,p);
  if(spec.ik) for(const s of SIDES[J.view]) for(const limb of ['an','hd']){
    const t=spec.ik[limb+'_'+s]??spec.ik[limb];
    if(t&&!p['free_'+limb+'_'+s]) limbIK(J,s,limb,atFloor(t),p['footAbs_'+s]??p.footAbs??spec.footAbs);
  }
  // lift raises the whole figure (jumps); slide moves it sideways (skater hops, side steps).
  if(p.lift||p.slide) shift(J,p.slide||0,-(p.lift||0));
  return J;
}
export function lerpJ(a,b,u){
  if(typeof a==='number') return a+(b-a)*u;
  if(a===null||typeof a!=='object'||b==null) return b;
  if(Array.isArray(a)) return a.map((v,i)=>lerpJ(v,b[i],u));
  const o={}; for(const k in a) o[k]=lerpJ(a[k],b[k],u); return o;
}

// Keyframe interpolation over one rep. phase in [0,1); the last frame eases back to the first.
// loopAdd (e.g. {shoulder:360}) is added to the first frame's values for that wrap, so circles keep going round.
// Each frame belongs to an instruction step: frame.step, or its own index by default.
export function framesAt(frames,phase,loopAdd){
  const n=frames.length;
  let i=0; for(let k=0;k<n;k++) if(phase>=frames[k].t) i=k;
  const a=frames[i];
  let b=i+1<n?frames[i+1]:{...frames[0],t:1};
  if(i+1>=n&&loopAdd){ const pose={...b.pose}; for(const k in loopAdd) pose[k]=(pose[k]??0)+loopAdd[k]; b={...b,pose}; }
  const span=b.t-a.t; let u=span>0?(phase-a.t)/span:0;
  u=0.5-0.5*Math.cos(Math.PI*Math.min(1,Math.max(0,u)));
  const pose={}; for(const k of new Set([...Object.keys(a.pose),...Object.keys(b.pose)])){
    const va=a.pose[k]??0, vb=b.pose[k]??0; pose[k]=va+(vb-va)*u;
  }
  return {pose, face:u>0.55?b.face:a.face, label:a.label, idx:i, step:a.step??i};
}

const f1=n=>n.toFixed(1);
const pts=(...ps)=>ps.map((p,i)=>(i?'L':'M')+f1(p[0])+' '+f1(p[1])).join(' ');

// Head. Side view faces along the body's front; front view looks at the viewer.
export function headSVG(J,face,blink){
  const c=J.hc, r=L.head, up=dir(J.nA), fd=dir(J.nA+90), front=J.view==='front';
  const P=(a,b)=>[c[0]+fd[0]*a*r+up[0]*b*r, c[1]+fd[1]*a*r+up[1]*b*r];
  const off=(p,a,b)=>[p[0]+fd[0]*a+up[0]*b, p[1]+fd[1]*a+up[1]*b];
  let s=`<circle class="head" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}"/>`;
  const bh=Math.sqrt(1-0.52*0.52);
  s+=`<path class="band" d="${pts(P(-bh,0.52),P(bh,0.52))}"/>`;
  s+=`<circle class="head-o" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}"/>`;
  const eyes=front?[[P(-0.32,0.04),1],[P(0.32,0.04),-1]]:[[P(0.14,0.04),1],[P(0.56,0.04),1]];
  for(const [e,m] of eyes){
    if(face==='effort') s+=`<path class="eye-l" d="${pts(off(e,-3.5*m,2.2),off(e,1.5*m,0),off(e,-3.5*m,-2.2))}"/>`;
    else if(blink) s+=`<path class="eye-l" d="${pts(off(e,-3,0),off(e,3,0))}"/>`;
    else s+=`<circle class="eye" cx="${f1(e[0])}" cy="${f1(e[1])}" r="3.4"/>`;
  }
  const mx=front?0:0.36, cheeks=front?[-0.62,0.62]:[0.7];
  const m=P(mx,-0.4);
  if(face==='puff'){
    for(const a of cheeks){ const ch=P(front?a:0.66,-0.24); s+=`<circle class="cheek puff" cx="${f1(ch[0])}" cy="${f1(ch[1])}" r="${front?6.5:7.5}"/>`; }
    const mm=P(front?0:0.44,-0.46);
    s+=`<circle class="mouth" cx="${f1(mm[0])}" cy="${f1(mm[1])}" r="2.6"/>`;
  } else {
    for(const a of cheeks){ const ch=P(a,-0.2); s+=`<circle class="cheek" cx="${f1(ch[0])}" cy="${f1(ch[1])}" r="4.6"/>`; }
    if(face==='effort'){
      s+=`<path class="mouth" d="${pts(off(m,-6,0),off(m,-2,1.6),off(m,2,-1.6),off(m,6,0))}"/>`;
      const sw=P(front?0.8:1.02,0.78);
      s+=`<ellipse class="sweat" cx="${f1(sw[0])}" cy="${f1(sw[1])}" rx="2.8" ry="4"/>`;
    } else {
      const a=off(m,-6.5,0), b=off(m,6.5,0), q=off(m,0,-6.5);
      s+=`<path class="mouth" d="M${f1(a[0])} ${f1(a[1])} Q${f1(q[0])} ${f1(q[1])} ${f1(b[0])} ${f1(b[1])}"/>`;
    }
  }
  return s;
}

// ---- Props ----
// Background props (drawn behind Stiko): chair, wall, step. Positions use floor-relative y like spec coordinates.
export const SEAT_H=48;  // chair seat height above the floor, about knee height
function backPropSVG(pr){
  if(pr.type==='chair'){
    // x = seat centre; back = -1/1 puts the backrest on the left/right edge.
    // back: 0 draws no backrest (a stool or the seat edge seen from the front).
    const x=pr.x, w=44, y=FLOOR-SEAT_H, back=pr.back??-1, bx=x+back*w/2;
    return `<g class="prop"><path d="M${x-w/2} ${y} H${x+w/2} M${x-w/2+3} ${y} V${FLOOR+6} M${x+w/2-3} ${y} V${FLOOR+6}${back?` M${bx} ${y} V${y-50}`:''}"/></g>`;
  }
  if(pr.type==='wall'){
    const x=pr.x, side=pr.side||1, w=12;
    return `<rect class="wall" x="${side>0?x:x-w}" y="16" width="${w}" height="${FLOOR+8-16}" rx="2"/>`;
  }
  if(pr.type==='step'){
    const w=pr.w||70, h=pr.h||22;
    return `<rect class="step" x="${pr.x-w/2}" y="${FLOOR+6-h}" width="${w}" height="${h}" rx="4"/>`;
  }
  return '';
}
const ptOf=(J,v)=>typeof v==='string'?getPt(J,v):atFloor(v);
function dumbbellSVG(J,hand){
  const [s]=hand.split('.'), h=getPt(J,hand), cls=s==='f'?'db far':'db';
  if(J.view==='side') return `<circle class="${cls}" cx="${f1(h[0])}" cy="${f1(h[1])}" r="8.5"/><circle class="hand${s==='f'?' far':''}" cx="${f1(h[0])}" cy="${f1(h[1])}" r="4"/>`;
  // Front view: a bar across the hand, perpendicular to the forearm.
  const el=J[s].el, a=deg(Math.atan2(h[1]-el[1],h[0]-el[0]))+90, p1=add(h,a,11), p2=add(h,a,-11);
  return `<path class="db-bar" d="${pts(p1,p2)}"/><circle class="db" cx="${f1(p1[0])}" cy="${f1(p1[1])}" r="6"/><circle class="db" cx="${f1(p2[0])}" cy="${f1(p2[1])}" r="6"/>`;
}
function bandSVG(J,pr){
  const a=ptOf(J,pr.from), b=ptOf(J,pr.to);
  let s=`<path class="bandp" d="${pts(a,b)}"/>`;
  if(typeof pr.to!=='string') s+=`<circle class="anchor" cx="${f1(b[0])}" cy="${f1(b[1])}" r="4.5"/>`;
  return s;
}

// Full figure. opt: {floorWork, farShift, props, joints, blink, flip}
export function figureSVG(J,face,opt={}){
  const props=opt.props||[];
  let s='';
  if(opt.floorWork) s+=`<rect class="mat" x="28" y="${FLOOR-1}" width="344" height="9" rx="4.5"/>`;
  else {
    const sx=J.view==='front'?(J.l.an[0]+J.r.an[0])/2:J.n.an[0]+4;
    s+=`<ellipse class="shadow" cx="${f1(sx)}" cy="${FLOOR+3}" rx="34" ry="5"/>`;
  }
  s+=`<line class="floor" x1="10" y1="${FLOOR+8}" x2="390" y2="${FLOOR+8}"/>`;
  for(const pr of props) s+=backPropSVG(pr);
  const dbs=props.filter(p=>p.type==='dumbbell').flatMap(p=>p.hands);
  const db=side=>dbs.filter(h=>h.startsWith(side+'.')).map(h=>dumbbellSVG(J,h)).join('');
  if(J.view==='front'){
    for(const k of ['l','r']) s+=`<path class="limb" d="${pts(J[k].hp,J[k].kn,J[k].an,J[k].toe)}"/>`;
    s+=`<path class="limb" d="${pts(J.l.hp,J.r.hp)}"/>`;
    s+=`<path class="limb" d="${pts(J.hip,J.mid,J.sh,J.nk)}"/>`;
    s+=`<path class="limb" d="${pts(J.l.sp,J.sh,J.r.sp)}"/>`;
    for(const k of ['l','r']){
      s+=`<path class="limb" d="${pts(J[k].sp,J[k].el,J[k].hd)}"/>`;
      s+=`<circle class="hand" cx="${f1(J[k].hd[0])}" cy="${f1(J[k].hd[1])}" r="5"/>`;
    }
    s+=db('l')+db('r');
  } else {
    const fs=opt.farShift||[6,-2];
    const F=p=>[p[0]+fs[0],p[1]+fs[1]];
    s+=`<path class="limb far" d="${pts(F(J.f.hp),F(J.f.kn),F(J.f.an),F(J.f.toe))}"/>`;
    s+=`<path class="limb far" d="${pts(F(J.sh),F(J.f.el),F(J.f.hd))}"/>`;
    const fh=F(J.f.hd); s+=`<circle class="hand far" cx="${f1(fh[0])}" cy="${f1(fh[1])}" r="5"/>`;
    // Far-hand dumbbells sit with the (offset) far arm, behind the body.
    const Jf={...J,f:{...J.f,hd:fh,el:F(J.f.el)}};
    s+=dbs.filter(h=>h.startsWith('f.')).map(h=>dumbbellSVG(Jf,h)).join('');
    s+=`<path class="limb" d="${pts(J.hip,J.mid,J.sh,J.nk)}"/>`;
    s+=`<path class="limb" d="${pts(J.n.hp,J.n.kn,J.n.an,J.n.toe)}"/>`;
  }
  s+=headSVG(J,face,opt.blink);
  // Side view: the near arm is closer to the camera than the head, so it is drawn on top of it
  // (otherwise raised arms vanish behind the head). The far arm stays behind.
  if(J.view!=='front'){
    s+=`<path class="limb" d="${pts(J.sh,J.n.el,J.n.hd)}"/>`;
    s+=`<circle class="hand" cx="${f1(J.n.hd[0])}" cy="${f1(J.n.hd[1])}" r="5"/>`;
    s+=db('n');
  }
  for(const pr of props) if(pr.type==='band') s+=bandSVG(J,pr);
  if(opt.joints){
    const ks=J.view==='front'?['l','r']:['n'];
    const ps=[J.hip,J.mid,J.sh,J.nk,...ks.flatMap(k=>[J[k].el,J[k].hd,J[k].kn,J[k].an,J[k].toe])];
    for(const p of ps) s+=`<circle class="jt" cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.2"/>`;
  }
  return opt.flip?`<g transform="matrix(-1 0 0 1 400 0)">${s}</g>`:s;
}

// Pose and spec for an exercise at a phase of one rep (rest pose when phase is null and the exercise has one).
export function poseAt(ex,phase){
  const a=ex.anim, fr=framesAt(a.frames,phase,a.loopAdd);
  return {J:solve(a.spec,fr.pose), fr};
}

// Static picture of an exercise at one keyframe (used for library thumbnails).
export function stillSVG(ex,frameIdx){
  const a=ex.anim, fr=a.frames[Math.min(frameIdx,a.frames.length-1)];
  const J=solve(a.spec,framesAt(a.frames,fr.t,a.loopAdd).pose);
  return figureSVG(J,fr.face,{floorWork:a.floorWork,farShift:a.farShift,props:a.props});
}
