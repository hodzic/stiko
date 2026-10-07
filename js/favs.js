// Favourite exercises and sessions: per-device id lists, kept apart from the sessions themselves so exports and
// shared sessions don't carry them.
import * as store from './store.js';
import {U, esc} from './i18n.js';

const KEY={ex:'favExercises',session:'favSessions'};
export const list=kind=>{ const v=store.load(KEY[kind],[]); return Array.isArray(v)?v:[]; };
export const has=(kind,id)=>list(kind).includes(id);
export function toggle(kind,id){
  const l=list(kind), on=!l.includes(id);
  store.save(KEY[kind],on?[...l,id]:l.filter(x=>x!==id));
  return on;
}
export const drop=(kind,id)=>{ if(has(kind,id)) toggle(kind,id); };

// Star toggle; data-fav carries the id. inline: in a row of buttons rather than in a card's corner.
export const starHTML=(kind,id,inline=false)=>{ const on=has(kind,id);
  return `<button class="fav${inline?' inline':''}" data-fav="${esc(id)}" aria-pressed="${on}" aria-label="${esc(U(on?'removeFav':'addFav'))}" title="${esc(U(on?'removeFav':'addFav'))}">${on?'★':'☆'}</button>`; };
export const chipHTML=on=>`<button class="chip fav-chip" id="favChip" aria-pressed="${on}">★ ${esc(U('favorites'))}</button>`;
