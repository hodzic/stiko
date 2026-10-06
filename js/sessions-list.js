// Sessions screen: list of named sessions with start, edit, duplicate, delete; backup export and import.
import {U, esc, getLang} from './i18n.js';
import * as S from './sessions.js';
import {toast, saveJSON} from './ui.js';

export function mountSessions(root,lib){
  const byId=lib.byId;
  root.innerHTML=`<section>
    <div class="lib-head"><h2 data-i18n="sessions"></h2><button class="btn primary" id="newBtn" data-i18n="newSession"></button></div>
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
    const list=S.loadAll();
    $('exportBtn').disabled=!list.length;
    if(!list.length){ $('list').innerHTML=`<li class="empty">${esc(U('noSessions'))}</li>`; return; }
    $('list').innerHTML=list.map(s=>{
      const est=S.estimate(s.items,byId);
      return `<li class="scard" data-id="${esc(s.id)}">
        <a class="scard-main" href="#/sessions/${encodeURIComponent(s.id)}">
          <h3>${esc(s.name)}</h3>
          <p class="dose">${esc(U('exCount')(s.items.length))}${s.items.length?' · '+esc(U('mins')(S.minutes(est.total))):''}</p>
        </a>
        <div class="row">
          ${s.items.length?`<a class="btn primary" href="#/run/${encodeURIComponent(s.id)}">▶ ${esc(U('start'))}</a>`:''}
          <a class="btn" href="#/sessions/${encodeURIComponent(s.id)}">${esc(U('edit'))}</a>
          <details class="menu"><summary class="btn" aria-label="${esc(U('more'))}">⋯</summary>
            <div class="menu-pop">
              <button data-act="dup">${esc(U('duplicate'))}</button>
              <button class="danger" data-act="del">${esc(U('del'))}</button>
            </div></details>
        </div></li>`;
    }).join('');
  }

  $('newBtn').onclick=()=>{ const s=S.create(U('newSession')); location.hash=`#/sessions/${encodeURIComponent(s.id)}`; };
  // Close an open ⋯ menu when tapping anywhere else.
  const closeMenus=e=>root.querySelectorAll('details.menu[open]').forEach(d=>{ if(!d.contains(e.target)) d.open=false; });
  document.addEventListener('click',closeMenus);
  $('list').addEventListener('click',e=>{
    const b=e.target.closest('button[data-act]'); if(!b) return;
    const id=b.closest('[data-id]').dataset.id, s=S.get(id); if(!s) return;
    if(b.dataset.act==='dup') S.duplicate(id,U('copyName')(s.name));
    else if(b.dataset.act==='del'&&confirm(U('confirmDelete')(s.name))) S.remove(id);
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
