// Library screen: exercise cards with a still of Stiko, filtered by the taxonomy in vocab.js.
// In pick mode (opened from the session editor) tapping a card adds the exercise to a session block.
import {stillSVG, stillBounds} from './rig.js';
import {T, U, tagLabel, doseText, esc, getLang} from './i18n.js';
import {VOCAB, tagsOf, equipmentOf} from './vocab.js';
import * as S from './sessions.js';
import {toast, filterBox} from './ui.js';
import * as F from './favs.js';
import * as store from './store.js';
import {search, exerciseFields} from './search.js';

const MAIN=['discipline','family','component','region'];
const MORE=['muscle','position','equipment','plane','laterality','level'];
const GROUPS=[...MAIN,...MORE];
// Filter state survives navigation to the player and back. Values are kept as strings (level is numeric).
const sel=Object.fromEntries(GROUPS.map(g=>[g,new Set()]));
let favOnly=false, query='';  // query: search text, kept like the filters
const thumbs=new Map();
// Thumbnails crop to the figure with the floor at the bottom, in one of three zooms of the same shape: the
// smallest box the still fits (floor work, standing, then raised on a step, arms overhead or hanging).
const H=[210,240,280], BOTTOM=280, CX=200, ASPECT=360/210, PAD=3;
const boxes=new Map();
export function thumbBox(ex){
  if(!boxes.has(ex.id)){
    const [x0,y0,x1]=stillBounds(ex,1);
    const need=Math.max(BOTTOM-(y0-PAD), 2*Math.max(CX-(x0-PAD),(x1+PAD)-CX)/ASPECT);
    const h=H.find(v=>v>=need)??H.at(-1), w=h*ASPECT;
    boxes.set(ex.id,[CX-w/2,BOTTOM-h,w,h].map(v=>+v.toFixed(1)).join(' '));
  }
  return boxes.get(ex.id);
}
export function thumbSVG(ex){ if(!thumbs.has(ex.id)) thumbs.set(ex.id,stillSVG(ex,1)); return thumbs.get(ex.id); }

// Within a group selected values are OR'ed; groups are AND'ed.
const matches=ex=>GROUPS.every(g=>!sel[g].size||tagsOf(ex,g).some(v=>sel[g].has(String(v))));

