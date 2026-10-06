// App shell: loads the library, routes between screens, handles language and the service worker.
import {U, getLang, setLang, LANGS} from './i18n.js';
import {mountLibrary} from './library.js';
import {mountPlayer} from './player.js';

const main=document.getElementById('view');
const langSeg=document.getElementById('langSeg');
let lib=null, view=null;

function showLang(){
  document.documentElement.lang=getLang();
  langSeg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.l===getLang()));
}
langSeg.innerHTML=LANGS.map(l=>`<button data-l="${l}">${l.toUpperCase()}</button>`).join('');
langSeg.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  setLang(b.dataset.l); showLang(); view?.relang();
});

function route(){
  view?.destroy(); view=null;
  const m=location.hash.match(/^#\/play\/(.+)$/);
  const ex=m&&lib.exercises.find(e=>e.id===decodeURIComponent(m[1]));
  view=ex?mountPlayer(main,ex):mountLibrary(main,lib);
  window.scrollTo(0,0);
}

async function start(){
  showLang();
  try{
    const res=await fetch('data/library.json');
    if(!res.ok) throw new Error(res.status);
    lib=await res.json();
  }catch(e){
    main.innerHTML=`<p class="note">${U('loadError')}</p>`; return;
  }
  addEventListener('hashchange',route);
  route();
}
start();

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
