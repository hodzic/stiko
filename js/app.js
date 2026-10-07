// App shell: loads the library, routes between screens, handles language and the service worker.
import {U, getLang, setLang, LANGS, LANG_NAMES} from './i18n.js';
import {mountLibrary} from './library.js';
import {mountPlayer} from './player.js';
import {mountSessions} from './sessions-list.js';
import {mountEditor} from './editor.js';
import {mountAbout} from './about.js';
import {mountVoiceSettings} from './voice-settings.js';
import * as S from './sessions.js';
import * as store from './store.js';

const main=document.getElementById('view');
const langSel=document.getElementById('langSel');
const tabs=document.getElementById('tabs');
const helpBtn=document.getElementById('helpBtn');
let voiceMenu=null;
let lib=null, view=null;

function showLang(){
  document.documentElement.lang=getLang();
  langSel.value=getLang();
  tabs.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=U(el.dataset.i18n));
  helpBtn.setAttribute('aria-label',U('help')); helpBtn.title=U('help');
  voiceMenu?.relang();
}
voiceMenu=mountVoiceSettings(document.getElementById('voiceMenu'));
langSel.innerHTML=LANGS.map(l=>`<option value="${l}" lang="${l}">${LANG_NAMES[l]}</option>`).join('');
langSel.addEventListener('change',()=>{ setLang(langSel.value); showLang(); view?.relang(); });

// Routes:
//   #/sessions                    sessions list (home)
//   #/sessions/<id>               session editor
//   #/sessions/<id>/add/<block>   library in pick mode
//   #/run/<id>                    play a session
//   #/library                     exercise library
//   #/play/<exerciseId>           play one exercise
//   #/about                       how to use the app and health advice (shown once on first launch)
function mount(hash){
  const p=hash.replace(/^#\/?/,'').split('/').map(decodeURIComponent);
  const tab=p[0]==='library'||p[0]==='play'?'library':'sessions';
  tabs.querySelectorAll('a').forEach(a=>a.setAttribute('aria-current',a.dataset.tab===tab?'page':'false'));
  if(p[0]==='about') return mountAbout(main);
  if(!store.load('welcomed',false)&&(!p[0]||p[0]==='sessions')&&!p[1]){ location.replace('#/about'); return null; }
  if(p[0]==='library'){ tabs.hidden=false; return mountLibrary(main,lib); }
  if(p[0]==='play'&&lib.byId.has(p[1])){
    const ex=lib.byId.get(p[1]);
    return mountPlayer(main,[{ex,dose:ex.dose}],{back:'#/library',backLabel:'back',byId:lib.byId});
  }
  if(p[0]==='run'){
    const s=S.get(p[1]);
    const queue=s?s.items.filter(it=>lib.byId.has(it.ex)).map(it=>{ const ex=lib.byId.get(it.ex); return {ex,dose:S.itemDose(it,ex),block:it.block}; }):[];
    if(queue.length) return mountPlayer(main,queue,{back:'#/sessions',backLabel:'sessions',title:()=>S.nameOf(s,getLang())});
    location.replace('#/sessions'); return null;
  }
  if(p[0]==='sessions'&&p[1]&&p[2]==='add') return mountLibrary(main,lib,{sessionId:p[1],block:p[3]});
  if(p[0]==='sessions'&&p[1]) return mountEditor(main,lib,p[1]);
  tabs.hidden=false;
  return mountSessions(main,lib);
}
function route(){
  view?.destroy(); view=null;
  tabs.hidden=true;
  view=mount(location.hash);
  window.scrollTo(0,0);
}

// Add starter sessions this device hasn't been offered yet. Starters someone deleted stay deleted.
async function seed(){
  let offered=store.load('starters',null);
  if(!offered) offered=S.hasStore()?['starter-basics']:[];  // devices from before starter tracking had only this one
  try{
    const text=await (await fetch('data/starters.json')).text(), r=S.parseImport(text,lib.byId,getLang());
    const added=Object.fromEntries((JSON.parse(text).sessions||[]).filter(x=>x.added).map(x=>[x.id,x.added]));
    const fresh=(r.sessions||[]).filter(x=>!offered.includes(x.id));
    const named=S.attachNames(S.loadAll(),r.sessions||[]);
    const upd=S.refreshItems(named.list,r.sessions||[],store.load('starterItems',{}),added);
    if(fresh.length||named.changed||upd.changed||!S.hasStore()) S.saveAll([...upd.list,...fresh]);
    store.save('starterItems',upd.seen);
    offered=[...offered,...fresh.map(x=>x.id)];
  }catch(e){ if(!S.hasStore()) S.saveAll([]); }
  store.save('starters',offered);
}

async function start(){
  showLang();
  try{
    const res=await fetch('data/library.json');
    if(!res.ok) throw new Error(res.status);
    lib=await res.json();
    lib.byId=new Map(lib.exercises.map(e=>[e.id,e]));
  }catch(e){
    main.innerHTML=`<p class="note">${U('loadError')}</p>`; return;
  }
  await seed();
  // Ask the browser not to evict saved sessions under storage pressure.
  navigator.storage?.persist?.().catch(()=>{});
  addEventListener('hashchange',route);
  route();
}
start();

if('serviceWorker' in navigator){
  // When an updated version takes over, reload once so the new code runs now rather than on the next visit.
  // (No reload on the very first install, when there was no previous version.)
  const hadController=!!navigator.serviceWorker.controller;
  let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(hadController&&!reloaded){ reloaded=true; location.reload(); } });
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
