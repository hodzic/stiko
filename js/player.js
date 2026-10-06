// Player screen: runs a queue of exercises (a session, or one exercise from the library).
// Each item goes get-ready → sets of work/rest; after the last item the player is done.
import {solve, framesAt, figureSVG, lerpJ, shift} from './rig.js';
import {T, U, doseText, esc, getLang, tagLabel} from './i18n.js';
import {regionOf, familyOf} from './vocab.js';
import * as A from './audio.js';
import * as store from './store.js';
import {SWITCH, workSeconds} from './sessions.js';
import {countdownCue} from './cues.js';

const READY=5;
const ICON_PREV='<svg viewBox="0 0 24 24"><path d="M6 5h2.5v14H6zM20 5v14L9 12z" fill="currentColor"/></svg>';
const ICON_NEXT='<svg viewBox="0 0 24 24"><path d="M15.5 5H18v14h-2.5zM4 5v14l11-7z" fill="currentColor"/></svg>';
const ICON_PLAY='<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';
const ICON_PAUSE='<svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor"/></svg>';
const ICON_SPK='<path d="M3.5 9.5v5h4l5 4v-13l-5 4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
const ICON_BUBBLE='<path d="M4 5.5h16v10.5H10l-4.5 3.5V16H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 9.5h8M8 12.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';

const TPL=`
<a class="back" id="backLink">← <span id="backTxt"></span></a>
<div class="prog" id="prog" hidden><b id="progTitle"></b><span id="progTxt"></span><span id="nextTxt"></span></div>
<div class="layout">
  <div class="left">
    <div class="stage" id="stage" role="button" tabindex="0">
      <svg viewBox="0 0 400 300" aria-hidden="true"><g id="fig"></g></svg>
      <div class="hud" aria-live="polite">
        <div class="cue-now" id="cueNow"></div>
        <div class="count"><b id="countMain"></b><span id="countSub"></span></div>
      </div>
      <div class="paused-ov" aria-hidden="true">
        <div class="pbub">${ICON_PLAY}</div>
        <span data-i18n="tapResume"></span>
      </div>
    </div>
    <div class="controls">
      <button class="skip" id="prevBtn" hidden>${ICON_PREV}</button>
      <button class="play" id="playBtn"></button>
      <button class="skip" id="nextBtn" hidden>${ICON_NEXT}</button>
      <div class="seg" role="group" id="speedSeg">
        <button data-s="0.5">0.5×</button><button data-s="1">1×</button><button data-s="2">2×</button>
      </div>
      <button class="tog" id="soundBtn"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON_SPK}</svg><span data-i18n="sound"></span></button>
      <button class="tog" id="voiceBtn"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON_BUBBLE}</svg><span data-i18n="voice"></span></button>
      <label class="toggle"><input type="checkbox" id="jointsChk"> <span data-i18n="poseCheck"></span></label>
    </div>
    <p class="hint" data-i18n="tapPause"></p>
    <div id="scrubWrap">
      <input type="range" id="scrub" min="0" max="1000" value="0">
      <div class="scrub-label" data-i18n="scrub"></div>
    </div>
    <section class="debug" id="debug" hidden>
      <p data-i18n="debug"></p>
      <code id="debugVals"></code>
    </section>
  </div>
  <section class="howto" aria-labelledby="exName">
    <div class="howto-head">
      <div><h2 id="exName"></h2><p class="dose" id="exDose"></p></div>
      <button class="read" id="readBtn"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON_SPK}</svg><span id="readTxt"></span></button>
    </div>
    <p class="voice-note" id="voiceNote" hidden></p>
    <h3 data-i18n="setup"></h3>
    <p id="hSetup"></p>
    <h3 data-i18n="movement"></h3>
    <ol class="steps" id="hSteps"></ol>
    <h3 data-i18n="breathing"></h3>
    <p id="hBreathe"></p>
    <h3 data-i18n="watch"></h3>
    <ul id="hMistakes"></ul>
    <div class="vary">
      <div><h3 data-i18n="easier"></h3><p id="hEasier"></p></div>
      <div><h3 data-i18n="harder"></h3><p id="hHarder"></p></div>
    </div>
    <details class="kin"><summary data-i18n="aboutEx"></summary><dl id="kin"></dl></details>
    <p class="note" data-i18n="note"></p>
  </section>
</div>`;

