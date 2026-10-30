// Offline support and updates: the shared part (install, update, cache cleanup, serving the app's files from the cache and
// refreshing them in the background) is /shared/sw-core.js on hodzic.github.io, used by all the apps there.
// Run `npm run bump` for every release: VERSION (the cache name) carries the app version, so installed copies get the update.
importScripts('/shared/sw-core.js');
const VERSION='stiko-2026-10-30a';
const ASSETS=[
  '/stiko/','/stiko/index.html','/stiko/manifest.webmanifest','/stiko/css/app.css',
  '/stiko/js/app.js','/stiko/js/version.js','/stiko/js/updates.js','/stiko/js/rig.js','/stiko/js/rig3.js','/stiko/js/i18n.js','/stiko/js/store.js','/stiko/js/vocab.js','/stiko/js/audio.js','/stiko/js/library.js','/stiko/js/player.js',
  '/stiko/js/sessions.js','/stiko/js/sessions-list.js','/stiko/js/editor.js','/stiko/js/ui.js','/stiko/js/cues.js','/stiko/js/about.js','/stiko/js/favs.js','/stiko/js/voice-settings.js','/stiko/js/share.js','/stiko/js/search.js',
  '/stiko/data/library.json','/stiko/data/starters.json','/stiko/icons/icon.svg','/stiko/icons/icon-192.png','/stiko/icons/apple-touch-icon.png',
];

appWorker({
  cache:VERSION,
  own:k=>k.startsWith('stiko-'), // only Stiko's own old caches: the other apps on hodzic.github.io share this origin's storage
  shell:ASSETS,
  index:'/stiko/index.html',
  hosts:['fonts.googleapis.com','fonts.gstatic.com'],
  legacy:k=>/^stiko-v\d+$/.test(k), // versions named stiko-vNN had no update prompt: an update over one takes over by itself
});
