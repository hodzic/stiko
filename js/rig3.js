// Three-quarter view (prototype): a 3D skeleton seen from about 35° off the side, projected onto the screen.
// Used for moves that turn or reach across the body (hooks, slips, chops, pull-aparts), which the flat
// side and front views cannot show. Loaded by rig.js for specs with view:'quarter'.
//
// World: x = screen right, y = up, z = toward the viewer; one unit = one SVG px, y = 0 at ankle height.
// Pose keys (all optional; angles in degrees, distances in px, _l/_r = the figure's left/right):
//   yaw            whole-body turn, + = toward the figure's left (away from the viewer)
//   torso, spine   forward lean of the lower and upper trunk;  twist  upper-trunk turn on the pelvis (+ = left)
//   bend           side bend of the upper trunk (+ = to the right);  neck  head nod (+ = down);  look  head turn (+ = left)
//   drop, fwd, sway  lower the hips; move them forward or to the right
//   az_*, el_*, reach_*  hand target from its shoulder: direction (az 0 = forward, 90 = out to the side, -90 = across;
//                  el -90 = down, 0 = shoulder height, 90 = overhead) and distance (64 = arm straight). Polar keys so a
//                  sweep between keyframes follows an arc instead of cutting a straight line past the shoulder.
//   plant_*        0–1 blends the hand from its polar target to a fixed spot on the floor: px_* forward, pw_* out
//                  from the midline, py_* height (a hand on the mat stays put while the trunk turns)
//   eo_*           elbow direction around the shoulder–hand line: 0 = down, 90 = out to the side, -90 = across
//   af_*, aw_*, ay_*  ankle on the floor: forward, extra width, height above the floor
//   toe_*          foot turned out (+) or in;  heel_*  heel raised, pivoting on the toes;  kn_*  knee turned out
import {FLOOR, L, shift, getPt} from './rig.js';

export const QUARTER_YAW=35;   // default facing: 35° from the side view toward the viewer
const PITCH=20;                // the camera looks down slightly, so the floor plane reads
const HIP_W=8, SH_W=14;  // broader than the front view so turns of the hips and shoulders read
const hipH=()=>L.thigh+L.shin-2;  // a function: rig.js and this module import each other
export const LEN_KEYS=new Set(['drop','fwd','sway','lift','slide','reach','af','aw','ay','px','pw','py']);

const rad=d=>d*Math.PI/180;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(a[0],a[1],a[2]);
const unit=a=>{ const l=len(a)||1; return mul(a,1/l); };
const sum=(...vs)=>vs.reduce(add,[0,0,0]);
// Rodrigues rotation of v about unit axis k.
function rotate(v,k,deg){
  const c=Math.cos(rad(deg)), s=Math.sin(rad(deg));
  return add(add(mul(v,c),mul(cross(k,v),s)),mul(k,dot(k,v)*(1-c)));
}
// A body frame: f = forward, u = up, r = the body's right (f × u).
const frame=th=>{ const f=[Math.cos(rad(th)),0,Math.sin(rad(th))], u=[0,1,0]; return {f,u,r:cross(f,u)}; };
function turn(F,axis,deg){ const o={}; for(const k of ['f','u','r']) o[k]=k===axis?F[k]:rotate(F[k],F[axis],deg); return o; }
const yawF=(F,a)=>turn(F,'u',a);     // + = turn to the left
const leanF=(F,a)=>turn(F,'r',-a);   // + = lean forward
const bendF=(F,a)=>turn(F,'f',a);    // + = bend to the right

// Two-bone IK in 3D: the middle joint lies in the plane of root→target and pole.
function twoBone3(root,target,l1,l2,pole){
  const v=sub(target,root), d=Math.min(Math.max(len(v),Math.abs(l1-l2)+0.01),l1+l2-0.01), a=unit(v);
  let p=sub(pole,mul(a,dot(pole,a)));
  if(len(p)<1e-6) p=Math.abs(a[1])<0.9?[0,1,0]:[1,0,0], p=sub(p,mul(a,dot(p,a)));
  p=unit(p);
  const ca=(l1*l1+d*d-l2*l2)/(2*l1*d), sa=Math.sqrt(Math.max(0,1-ca*ca));
  const mid=add(root,add(mul(a,l1*ca),mul(p,l1*sa)));
  return [mid,add(root,mul(a,d))];
}

const proj=P=>{ const c=Math.cos(rad(PITCH)), s=Math.sin(rad(PITCH)); return [P[0],FLOOR-(P[1]*c-P[2]*s)]; };
export const depthOf=P=>P[1]*Math.sin(rad(PITCH))+P[2]*Math.cos(rad(PITCH));

