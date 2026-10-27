// Offline support: precache the app shell, then serve from cache and refresh in the background.
// Run `npm run bump` for every release: VERSION (the cache name) carries the app version, so installed copies get the update.
const VERSION='stiko-2026-10-27a';
const ASSETS=[
  '/stiko/','/stiko/index.html','/stiko/manifest.webmanifest','/stiko/css/app.css',
  '/stiko/js/app.js','/stiko/js/version.js','/stiko/js/updates.js','/stiko/js/rig.js','/stiko/js/rig3.js','/stiko/js/i18n.js','/stiko/js/store.js','/stiko/js/vocab.js','/stiko/js/audio.js','/stiko/js/library.js','/stiko/js/player.js',
  '/stiko/js/sessions.js','/stiko/js/sessions-list.js','/stiko/js/editor.js','/stiko/js/ui.js','/stiko/js/cues.js','/stiko/js/about.js','/stiko/js/favs.js','/stiko/js/voice-settings.js','/stiko/js/share.js','/stiko/js/search.js',
  '/stiko/data/library.json','/stiko/data/starters.json','/stiko/icons/icon.svg','/stiko/icons/icon-192.png','/stiko/icons/apple-touch-icon.png',
];
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];

// Fetches skip the browser's HTTP cache: GitHub Pages lets browsers keep files for 10 minutes, and a new version
// must not fill its cache (or refresh it) with the previous version's files.
const fresh=req=>req.mode==='navigate'?fetch(req.url,{cache:'no-cache'}):fetch(req,{cache:'no-cache'});

// A new version installs and waits until the page asks it to take over (Update available, tap to reload).
// Versions named stiko-vNN had no such prompt, so an update over one of those still takes over by itself.
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'}))))
    .then(()=>caches.keys()).then(keys=>{ if(keys.some(k=>/^stiko-v\d+$/.test(k))) self.skipWaiting(); }));
});
self.addEventListener('message',e=>{ if(e.data?.type==='SKIP_WAITING') self.skipWaiting(); });
// Only Stiko's own old caches: the other apps on hodzic.github.io share this origin's storage.
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('stiko-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method!=='GET') return;
  if(url.origin!==location.origin&&!FONT_HOSTS.includes(url.hostname)) return;
  e.respondWith(caches.open(VERSION).then(async cache=>{
    const hit=await cache.match(req,{ignoreSearch:url.origin===location.origin});
    const net=fresh(req).then(res=>{ if(res.ok||res.type==='opaque') cache.put(req,res.clone()); return res; });
    if(hit){ e.waitUntil(net.catch(()=>{})); return hit; }
    return net.catch(()=>req.mode==='navigate'?cache.match('/stiko/index.html'):Response.error());
  }));
});