// Taxonomy summary shown under the instructions.
function kinHTML(ex){
  const list=(g,vals)=>vals.map(v=>tagLabel(g,v)).join(', ');
  const rows=[
    ['g_pattern', ex.pattern?[...new Set([tagLabel('family',familyOf(ex.pattern)),tagLabel('pattern',ex.pattern)])].join(' · '):''],
    ['g_discipline', ex.discipline?tagLabel('discipline',ex.discipline):''],
    ['g_component', tagLabel('component',ex.component)],
    ['g_region', tagLabel('region',regionOf(ex))],
    ['g_primary', list('muscle',ex.muscles.primary)],
    ['g_secondary', list('muscle',ex.muscles.secondary)],
    ['g_joints', Object.entries(ex.joints).map(([j,a])=>`${tagLabel('joint',j)}: ${a.length?list('action',a):U('held')}`).join('; ')],
    ['g_plane', list('plane',ex.planes)],
    ['g_position', tagLabel('position',ex.position)],
    ['g_laterality', tagLabel('laterality',ex.laterality)],
    ['g_chain', tagLabel('chain',ex.chain)],
  ];
  return rows.filter(r=>r[1]).map(([k,v])=>`<dt>${esc(U(k))}</dt><dd>${esc(v)}</dd>`).join('');
}