function world(spec,p){
  const n=k=>p[k]||0, side=(s,k,d=0)=>p[k+'_'+s]??p[k]??d;
  const base=frame(spec.yaw??QUARTER_YAW);
  const P=yawF(base,n('yaw'));
  const hip=sum([0,hipH()-n('drop'),0],mul(base.f,n('fwd')),mul(base.r,n('sway')));
  const T1=leanF(P,n('torso'));
  const T2=bendF(leanF(yawF(T1,n('twist')),n('spine')),n('bend'));
  const N=leanF(yawF(T2,n('look')),n('neck'));
  const mid=add(hip,mul(T1.u,L.torso/2)), sh=add(mid,mul(T2.u,L.torso/2));
  const nk=add(sh,mul(N.u,L.neck)), hc=add(nk,mul(N.u,L.head));
  const W={hip,mid,sh,nk,hc,N};
  for(const [s,sg] of [['l',-1],['r',1]]){
    const sp=add(sh,mul(T2.r,sg*SH_W)), hp=add(hip,mul(P.r,sg*HIP_W));
    // Arm: the hand target rides with the upper trunk, so twisting carries the fists.
    const az=rad(side(s,'az')), ev=rad(side(s,'el',-90)), R=side(s,'reach',62);
    let ht=sum(sp,mul(T2.f,R*Math.cos(ev)*Math.cos(az)),mul(T2.r,sg*R*Math.cos(ev)*Math.sin(az)),mul(T2.u,R*Math.sin(ev)));
    const plant=Math.min(1,Math.max(0,side(s,'plant')));
    if(plant>0){
      const fixed=sum(mul(base.f,side(s,'px')),mul(base.r,sg*side(s,'pw')),[0,side(s,'py'),0]);
      ht=add(mul(ht,1-plant),mul(fixed,plant));
    }
    const ax=unit(sub(ht,sp)), down=mul(T2.u,-1);
    let ref=sub(down,mul(ax,dot(down,ax))); if(len(ref)<1e-3) ref=mul(T2.f,-1);
    ref=unit(ref); let lat=cross(ax,ref); if(dot(lat,mul(T2.r,sg))<0) lat=mul(lat,-1);
    const e=rad(side(s,'eo'));
    const [el,hd]=twoBone3(sp,ht,L.ua,L.fa,add(mul(ref,Math.cos(e)),mul(lat,Math.sin(e))));
    // Leg: the ankle is placed on the floor around the stance; the knee points over the toes.
    const tdir=rotate(base.f,[0,1,0],-sg*side(s,'toe',8));
    const heel=rad(side(s,'heel'));
    const foot=sum(mul(base.f,side(s,'af')),mul(base.r,sg*(HIP_W+side(s,'aw'))),[0,side(s,'ay'),0]);
    const toe=add(foot,mul(tdir,L.foot));
    const at=add(sub(toe,mul(tdir,L.foot*Math.cos(heel))),[0,L.foot*Math.sin(heel),0]);
    const kdir=rotate(tdir,[0,1,0],-sg*side(s,'kn'));
    const [kn,an]=twoBone3(hp,at,L.thigh,L.shin,kdir);
    W[s]={hp,sp,el,hd,kn,an,toe:add(an,mul(unit(sub(toe,at)),L.foot))};
  }
  return W;
}

// Same shape as the flat views (2D screen points per joint, l/r limbs) so props, pins and blending work unchanged;
// J.w keeps the 3D points for depth sorting and the head.
export function solveQuarter(spec,p){
  const W=world(spec,p), pr=o=>{ const r={}; for(const k in o) r[k]=proj(o[k]); return r; };
  const {N,...pts}=W;
  // The far side is fixed per exercise (from its base facing), so limbs don't swap shade as the body turns.
  const J={view:'quarter',far:Math.cos(rad(spec.yaw??QUARTER_YAW))>=0?'l':'r',hip:proj(W.hip),mid:proj(W.mid),sh:proj(W.sh),nk:proj(W.nk),hc:proj(W.hc),
    l:pr(W.l),r:pr(W.r),w:{...pts,N}};
  const pin=getPt(J,spec.pin.point);
  shift(J,spec.pin.at[0]-pin[0],FLOOR+spec.pin.at[1]-pin[1]);
  if(p.lift||p.slide) shift(J,p.slide||0,-(p.lift||0));
  return J;
}

const f1=n=>n.toFixed(1);
const pts=(...ps)=>ps.map((p,i)=>(i?'L':'M')+f1(p[0])+' '+f1(p[1])).join(' ');

