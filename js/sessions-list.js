// Sessions screen: list of named sessions with start, edit, reorder, duplicate, delete; backup export and import.
import {U, esc, getLang, tagLabel} from './i18n.js';
import {SPORTS} from './vocab.js';
import * as store from './store.js';
import * as S from './sessions.js';
import {toast, saveJSON} from './ui.js';
import * as F from './favs.js';

export function mountSessions(root,lib){
  const byId=lib.byId;
  root.innerHTML=`<section>
    <div class="lib-head"><h2 data-i18n="sessions"></h2><button class="btn primary" id="newBtn" data-i18n="newSession"></button></div>
    <div class="fgroup sport-filter" id="sportFilter" role="group"></div>
    <ul class="cards" id="list"></ul>
    <div class="backup">
      <p class="note" data-i18n="storageNote"></p>
      <div class="row">
        <button class="btn" id="exportBtn" data-i18n="exportAll"></button>
        <label class="btn" tabindex="0"><span data-i18n="importFile"></span><input type="file" id="importIn" accept=".json,application/json" hidden></label>
      </div>
    </div>
  </section>`;
  const $=id=>root.querySelector('#'+id);

  function render(){
    root.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=U(el.dataset.i18n));
    document.title=`${U('sessions')} · Stiko`;
    const all=S.loadAll();
    $('exportBtn').disabled=!all.length;
    // Sport filter: only when some session has a sport. 'all', 'none' (general fitness) or a sport.
    const sports=SPORTS.filter(sp=>all.some(s=>s.sport===sp));
    let pick=store.load('sessionSport','all');
    if(pick!=='all'&&pick!=='none'&&!sports.includes(pick)) pick='all';
    const opts=sports.length?['all','none',...sports]:[];
    // Favourites: a toggle on top of the sport filter, shown once there is a favourite.
    const favIds=new Set(F.list('session').filter(id=>all.some(s=>s.id===id)));
    let favOnly=store.load('sessionFavOnly',false)&&favIds.size>0;
    $('sportFilter').hidden=!opts.length&&!favIds.size;
    $('sportFilter').setAttribute('aria-label',U('g_sport'));
    $('sportFilter').innerHTML=(favIds.size?F.chipHTML(favOnly):'')+opts.map(v=>`<button class="chip" data-sport="${v}" aria-pressed="${v===pick}">${esc(v==='all'?U('allSessions'):v==='none'?U('noSport'):tagLabel('sport',v))}</button>`).join('');
    const list=(opts.length?all.filter(s=>pick==='all'||(pick==='none'?!s.sport:s.sport===pick)):all).filter(s=>!favOnly||favIds.has(s.id));
    if(!list.length){ $('list').innerHTML=`<li class="empty">${esc(U('noSessions'))}</li>`; return; }
    $('list').innerHTML=list.map((s,k)=>{
      const est=S.estimate(s.items,byId);
      return `<li class="scard has-fav" data-id="${esc(s.id)}">${F.starHTML('session',s.id)}
        <a class="scard-main" href="#/sessions/${encodeURIComponent(s.id)}">
          <h3>${esc(S.nameOf(s,getLang()))}</h3>
          <p class="dose">${s.sport?esc(tagLabel('sport',s.sport))+' · ':''}${esc(U('exCount')(s.items.length))}${s.items.length?' · '+esc(U('mins')(S.minutes(est.total))):''}</p>
        </a>
        <div class="row">
          ${s.items.length?`<a class="btn primary" href="#/run/${encodeURIComponent(s.id)}">▶ ${esc(U('start'))}</a>`:''}
          <a class="btn" href="#/sessions/${encodeURIComponent(s.id)}">${esc(U('edit'))}</a>
          <details class="menu"><summary class="btn" aria-label="${esc(U('more'))}">⋯</summary>
            <div class="menu-pop">
              ${k?`<button data-act="top">${esc(U('moveTop'))}</button>`:''}
              <button data-act="dup">${esc(U('duplicate'))}</button>
              <button class="danger" data-act="del">${esc(U('del'))}</button>
            </div></details>
          <span class="reorder">
            <button class="icon" data-act="up" aria-label="${esc(U('moveUp'))}" ${k?'':'disabled'}>↑</button>
            <button class="icon" data-act="down" aria-label="${esc(U('moveDown'))}" ${k<list.length-1?'':'disabled'}>↓</button>
          </span>
        </div></li>`;
    }).join('');
  }

  $('sportFilter').addEventListener('click',e=>{
    if(e.target.closest('#favChip')){ store.save('sessionFavOnly',!store.load('sessionFavOnly',false)); render(); return; }
    const b=e.target.closest('button[data-sport]'); if(!b) return;
    store.save('sessionSport',b.dataset.sport); render();
  });
  $('newBtn').onclick=()=>{ const s=S.create(U('newSession')); location.hash=`#/sessions/${encodeURIComponent(s.id)}`; };
  // Close an open ⋯ menu when tapping anywhere else.
  const closeMenus=e=>root.querySelectorAll('details.menu[open]').forEach(d=>{ if(!d.contains(e.target)) d.open=false; });
  document.addEventListener('click',closeMenus);
  $('list').addEventListener('click',e=>{
    const f=e.target.closest('button[data-fav]');
    if(f){ F.toggle('session',f.dataset.fav); render(); root.querySelector(`button[data-fav="${CSS.escape(f.dataset.fav)}"]`)?.focus(); return; }
    const b=e.target.closest('button[data-act]'); if(!b) return;
    const id=b.closest('[data-id]').dataset.id, s=S.get(id); if(!s) return;
    const name=S.nameOf(s,getLang());
    const move={up:-1,down:1,top:'top'}[b.dataset.act];
    if(move!=null){
      const visible=[...root.querySelectorAll('#list [data-id]')].map(li=>li.dataset.id);
      S.saveAll(S.moveSession(S.loadAll(),id,move,visible)); render();
      root.querySelector(`#list [data-id="${CSS.escape(id)}"] [data-act="${move===1?'down':'up'}"]:not(:disabled)`)?.focus();
      return;
    }
    if(b.dataset.act==='dup') S.duplicate(id,U('copyName')(name));
    else if(b.dataset.act==='del'&&confirm(U('confirmDelete')(name))){ S.remove(id); F.drop('session',id); }
    render();
  });
  $('exportBtn').onclick=()=>saveJSON(`stiko-sessions-${new Date().toISOString().slice(0,10)}.json`,S.exportPayload(S.loadAll()));
  $('importIn').onchange=async e=>{
    const f=e.target.files[0]; e.target.value=''; if(!f) return;
    const r=S.parseImport(await f.text(),byId,getLang());
    if(r.error){ toast(U('importFail')); return; }
    const m=S.mergeImport(S.loadAll(),r.sessions);
    S.saveAll(m.sessions);
    toast(m.added?U('imported')(m.added,m.skipped,r.dropped):U('importNone')(m.skipped));
    render();
  };
  root.querySelector('label.btn').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); $('importIn').click(); } });

  render();
  return {relang:render, destroy(){ document.removeEventListener('click',closeMenus); }};
}
