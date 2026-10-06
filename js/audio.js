// Web Audio tones and speech synthesis. Both need a first user gesture to unlock.
import {getLang} from './i18n.js';
import * as store from './store.js';

export const prefs={sound:store.load('sound',true), voice:store.load('voice',true)};
export function setSound(v){ prefs.sound=v; store.save('sound',v); }
export function setVoice(v){ prefs.voice=v; store.save('voice',v); if(!v&&synth&&!reading) synth.cancel(); }

const synth=window.speechSynthesis||null;
export const hasSpeech=()=>!!synth;
let actx=null, speechPrimed=false;

export function unlockAudio(){
  if(synth&&!speechPrimed){ speechPrimed=true; try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; keep(u); synth.speak(u); }catch(e){} }
  if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(actx&&actx.state==='suspended') actx.resume();
}
document.addEventListener('pointerdown',unlockAudio,{passive:true});
document.addEventListener('keydown',unlockAudio);

function note(freq,start,dur,type,vol){
  const t=actx.currentTime+start, o=actx.createOscillator(), g=actx.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+dur+0.03);
}
export function tone(kind){
  if(!prefs.sound||!actx||actx.state!=='running') return;
  if(kind==='tick') note(700,0,0.07,'triangle',0.16);
  else if(kind==='count') note(880,0,0.14,'sine',0.22);
  else if(kind==='go'){ note(1320,0,0.28,'sine',0.24); note(1760,0.02,0.22,'sine',0.08); }
  else if(kind==='done'){ note(660,0,0.18,'triangle',0.2); note(990,0.16,0.3,'triangle',0.2); }
}

export function pickVoice(){
  if(!synth) return null;
  const vs=synth.getVoices(), prefsL=getLang()==='bs'?['bs','hr','sr']:['en'];
  for(const p of prefsL){ const v=vs.find(v=>v.lang.toLowerCase().replace('_','-').startsWith(p)); if(v) return v; }
  return null;
}
export const voiceCount=()=>synth?synth.getVoices().length:0;
let voicesCb=null;
export function onVoicesChanged(cb){ voicesCb=cb; }
if(synth) synth.onvoiceschanged=()=>voicesCb&&voicesCb();

function utter(text){
  const u=new SpeechSynthesisUtterance(text), v=pickVoice(), bs=getLang()==='bs';
  if(v){u.voice=v;u.lang=v.lang;} else u.lang=bs?'bs-BA':'en-US';
  u.rate=bs?0.95:1;
  return u;
}
const held=[];
function keep(u){ held.push(u); if(held.length>30) held.shift(); return u; }  // stops Chrome garbage-collecting live utterances
function say(u){
  if(synth.paused) synth.resume();
  if(synth.speaking||synth.pending){ synth.cancel(); setTimeout(()=>synth.speak(u),60); }  // speak right after cancel can be dropped
  else synth.speak(u);
}
// Short spoken cue; skipped while reading aloud.
export function speak(text){
  if(!prefs.voice||!synth||reading||!text) return;
  say(keep(utter(text)));
}

// Read-aloud: queue of {text, step}; onStep fires as each part starts, onEnd when finished or stopped.
let reading=false, readToken=0, readEnd=null;
export const isReading=()=>reading;
export function readParts(parts,onStep,onEnd){
  if(!synth) return;
  if(synth.speaking||synth.pending) synth.cancel();
  if(synth.paused) synth.resume();
  const tok=++readToken; reading=true; readEnd=onEnd;
  parts.forEach((p,i)=>{
    const u=keep(utter(p.text));
    u.onstart=()=>{ if(tok===readToken) onStep(p.step); };
    if(i===parts.length-1) u.onend=u.onerror=()=>{ if(tok===readToken) stopReading(); };
    synth.speak(u);
  });
}
export function stopReading(){
  if(!reading) return;
  readToken++; reading=false; if(synth) synth.cancel();
  const cb=readEnd; readEnd=null; if(cb) cb();
}
export function silence(){ stopReading(); if(synth) synth.cancel(); }