// Head: features are points on the head sphere, drawn only on the half facing the viewer.
function headQ(J,face,blink){
  const c=J.hc, r=L.head, N=J.w.N;
  const P2=v=>{ const q=proj(v), o=proj([0,0,0]); return [q[0]-o[0],q[1]-o[1]]; };
  const fx=P2(N.f), ux=P2(N.u), rx=P2(N.r), fd=depthOf(N.f), ud=depthOf(N.u), rd=depthOf(N.r);
  // Direction on the sphere: az around the head (+ = toward its right), el up from the eye line.
  const S=(az,el)=>{ const ca=Math.cos(rad(az))*Math.cos(rad(el)), sa=Math.sin(rad(az))*Math.cos(rad(el)), se=Math.sin(rad(el));
    return {p:[c[0]+r*(ca*fx[0]+sa*rx[0]+se*ux[0]),c[1]+r*(ca*fx[1]+sa*rx[1]+se*ux[1])],d:ca*fd+sa*rd+se*ud}; };
  let s=`<circle class="head" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}"/>`;
  const az0=Math.atan2(rd,fd)*180/Math.PI, band=[];
  for(let a=-90;a<=90;a+=10) band.push(S(az0+a,31).p);
  s+=`<path class="band" d="${pts(...band)}"/>`;
  s+=`<circle class="head-o" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}"/>`;
  const vis=q=>q.d>0.08, ctr=S(0,0).p;
  for(const az of [-19,19]){
    const e=S(az,2); if(!vis(e)) continue;
    const [x,y]=e.p, m=x<ctr[0]?1:-1;
    if(face==='effort') s+=`<path class="eye-l" d="${pts([x-3.5*m,y-2.2],[x+1.5*m,y],[x-3.5*m,y+2.2])}"/>`;
    else if(blink) s+=`<path class="eye-l" d="${pts([x-3,y],[x+3,y])}"/>`;
    else s+=`<circle class="eye" cx="${f1(x)}" cy="${f1(y)}" r="3.4"/>`;
  }
  const puff=face==='puff';
  for(const az of [-39,39]){ const ch=S(az,puff?-14:-12); if(vis(ch)) s+=`<circle class="cheek${puff?' puff':''}" cx="${f1(ch.p[0])}" cy="${f1(ch.p[1])}" r="${puff?6.5:4.6}"/>`; }
  const m=S(0,-24);
  if(vis(m)){
    if(puff) s+=`<circle class="mouth" cx="${f1(m.p[0])}" cy="${f1(m.p[1])}" r="2.6"/>`;
    else if(face==='effort'){
      const a=S(-14,-24).p, b=S(14,-24).p, q1=S(-5,-21).p, q2=S(5,-27).p;
      s+=`<path class="mouth" d="${pts(a,q1,q2,b)}"/>`;
    } else {
      const a=S(-14,-24).p, b=S(14,-24).p, q=S(0,-40).p;
      s+=`<path class="mouth" d="M${f1(a[0])} ${f1(a[1])} Q${f1(q[0])} ${f1(q[1])} ${f1(b[0])} ${f1(b[1])}"/>`;
    }
  }
  if(face==='effort'){ const sx=c[0]+(fx[0]>=0?0.8:-0.8)*r, sy=c[1]-0.78*r; s+=`<ellipse class="sweat" cx="${f1(sx)}" cy="${f1(sy)}" rx="2.8" ry="4"/>`; }
  return s;
}

// Draws the figure back to front: every bone is sorted by its depth, the head by its centre's.
// The side turned away from the viewer is drawn light, as in the side view.
export function figureQuarterSVG(J,face,opt,{backProps,dumbbells,bands}){
  const W=J.w, D=depthOf, far=J.far;
  let s=`<ellipse class="shadow" cx="${f1((J.l.an[0]+J.r.an[0])/2)}" cy="${FLOOR+3}" rx="38" ry="6"/>`;
  s+=`<line class="floor" x1="10" y1="${FLOOR+8}" x2="390" y2="${FLOOR+8}"/>`;
  s+=backProps;
  const items=[], bone=(a,b,cls,wa,wb)=>items.push({d:(D(wa)+D(wb))/2,svg:`<path class="${cls}" d="${pts(a,b)}"/>`});
  for(const k of ['l','r']){
    const cls=k===far?'limb far':'limb', j=J[k], w=W[k];
    bone(j.hp,j.kn,cls,w.hp,w.kn); bone(j.kn,j.an,cls,w.kn,w.an); bone(j.an,j.toe,cls,w.an,w.toe);
    bone(j.sp,j.el,cls,w.sp,w.el); bone(j.el,j.hd,cls,w.el,w.hd);
    items.push({d:D(w.hd)+0.5,svg:`<circle class="hand${k===far?' far':''}" cx="${f1(j.hd[0])}" cy="${f1(j.hd[1])}" r="5"/>`+dumbbells(k)});
    bone(j.sp,J.sh,'limb',w.sp,W.sh); bone(j.hp,J.hip,'limb',w.hp,W.hip);
  }
  items.push({d:(D(W.hip)+D(W.sh))/2,svg:`<path class="limb" d="${pts(J.hip,J.mid,J.sh,J.nk)}"/>`});
  items.push({d:D(W.hc),svg:headQ(J,face,opt.blink)});
  items.sort((a,b)=>a.d-b.d);
  s+=items.map(i=>i.svg).join('')+bands;
  if(opt.joints){
    const ps=[J.hip,J.mid,J.sh,J.nk,...['l','r'].flatMap(k=>[J[k].el,J[k].hd,J[k].kn,J[k].an,J[k].toe])];
    for(const p of ps) s+=`<circle class="jt" cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.2"/>`;
  }
  return s;
}