export function mountLibrary(root,lib,pick=null){
  // pick = {sessionId, block}
  if(pick&&(!S.get(pick.sessionId)||!S.BLOCKS.includes(pick.block))){ location.replace('#/sessions'); return {relang(){}, destroy(){}}; }
  const editHref=pick&&`#/sessions/${encodeURIComponent(pick.sessionId)}`;
  const addedN=new Map();
  let fitOnly=!!pick;  // pick mode starts with exercises suited to the block
  let moreOpen=MORE.some(g=>sel[g].size);
  root.innerHTML=`<section class="lib">
    ${pick?`<div class="pickbar"><span id="pickTxt"></span><a class="btn primary" href="${editHref}" data-i18n="done"></a></div>`:''}
    <div class="lib-head"><h2 data-i18n="exercises"></h2></div>
    <div class="search"><input type="search" id="q" autocomplete="off" enterkeyhint="search">
      <label class="toggle"><input type="checkbox" id="qHow"> <span data-i18n="searchHow"></span></label>
      <label class="toggle" id="favWrap"><input type="checkbox" id="favOnly"> ★ <span data-i18n="favOnly"></span></label>
      ${pick?'<label class="toggle"><input type="checkbox" id="fitOnly"> <span id="fitTxt"></span></label>':''}</div>
    <details class="filterbox" id="fbox"></details>
    <ul class="cards" id="cards"></ul>
    <p class="note" data-i18n="disclaimer"></p>
  </section>`;
  const $=id=>root.querySelector('#'+id);
  const exs=lib.exercises;
  const box=filterBox($('fbox'),'exFiltersOpen',store.load,store.save);

  function groupHTML(g){
    const present=new Set(exs.flatMap(ex=>tagsOf(ex,g)).map(String));
    const vals=VOCAB[g].map(String).filter(v=>present.has(v));
    // A single option filters nothing when every exercise has it (it still narrows an optional field like discipline).
    if(!vals.length||(vals.length<2&&!sel[g].size&&exs.every(ex=>tagsOf(ex,g).length))) return '';
    return `<div class="fgroup" role="group" aria-label="${esc(U('g_'+g))}"><span class="flabel">${esc(U('g_'+g))}</span>`+
      vals.map(v=>`<button class="chip" data-g="${g}" data-v="${esc(v)}" aria-pressed="${sel[g].has(v)}">${esc(tagLabel(g,v))}</button>`).join('')+'</div>';
  }
  function renderFilters(){
    // Favourites and "suited to the block" are switches beside the search, apart from the tag groups: they always narrow.
    $('favWrap').hidden=!favOnly&&!F.list('ex').length; $('favOnly').checked=favOnly;
    if(pick){ $('fitOnly').checked=fitOnly; $('fitTxt').textContent=U('fitsBlock')(tagLabel('block',pick.block)); }
    let html=`<p class="fhint">${esc(U('filterHint'))}</p>`+MAIN.map(groupHTML).join('');
    const more=MORE.map(groupHTML).join('');
    if(more) html+=`<details class="more" id="more"${moreOpen?' open':''}><summary>${esc(U('moreFilters'))}${MORE.some(g=>sel[g].size)?' •':''}</summary><div class="filters">${more}</div></details>`;
    if(GROUPS.some(g=>sel[g].size)) html+=`<button class="clear" id="clearBtn">${esc(U('clear'))}</button>`;
    box.body.innerHTML=html;
    $('more')?.addEventListener('toggle',e=>{ moreOpen=e.target.open; });
    box.summary(U('filters'),[
      ...GROUPS.flatMap(g=>VOCAB[g].map(String).filter(v=>sel[g].has(v)).map(v=>tagLabel(g,v)))]);
  }
  function card(ex){
    const tags=[ex.pattern&&tagLabel('pattern',ex.pattern),tagLabel('component',ex.component),...equipmentOf(ex).map(v=>tagLabel('equipment',v))].filter(Boolean);
    const n=addedN.get(ex.id);
    const open=pick?`<div class="card" role="button" tabindex="0" data-add="${esc(ex.id)}">`:`<a class="card" href="#/play/${encodeURIComponent(ex.id)}">`;
    return `<li class="has-fav">${open}
      <svg class="thumb" viewBox="${thumbBox(ex)}" aria-hidden="true">${thumbSVG(ex)}</svg>
      <div class="card-body">
        <h3>${esc(T(ex.name))}</h3>
        <p class="dose">${esc(ex.muscles.primary.map(m=>tagLabel('muscle',m)).join(', '))}</p>
        <p class="tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}<span class="lvl">${esc(tagLabel('level',ex.level))}</span></p>
        ${pick?`<span class="addtag">${n?esc(U('addedN')(n)):'+ '+esc(U('addEx'))}</span>`:''}
      </div>${pick?'</div>':'</a>'}${F.starHTML('ex',ex.id)}</li>`;
  }
  function renderCards(){
    const fav=new Set(F.list('ex'));
    const how=store.load('searchHow',false);
    const list=search(exs.filter(ex=>matches(ex)&&(!fitOnly||ex.blocks.includes(pick.block))&&(!favOnly||fav.has(ex.id))),ex=>exerciseFields(ex,how),query);
    box.result(U('count')(list.length));
    $('cards').innerHTML=list.length?list.map(card).join(''):`<li class="empty">${esc(U('empty'))}</li>`;
  }
  function render(){
    root.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=U(el.dataset.i18n));
    document.title=`${U('exercises')} · Stiko`;
    $('q').placeholder=U('searchEx'); $('q').setAttribute('aria-label',U('searchEx'));
    if(pick) $('pickTxt').textContent=`${U('addingTo')(tagLabel('block',pick.block))} · ${S.get(pick.sessionId)?S.nameOf(S.get(pick.sessionId),getLang()):''}`;
    renderFilters(); renderCards();
  }
  box.body.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.id==='clearBtn') GROUPS.forEach(g=>sel[g].clear());
    else { const s=sel[b.dataset.g]; s.has(b.dataset.v)?s.delete(b.dataset.v):s.add(b.dataset.v); }
    renderFilters(); renderCards();
  });
  const add=e=>{
    const b=e.target.closest('[data-add]'); if(!b) return;
    const ex=lib.byId.get(b.dataset.add), cur=S.get(pick.sessionId); if(!ex||!cur) return;
    cur.items.push(S.defaultItem(ex,pick.block)); S.put(cur);
    addedN.set(ex.id,(addedN.get(ex.id)||0)+1);
    toast(U('added')(T(ex.short))); renderCards();
    root.querySelector(`[data-add="${CSS.escape(ex.id)}"]`)?.focus();
  };
  $('cards').addEventListener('click',e=>{
    const b=e.target.closest('button[data-fav]');
    if(!b) return pick&&add(e);
    const id=b.dataset.fav; F.toggle('ex',id);
    renderFilters();  // the Favourites switch appears with the first one
    renderCards(); root.querySelector(`button[data-fav="${CSS.escape(id)}"]`)?.focus();
  });
  if(pick) $('cards').addEventListener('keydown',e=>{ if(!e.target.closest('.fav')&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); add(e); } });
  $('q').value=query; $('qHow').checked=store.load('searchHow',false);
  $('q').addEventListener('input',e=>{ query=e.target.value; renderCards(); });
  $('qHow').addEventListener('change',e=>{ store.save('searchHow',e.target.checked); renderCards(); });
  $('favOnly').addEventListener('change',e=>{ favOnly=e.target.checked; renderFilters(); renderCards(); });
  if(pick) $('fitOnly').addEventListener('change',e=>{ fitOnly=e.target.checked; renderCards(); });
  render();
  return {relang:render, destroy(){}};
}
