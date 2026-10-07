// Session editor: name, three fixed blocks, per-item sets/reps/hold/rest, reorder, remove, share; restore a starter.
import {T, U, esc, tagLabel, getLang} from './i18n.js';
import {MAIN_FAMILIES, familyOf, SPORTS} from './vocab.js';
import * as S from './sessions.js';
import {thumbSVG, thumbBox} from './library.js';
import {saveJSON, slug} from './ui.js';

export function mountEditor(root,lib,id){
  const byId=lib.byId;
  let s=S.get(id);
  if(!s){ root.innerHTML=`<a class="back" href="#/sessions">← <span>${esc(U('sessions'))}</span></a><p class="empty">${esc(U('notFound'))}</p>`; return {relang(){}, destroy(){}}; }

  root.innerHTML=`<a class="back" href="#/sessions">← <span data-i18n="sessions"></span></a>
  <section class="editor">
    <label class="field"><span class="flabel" data-i18n="name"></span><input id="nameIn" maxlength="80" autocomplete="off"></label>
    <label class="field"><span class="flabel" data-i18n="g_sport"></span><select id="sportIn"></select></label>
    <div class="ed-sum"><span class="dose" id="total"></span><a class="btn primary" id="playBtn"></a></div>
    <div id="blocks"></div>
    <div class="row ed-foot">
      <button class="btn" id="shareBtn" data-i18n="share"></button>
      <button class="btn" id="dupBtn" data-i18n="duplicate"></button>
      <button class="btn" id="restoreBtn" data-i18n="restore" hidden></button>
      <button class="btn danger" id="delBtn" data-i18n="del"></button>
    </div>
  </section>`;
  const $=x=>root.querySelector('#'+x);
  let starter=null;  // the starter session this one came from, once data/starters.json has loaded
  const showRestore=()=>{ $('restoreBtn').hidden=!starter||S.isOriginal(s,starter); };
  const save=()=>{ s=S.put(s); renderTotals(); showRestore(); };
  const nm=()=>S.nameOf(s,getLang());

  function num(i,key,label){
    const [lo,hi]=S.LIMITS[key];
    return `<label class="num"><span>${esc(label)}</span><input type="number" inputmode="numeric" min="${lo}" max="${hi}" data-i="${i}" data-k="${key}" value="${s.items[i][key]}"></label>`;
  }
  function itemHTML(it,i){
    const ex=byId.get(it.ex);
    return `<li class="item">
      <svg class="thumb sm" viewBox="${thumbBox(ex)}" aria-hidden="true">${thumbSVG(ex)}</svg>
      <div class="item-body">
        <div class="item-head"><a href="#/play/${encodeURIComponent(ex.id)}">${esc(T(ex.name))}</a>
          <span class="item-acts">
            <button class="icon" data-i="${i}" data-act="up" aria-label="${esc(U('moveUp'))}" ${S.canMove(s.items,i,-1)?'':'disabled'}>↑</button>
            <button class="icon" data-i="${i}" data-act="down" aria-label="${esc(U('moveDown'))}" ${S.canMove(s.items,i,1)?'':'disabled'}>↓</button>
            <button class="icon" data-i="${i}" data-act="rm" aria-label="${esc(U('remove'))}">✕</button>
          </span></div>
        <div class="nums">${num(i,'sets',U('sets'))}${num(i,ex.dose.mode,U({reps:'reps',hold:'holdS',time:'timeS'}[ex.dose.mode]))}${num(i,'rest',U('restS'))}</div>
      </div></li>`;
  }
  function render(){
    root.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=U(el.dataset.i18n));
    document.title=`${nm()} · Stiko`;
    $('nameIn').value=nm();
    $('sportIn').innerHTML=['',...SPORTS].map(v=>`<option value="${v}">${esc(v?tagLabel('sport',v):U('noSport'))}</option>`).join('');
    $('sportIn').value=s.sport||'';
    $('blocks').innerHTML=S.BLOCKS.map(b=>{
      const rows=s.items.map((it,i)=>[it,i]).filter(([it])=>it.block===b);
      return `<section class="block">
        <div class="block-head"><h3>${esc(tagLabel('block',b))}</h3><span class="dose" data-est="${b}"></span></div>
        <p class="guide">${esc(U('guide_'+b))}</p>
        ${b==='main'?'<p class="guide coverage" id="coverage"></p>':''}
        <ul class="items">${rows.map(([it,i])=>itemHTML(it,i)).join('')}</ul>
        <a class="add" href="#/sessions/${encodeURIComponent(s.id)}/add/${b}">+ ${esc(U('addEx'))}</a>
      </section>`;
    }).join('');
    renderTotals();
  }
  function renderTotals(){
    const est=S.estimate(s.items,byId);
    // Main-block balance: which movement-pattern families are covered.
    const fams=new Set(s.items.filter(it=>it.block==='main').map(it=>familyOf(byId.get(it.ex)?.pattern)).filter(Boolean));
    const have=MAIN_FAMILIES.filter(f=>fams.has(f)), miss=MAIN_FAMILIES.filter(f=>!fams.has(f));
    const cov=root.querySelector('#coverage');
    if(cov) cov.innerHTML=(have.length?`${esc(U('covered'))}: <b>${have.map(f=>esc(tagLabel('family',f))).join(', ')}</b>. `:'')+
      (miss.length?`${esc(U('notYet'))}: ${miss.map(f=>esc(tagLabel('family',f))).join(', ')}.`:'');
    $('total').textContent=s.items.length?`${U('exCount')(s.items.length)} · ${U('mins')(S.minutes(est.total))}`:U('emptySession');
    for(const b of S.BLOCKS){ const el=root.querySelector(`[data-est="${b}"]`); if(el) el.textContent=est[b]?U('mins')(S.minutes(est[b])):''; }
    const pb=$('playBtn');
    pb.textContent=`▶ ${U('start')}`;
    if(s.items.length){ pb.href=`#/run/${encodeURIComponent(s.id)}`; pb.removeAttribute('aria-disabled'); }
    else { pb.removeAttribute('href'); pb.setAttribute('aria-disabled','true'); }
  }

  // Typing a name makes it the user's own: it no longer follows the app language.
  $('nameIn').addEventListener('change',e=>{ s.name=e.target.value.trim().slice(0,80)||U('newSession'); delete s.names; e.target.value=s.name; save(); document.title=`${s.name} · Stiko`; });
  $('sportIn').addEventListener('change',e=>{ if(e.target.value) s.sport=e.target.value; else delete s.sport; save(); });
  $('blocks').addEventListener('change',e=>{
    const t=e.target; if(!t.dataset.k) return;
    const i=+t.dataset.i, it=S.cleanItem({...s.items[i],[t.dataset.k]:t.value},byId);
    s.items[i]=it; t.value=it[t.dataset.k]; save();
  });
  $('blocks').addEventListener('click',e=>{
    const b=e.target.closest('button[data-act]'); if(!b) return;
    const i=+b.dataset.i, act=b.dataset.act, dir=act==='up'?-1:1;
    // A move within a block swaps neighbours; across a block edge the item keeps its index.
    const j=s.items[i+dir]?.block===s.items[i].block?i+dir:i;
    if(act==='rm') s.items.splice(i,1); else s.items=S.moveItem(s.items,i,dir);
    save(); render();
    if(act!=='rm') root.querySelector(`button[data-act="${act}"][data-i="${j}"]`)?.focus();
  });
  $('shareBtn').onclick=()=>saveJSON(`stiko-${slug(nm())}.json`,S.exportPayload([s]),true);
  $('dupBtn').onclick=()=>{ const c=S.duplicate(s.id,U('copyName')(nm())); location.hash=`#/sessions/${encodeURIComponent(c.id)}`; };
  $('restoreBtn').onclick=()=>{
    if(!starter||!confirm(U('confirmRestore')(nm()))) return;
    s=S.put(S.restoreStarter(s,starter)); render(); showRestore();
  };
  if(s.id.startsWith('starter-')) fetch('data/starters.json').then(r=>r.text()).then(text=>{
    starter=(S.parseImport(text,byId,getLang()).sessions||[]).find(x=>x.id===s.id)||null; showRestore();
  }).catch(()=>{});
  $('delBtn').onclick=()=>{ if(confirm(U('confirmDelete')(nm()))){ S.remove(s.id); location.hash='#/sessions'; } };

  render();
  return {relang:render, destroy(){}};
}
