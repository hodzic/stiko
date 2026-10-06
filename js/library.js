// Library screen: exercise cards with a still of Stiko, filtered by the taxonomy in vocab.js.
// In pick mode (opened from the session editor) tapping a card adds the exercise to a session block.
import {stillSVG} from './rig.js';
import {T, U, tagLabel, doseText, esc} from './i18n.js';
import {VOCAB, tagsOf, equipmentOf} from './vocab.js';
import * as S from './sessions.js';
import {toast} from './ui.js';

const MAIN=['family','component','region'];
const MORE=['muscle','position','equipment','plane','laterality','level'];
const GROUPS=[...MAIN,...MORE];
// Filter state survives navigation to the player and back. Values are kept as strings (level is numeric).
const sel=Object.fromEntries(GROUPS.map(g=>[g,new Set()]));
const thumbs=new Map();
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
    <div class="lib-head"><h2 data-i18n="exercises"></h2><span class="sub" id="count"></span></div>
    <div class="filters" id="filters"></div>
    <ul class="cards" id="cards"></ul>
    <p class="note" data-i18n="disclaimer"></p>
  </section>`;
  const $=id=>root.querySelector('#'+id);
  const exs=lib.exercises;

  function groupHTML(g){
    const present=new Set(exs.flatMap(ex=>tagsOf(ex,g)).map(String));
    const vals=VOCAB[g].map(String).filter(v=>present.has(v));
    if(vals.length<2&&!sel[g].size) return '';  // a filter with one option filters nothing
    return `<div class="fgroup" role="group" aria-label="${esc(U('g_'+g))}"><span class="flabel">${esc(U('g_'+g))}</span>`+
      vals.map(v=>`<button class="chip" data-g="${g}" data-v="${esc(v)}" aria-pressed="${sel[g].has(v)}">${esc(tagLabel(g,v))}</button>`).join('')+'</div>';
  }
  function renderFilters(){
    let html='';
    if(pick) html+=`<div class="fgroup"><button class="chip" id="fitBtn" aria-pressed="${fitOnly}">${esc(U('fitsBlock')(tagLabel('block',pick.block)))}</button></div>`;
    html+=MAIN.map(groupHTML).join('');
    const more=MORE.map(groupHTML).join('');
    if(more) html+=`<details class="more" id="more"${moreOpen?' open':''}><summary>${esc(U('moreFilters'))}${MORE.some(g=>sel[g].size)?' •':''}</summary><div class="filters">${more}</div></details>`;
    if(GROUPS.some(g=>sel[g].size)) html+=`<button class="clear" id="clearBtn">${esc(U('clear'))}</button>`;
    $('filters').innerHTML=html;
    $('more')?.addEventListener('toggle',e=>{ moreOpen=e.target.open; });
  }
  function card(ex){
    const tags=[ex.pattern&&tagLabel('pattern',ex.pattern),tagLabel('component',ex.component),...equipmentOf(ex).map(v=>tagLabel('equipment',v))].filter(Boolean);
    const n=addedN.get(ex.id);
    const open=pick?`<div class="card" role="button" tabindex="0" data-add="${esc(ex.id)}">`:`<a class="card" href="#/play/${encodeURIComponent(ex.id)}">`;
    return `<li>${open}
      <svg class="thumb" viewBox="20 70 360 210" aria-hidden="true">${thumbSVG(ex)}</svg>
      <div class="card-body">
        <h3>${esc(T(ex.name))}</h3>
        <p class="dose">${esc(ex.muscles.primary.map(m=>tagLabel('muscle',m)).join(', '))}</p>
        <p class="tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}<span class="lvl">${esc(tagLabel('level',ex.level))}</span></p>
        ${pick?`<span class="addtag">${n?esc(U('addedN')(n)):'+ '+esc(U('addEx'))}</span>`:''}
      </div>${pick?'</div>':'</a>'}</li>`;
  }
  function renderCards(){
    const list=exs.filter(ex=>matches(ex)&&(!fitOnly||ex.blocks.includes(pick.block)));
    $('count').textContent=U('count')(list.length);
    $('cards').innerHTML=list.length?list.map(card).join(''):`<li class="empty">${esc(U('empty'))}</li>`;
  }
  function render(){
    root.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=U(el.dataset.i18n));
    document.title=`${U('exercises')} · Stiko`;
    if(pick) $('pickTxt').textContent=`${U('addingTo')(tagLabel('block',pick.block))} · ${S.get(pick.sessionId)?.name??''}`;
    renderFilters(); renderCards();
  }
  $('filters').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.id==='clearBtn') GROUPS.forEach(g=>sel[g].clear());
    else if(b.id==='fitBtn') fitOnly=!fitOnly;
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
  if(pick){
    $('cards').addEventListener('click',add);
    $('cards').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); add(e); } });
  }
  render();
  return {relang:render, destroy(){}};
}
