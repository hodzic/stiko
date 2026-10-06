// Offline support: precache the app shell, then serve from cache and refresh in the background.
// Bump VERSION whenever the file list changes.
const VERSION='stiko-v9';
const ASSETS=[
  './','index.html','manifest.webmanifest','css/app.css',
  'js/app.js','js/rig.js','js/i18n.js','js/store.js','js/vocab.js','js/audio.js','js/library.js','js/player.js',
  'js/sessions.js','js/sessions-list.js','js/editor.js','js/ui.js','js/cues.js',
  'data/library.json','data/starters.json','icons/icon.svg','icons/icon-192.png','icons/apple-touch-icon.png',
];
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];

// Fetches skip the browser's HTTP cache: GitHub Pages lets browsers keep files for 10 minutes, and a new version
// must not fill its cache (or refresh it) with the previous version's files.
const fresh=req=>req.mode==='navigate'?fetch(req.url,{cache:'no-cache'}):fetch(req,{cache:'no-cache'});

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method!=='GET') return;
  if(url.origin!==location.origin&&!FONT_HOSTS.includes(url.hostname)) return;
  e.respondWith(caches.open(VERSION).then(async cache=>{
    const hit=await cache.match(req,{ignoreSearch:url.origin===location.origin});
    const net=fresh(req).then(res=>{ if(res.ok||res.type==='opaque') cache.put(req,res.clone()); return res; });
    if(hit){ e.waitUntil(net.catch(()=>{})); return hit; }
    return net.catch(()=>req.mode==='navigate'?cache.match('index.html'):Response.error());
  }));
});