// queue: [{ex, dose, block?}]; opts: {back, backLabel, title (a function, so it follows the language), byId}
export function mountPlayer(root,queue,opts){
  root.innerHTML=TPL;
  const $=id=>root.querySelector('#'+id);
  const multi=queue.length>1;
  let idx=0, ex, a, d, h;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing=!reduce, speed=store.load('speed',1), joints=false, scrubPhase=null;
  let st={set:1,mode:'ready',t:0}, readyDur=READY, clock=0, last=performance.now(), raf=0;
  let activeStep=-2, lastJ=null, blendFrom=null, blendStart=-10, lastKey='';
  const ev={key:null,rep:-1,frame:-1,sec:-1};
  $('backLink').href=opts.back;
  $('prog').hidden=!multi; $('prevBtn').hidden=$('nextBtn').hidden=!multi;

  function highlight(i){ activeStep=i; [...$('hSteps').children].forEach((li,k)=>li.classList.toggle('on',k===i)); }

  // Switch to queue item i, starting with a get-ready countdown of `wait` seconds.
  function loadItem(i,wait=READY){
    A.stopReading();
    idx=i; ({ex,dose:d}=queue[i]); a=ex.anim; h=ex.howto;
    st={set:1,mode:'ready',t:0,side:0}; readyDur=wait; scrubPhase=null;
    $('scrubWrap').hidden=!a.cycle;
    renderText();
  }

  function renderText(){
    root.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=U(el.dataset.i18n));
    $('backTxt').textContent=U(opts.backLabel);
    $('exName').textContent=T(ex.name);
    $('exDose').textContent=doseText(d,ex.laterality);
    $('hSetup').textContent=T(h.setup); $('hBreathe').textContent=T(h.breathe);
    $('hSteps').innerHTML=h.steps.map(t=>`<li>${esc(T(t))}</li>`).join('');
    $('hMistakes').innerHTML=h.mistakes.map(t=>`<li>${esc(T(t))}</li>`).join('');
    // Link the easier/harder variants when browsing a single exercise (not mid-session).
    const vary=(text,id)=>{ const v=!multi&&id&&opts.byId?.get(id); return esc(T(text))+(v?` <a class="vlink" href="#/play/${encodeURIComponent(id)}">→ ${esc(T(v.name))}</a>`:''); };
    $('hEasier').innerHTML=vary(h.easier,ex.easier); $('hHarder').innerHTML=vary(h.harder,ex.harder);
    $('kin').innerHTML=kinHTML(ex);
    $('stage').setAttribute('aria-label',U('stageLabel'));
    $('speedSeg').setAttribute('aria-label',U('speed'));
    $('scrub').setAttribute('aria-label',U('scrub'));
    $('prevBtn').setAttribute('aria-label',U('prevEx')); $('nextBtn').setAttribute('aria-label',U('skipEx'));
    $('prevBtn').disabled=idx===0; $('nextBtn').disabled=idx===queue.length-1;
    if(multi){
      const q=queue[idx], nx=queue[idx+1];
      $('progTitle').textContent=opts.title();
      $('progTxt').textContent=`${U('exOf')(idx+1,queue.length)}${q.block?' · '+tagLabel('block',q.block):''}`;
      $('nextTxt').textContent=nx?U('nextUp')(T(nx.ex.short)):'';
    }
    $('readTxt').textContent=A.isReading()?U('stop'):U('read');
    updateVoiceNote(); activeStep=-2; setPlaying(playing);
    document.title=`${multi?opts.title():T(ex.short)} · Stiko`;
  }
  function updateVoiceNote(){
    const n=$('voiceNote');
    if(!A.hasSpeech()){ n.textContent=U('noSpeech'); n.hidden=false; $('readBtn').disabled=true; return; }
    n.textContent=U('noVoice'); n.hidden=!(A.voiceCount()>0&&!A.pickVoice());
  }
  A.onVoicesChanged(updateVoiceNote);

  // Keep the screen awake while a workout is playing.
  let wake=null;
  async function syncWake(){
    const want=playing&&st.mode!=='done'&&document.visibilityState==='visible';
    try{
      if(want&&!wake&&navigator.wakeLock){ wake=await navigator.wakeLock.request('screen'); wake.addEventListener('release',()=>{wake=null;}); }
      else if(!want&&wake){ const w=wake; wake=null; await w.release(); }
    }catch(e){ wake=null; }
  }
  document.addEventListener('visibilitychange',syncWake);

  function setPlaying(v){
    if(v) A.stopReading();
    playing=v; if(v) scrubPhase=null;
    $('playBtn').innerHTML=v?ICON_PAUSE:ICON_PLAY; $('playBtn').setAttribute('aria-label',v?U('pause'):U('play'));
    $('stage').classList.toggle('paused',!v);
    syncWake();
  }
  function toggle(){
    if(st.mode==='done'){ loadItem(0); setPlaying(true); return; }
    setPlaying(!playing);
  }
  $('playBtn').onclick=toggle;
  $('stage').addEventListener('click',toggle);
  $('stage').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle();}});
  $('prevBtn').onclick=()=>{ if(idx>0) loadItem(idx-1); };
  $('nextBtn').onclick=()=>{ if(idx<queue.length-1) loadItem(idx+1); };

  const speedBtns=[...$('speedSeg').querySelectorAll('button')];
  const showSpeed=()=>speedBtns.forEach(x=>x.setAttribute('aria-pressed',+x.dataset.s===speed));
  speedBtns.forEach(b=>b.onclick=()=>{speed=+b.dataset.s; store.save('speed',speed); showSpeed();});
  showSpeed();

  const showToggles=()=>{ $('soundBtn').setAttribute('aria-pressed',A.prefs.sound); $('voiceBtn').setAttribute('aria-pressed',A.prefs.voice); };
  $('soundBtn').onclick=()=>{ A.setSound(!A.prefs.sound); showToggles(); A.unlockAudio(); A.tone('tick'); };
  $('voiceBtn').onclick=()=>{ A.setVoice(!A.prefs.voice); showToggles(); };
  showToggles();

  $('jointsChk').onchange=e=>{joints=e.target.checked; $('debug').hidden=!joints;};
  $('scrub').oninput=e=>{A.stopReading(); setPlaying(false); scrubPhase=e.target.value/1000; if(st.mode!=='work'){st.mode='work';st.t=0;}};

  // Read aloud: setup, each step (showing its pose), breathing.
  function setReadStep(i){
    highlight(i);
    if(i>=0&&a.cycle){ scrubPhase=(a.frames.find((f,k)=>(f.step??k)===i)??a.frames[0]).t+0.01; if(st.mode!=='work'){st.mode='work';st.t=0;} }
  }
  $('readBtn').onclick=()=>{
    A.unlockAudio();
    if(A.isReading()){ A.stopReading(); return; }
    if(!A.hasSpeech()) return;
    setPlaying(false);
    const parts=[{text:`${T(ex.name)}. ${U('setup')}. ${T(h.setup)}`, step:-1},
      ...h.steps.map((x,i)=>({text:`${U('step')} ${i+1}. ${T(x)}`, step:i})),
      {text:`${U('breathing')}. ${T(h.breathe)}`, step:-1}];
    A.readParts(parts,setReadStep,()=>{ $('readBtn').classList.remove('on'); $('readTxt').textContent=U('read'); activeStep=-2; });
    $('readBtn').classList.add('on'); $('readTxt').textContent=U('stop');
  };

  // Unilateral exercises run each set on one side, then a short switch, then the other side (drawn mirrored).
  const unilateral=()=>ex.laterality==='unilateral';
  function advance(dt){
    st.t+=dt;
    if(st.mode==='ready'){ if(st.t>=readyDur){st.t-=readyDur; st.mode='work'; st.side=0;} }
    else if(st.mode==='work'){
      const dur=workSeconds(d,ex);
      if(st.t>=dur){
        st.t-=dur;
        if(unilateral()&&st.side===0){ st.mode='switch'; st.side=1; }
        else if(st.set<d.sets) st.mode='rest';
        else if(idx<queue.length-1) loadItem(idx+1,Math.max(READY,d.rest));  // the rest becomes the next exercise's countdown
        else { st.mode='done'; syncWake(); }
      }
    } else if(st.mode==='switch'){ if(st.t>=SWITCH){st.t-=SWITCH; st.mode='work';} }
    else if(st.mode==='rest'){ if(st.t>=d.rest){st.t-=d.rest; st.mode='work'; st.set++; st.side=0;} }
  }

  function cues(){
    const key=`${idx}:${st.mode}:${st.side}`;
    if(key!==ev.key){
      const from=ev.key&&ev.key.split(':')[1];
      if(st.mode==='ready') A.speak(`${idx>0?U('nextUp')(T(ex.name)):T(ex.name)}. ${U('ready')}.`);
      else if(st.mode==='work'){ A.tone('go'); if(from==='rest') A.speak(U('setSay')(st.set)); else if(d.mode==='hold') A.speak(T(a.frames[0].label)); }
      else if(st.mode==='rest'){ A.tone('done'); A.speak(U('restSay')(d.rest)); }
      else if(st.mode==='switch'){ A.tone('done'); A.speak(U('switchSides')); }
      else if(st.mode==='done'){ A.tone('done'); A.speak(U('great')); }
      ev.key=key; ev.rep=-1; ev.frame=-1; ev.sec=-1;
    }
    if(st.mode==='work'&&d.mode==='reps'){
      const r=Math.floor(st.t/a.cycle), fi=framesAt(a.frames,(st.t%a.cycle)/a.cycle,a.loopAdd).step;
      // A flow (e.g. sun salutation) is paced by its step cues, so they are spoken on every round instead of rep numbers.
      if(r!==ev.rep){ ev.rep=r; if(r>0&&r<d.reps){ A.tone('tick'); if(!a.flow) A.speak(r===d.reps-1?U('lastOne'):String(r+1)); } }
      if(fi!==ev.frame){ ev.frame=fi; if(a.flow||(r===0&&st.set===1&&st.side===0)) A.speak(T(a.frames.find(f=>(f.step??a.frames.indexOf(f))===fi).label)); }
    }
    let left=null;
    if(st.mode==='ready') left=readyDur-st.t; else if(st.mode==='rest') left=d.rest-st.t; else if(st.mode==='switch') left=SWITCH-st.t;
    else if(st.mode==='work'&&d.mode!=='reps') left=workSeconds(d,ex)-st.t;
    if(left!==null){
      const sec=Math.ceil(left);
      if(sec!==ev.sec){
        // The first second of each countdown is skipped: the mode announcement already covers it.
        if(ev.sec!==-1){
          const cue=countdownCue(sec);
          if(cue==='beep') A.tone('count');
          else if(cue==='tick') A.tone('soft');
          else if(cue==='say'&&!A.speak(String(sec))) A.tone('mark');  // voice off: a chime marks the tens
        }
        ev.sec=sec;
      }
    }
  }

  function draw(){
    let fr, spec=a.spec, main, sub=st.mode==='done'?'':U('set')(st.set,d.sets), phase=null;
    if(unilateral()&&st.mode!=='done') sub+=' · '+U('sideOf')(st.side+1);
    const sway=Math.sin(clock*2.2);
    if(scrubPhase!==null&&a.cycle){
      phase=scrubPhase; fr=framesAt(a.frames,phase,a.loopAdd); main=U('paused');
    } else if(st.mode==='work'){
      if(a.cycle){
        // Reps and timed sets both loop the keyframe cycle.
        phase=(st.t%a.cycle)/a.cycle; fr=framesAt(a.frames,phase,a.loopAdd);
        main=d.mode==='reps'?U('rep')(Math.min(d.reps,Math.floor(st.t/a.cycle)+1),d.reps):U('left')(Math.max(0,Math.ceil(d.time-st.t)));
      } else {
        const base=a.frames[0];
        fr={pose:{...base.pose, torso:(base.pose.torso||0)+0.8*sway}, face:base.face, label:base.label, step:0};
        main=U('left')(Math.max(0,Math.ceil(workSeconds(d,ex)-st.t)));
      }
    } else {
      if(a.restPose){ spec=a.restPose.spec; fr={pose:{...a.restPose.pose}, face:'smile', label:''}; }
      else { fr=framesAt(a.frames,0); fr.face='smile'; fr.pose.torso=(fr.pose.torso||0)+1.2*sway; }
      if(st.mode==='ready'){ fr.label=U('ready'); main=U('startsIn')(Math.max(1,Math.ceil(readyDur-st.t))); }
      else if(st.mode==='switch'){ fr.label=U('switchSides'); main=U('startsIn')(Math.max(1,Math.ceil(SWITCH-st.t))); }
      else if(st.mode==='rest'){ fr.label=U('restLabel'); main=U('rest')(Math.max(0,Math.ceil(d.rest-st.t))); }
      else { fr.label=U('great'); main=multi?U('allDone'):U('done'); sub=U('again'); }
    }
    const flip=st.side===1&&st.mode!=='rest'&&st.mode!=='done';
    const key=`${idx}:${st.mode}:${flip}`;
    if(key!==lastKey){
      // Blend between poses, except across a side switch: the mirror would make the blend cross the stage.
      if(lastJ&&lastKey.split(':')[2]===String(flip)){blendFrom=lastJ; blendStart=clock;} else blendFrom=null;
      lastKey=key;
    }
    let J=solve(spec,fr.pose);
    const bu=(clock-blendStart)/0.7;
    if(blendFrom&&bu<1&&blendFrom.view===J.view){ const e=0.5-0.5*Math.cos(Math.PI*bu); J=lerpJ(blendFrom,J,e); }
    lastJ=J;
    if(d.mode==='hold'&&st.mode==='work'&&playing){
      const effort=st.t/d.hold; if(effort>0.6) shift(J,0,(effort-0.6)*2.2*Math.sin(clock*38));
    }
    const blink=(clock%3.8)<0.13;
    $('fig').innerHTML=figureSVG(J,fr.face,{blink,joints,flip,floorWork:a.floorWork,farShift:a.farShift,props:a.props});
    const want=(st.mode==='work'||scrubPhase!==null)?(fr.step??0):-1;
    if(!A.isReading()&&want!==activeStep) highlight(want);
    $('cueNow').textContent=T(fr.label); $('countMain').textContent=main; $('countSub').textContent=sub;
    if(phase!==null&&scrubPhase===null) $('scrub').value=Math.round(phase*1000);
    if(joints){
      const p=fr.pose;
      $('debugVals').textContent=Object.keys(p).sort().map(k=>`${k} ${Math.round(p[k])}°`).join('   ');
    }
  }

  function tick(now){
    const dt=Math.min(0.05,(now-last)/1000); last=now; clock+=dt;
    if(playing&&scrubPhase===null){ advance(dt*speed); cues(); }
    draw(); raf=requestAnimationFrame(tick);
  }

  loadItem(0); raf=requestAnimationFrame(tick);
  return {
    relang:renderText,
    destroy(){
      cancelAnimationFrame(raf); A.onVoicesChanged(null); A.silence();
      document.removeEventListener('visibilitychange',syncWake); playing=false; syncWake();
    },
  };
}
