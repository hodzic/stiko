// App shell: loads the library, routes between screens, handles language and the service worker.
import {U, getLang, setLang, LANGS} from './i18n.js';
import {mountLibrary} from './library.js';
import {mountPlayer} from './player.js';
import {mountSessions} from './sessions-list.js';
import {mountEditor} from './editor.js';
import * as S from './sessions.js';
import * as store from './store.js';

const main=document.getElementById('view');
const langSeg=document.getElementById('langSeg');
const tabs=document.getElementById('tabs');
let lib=null, view=null;

function showLang(){
  document.documentElement.lang=getLang();
  langSeg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.l===getLang()));
  tabs.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=U(el.dataset.i18n));
}
langSeg.innerHTML=LANGS.map(l=>`<button data-l="${l}">${l.toUpperCase()}</button>`).join('');
langSeg.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  setLang(b.dataset.l); showLang(); view?.relang();
});

// Routes:
//   #/sessions                    sessions list (home)
//   #/sessions/<id>               session editor
//   #/sessions/<id>/add/<block>   library in pick mode
//   #/run/<id>                    play a session
//   #/library                     exercise library
//   #/play/<exerciseId>           play one exercise
function mount(hash){
  const p=hash.replace(/^#\/?/,'').split('/').map(decodeURIComponent);
  const tab=p[0]==='library'||p[0]==='play'?'library':'sessions';
  tabs.querySelectorAll('a').forEach(a=>a.setAttribute('aria-current',a.dataset.tab===tab?'page':'false'));
  if(p[0]==='library'){ tabs.hidden=false; return mountLibrary(main,lib); }
  if(p[0]==='play'&&lib.byId.has(p[1])){
    const ex=lib.byId.get(p[1]);
    return mountPlayer(main,[{ex,dose:ex.dose}],{back:'#/library',backLabel:'back',byId:lib.byId});
  }
  if(p[0]==='run'){
    const s=S.get(p[1]);
    const queue=s?s.items.filter(it=>lib.byId.has(it.ex)).map(it=>{ const ex=lib.byId.get(it.ex); return {ex,dose:S.itemDose(it,ex),block:it.block}; }):[];
    if(queue.length) return mountPlayer(main,queue,{back:'#/sessions',backLabel:'sessions',title:S.nameOf(s,getLang())});
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
    const r=S.parseImport(await (await fetch('data/starters.json')).text(),lib.byId,getLang());
    const fresh=(r.sessions||[]).filter(x=>!offered.includes(x.id));
    const {list,changed}=S.attachNames(S.loadAll(),r.sessions||[]);
    if(fresh.length||changed||!S.hasStore()) S.saveAll([...list,...fresh]);
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

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
