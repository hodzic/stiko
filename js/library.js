// Library screen: exercise cards with a still of Stiko, filtered by tags.
import {stillSVG} from './rig.js';
import {T, U, tagLabel, doseText, esc} from './i18n.js';
import {VOCAB, equipmentOf} from './vocab.js';

const GROUPS=['pattern','region','type','equipment'];
const tagsOf=(ex,g)=>g==='equipment'?equipmentOf(ex):[ex[g]];
// Filter state survives navigation to the player and back.
const sel=Object.fromEntries(GROUPS.map(g=>[g,new Set()]));
const thumbs=new Map();

// Within a group selected values are OR'ed; groups are AND'ed.
const matches=ex=>GROUPS.every(g=>!sel[g].size||tagsOf(ex,g).some(v=>sel[g].has(v)));

export function mountLibrary(root,lib){
  root.innerHTML=`<section class="lib">
    <div class="lib-head"><h2 data-i18n="exercises"></h2><span class="sub" id="count"></span></div>
    <div class="filters" id="filters"></div>
    <ul class="cards" id="cards"></ul>
    <p class="note" data-i18n="disclaimer"></p>
  </section>`;
  const $=id=>root.querySelector('#'+id);
  const exs=lib.exercises;

  function renderFilters(){
    let html='';
    for(const g of GROUPS){
      const present=new Set(exs.flatMap(ex=>tagsOf(ex,g)));
      const vals=VOCAB[g].filter(v=>present.has(v));
      if(vals.length<2&&!sel[g].size) continue;  // a filter with one option filters nothing
      html+=`<div class="fgroup" role="group" aria-label="${esc(U('g_'+g))}"><span class="flabel">${esc(U('g_'+g))}</span>`;
      for(const v of vals) html+=`<button class="chip" data-g="${g}" data-v="${v}" aria-pressed="${sel[g].has(v)}">${esc(tagLabel(g,v))}</button>`;
      html+='</div>';
    }
    if(GROUPS.some(g=>sel[g].size)) html+=`<button class="clear" id="clearBtn">${esc(U('clear'))}</button>`;
    $('filters').innerHTML=html;
  }
  function card(ex){
    if(!thumbs.has(ex.id)) thumbs.set(ex.id,stillSVG(ex,1));
    const tags=[tagLabel('pattern',ex.pattern),...equipmentOf(ex).map(v=>tagLabel('equipment',v))];
    return `<li><a class="card" href="#/play/${encodeURIComponent(ex.id)}">
      <svg class="thumb" viewBox="20 70 360 210" aria-hidden="true">${thumbs.get(ex.id)}</svg>
      <div class="card-body">
        <h3>${esc(T(ex.name))}</h3>
        <p class="dose">${esc(doseText(ex.dose))}</p>
        <p class="tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}<span class="lvl">${esc(U('level')(ex.level))}</span></p>
      </div></a></li>`;
  }
  function renderCards(){
    const list=exs.filter(matches);
    $('count').textContent=U('count')(list.length);
    $('cards').innerHTML=list.length?list.map(card).join(''):`<li class="empty">${esc(U('empty'))}</li>`;
  }
  function render(){
    root.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=U(el.dataset.i18n));
    document.title='Stiko';
    renderFilters(); renderCards();
  }
  $('filters').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.id==='clearBtn') GROUPS.forEach(g=>sel[g].clear());
    else { const s=sel[b.dataset.g]; s.has(b.dataset.v)?s.delete(b.dataset.v):s.add(b.dataset.v); }
    renderFilters(); renderCards();
  });
  render();
  return {relang:render, destroy(){}};
}
