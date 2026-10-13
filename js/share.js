// Sharing links to the app, a session or an exercise, and the screen a shared session link opens.
import {T, U, esc, getLang, tagLabel, doseText} from './i18n.js';
import * as S from './sessions.js';
import {toast} from './ui.js';

export const ICON_SHARE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5V3.5M7.5 8 12 3.5 16.5 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 11H5.5v9.5h13V11H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const base=()=>location.origin+location.pathname;
export const appUrl=()=>base();
export const exerciseUrl=id=>`${base()}#/play/${encodeURIComponent(id)}`;
export const sessionUrl=s=>`${base()}#/shared/${S.shareCode(s)}`;

// The phone's share sheet when there is one; otherwise copy the link.
export async function shareLink(title,text,url){
  if(navigator.share){
    try{ await navigator.share({title,text,url}); return; }
    catch(e){ if(e.name==='AbortError') return; }
  }
  try{ await navigator.clipboard.writeText(url); toast(U('linkCopied')); }
  catch(e){ prompt(U('share'),url); }
}
export const shareApp=()=>shareLink('Stiko',U('shareAppText'),appUrl());
export const shareSession=s=>{ const n=S.nameOf(s,getLang()); return shareLink(n,U('shareSessionText')(n),sessionUrl(s)); };
export const shareExercise=ex=>shareLink(T(ex.name),U('shareExText')(T(ex.name)),exerciseUrl(ex.id));

// #/shared/<code>: preview a shared session, then add it to this device's sessions.
export function mountShared(root,lib,code){
  const r=S.parseShareCode(code,lib.byId,getLang());
  function render(){
    document.title=`${U('sharedTitle')} · Stiko`;
    const back=`<a class="back" href="#/sessions">← <span>${esc(U('sessions'))}</span></a>`;
    if(r.error){ root.innerHTML=`${back}<p class="empty">${esc(U('sharedBad'))}</p>`; return; }
    const s=r.session, est=S.estimate(s.items,lib.byId);
    const blocks=S.BLOCKS.map(b=>{
      const rows=s.items.filter(it=>it.block===b); if(!rows.length) return '';
      return `<h4>${esc(tagLabel('block',b))}</h4><ul>${rows.map(it=>{ const ex=lib.byId.get(it.ex);
        return `<li>${esc(T(ex.name))} <span class="dose">${esc(doseText(S.itemDose(it,ex),ex.laterality))}</span></li>`; }).join('')}</ul>`;
    }).join('');
    root.innerHTML=`${back}<section class="shared">
      <p class="flabel">${esc(U('sharedTitle'))}</p>
      <h2>${esc(S.nameOf(s,getLang()))}</h2>
      <p class="dose">${s.sport?esc(tagLabel('sport',s.sport))+' · ':''}${esc(U('exCount')(s.items.length))} · ${esc(U('mins')(S.minutes(est.total)))}</p>
      ${blocks}
      <div class="row"><button class="btn primary" id="addBtn">${esc(U('sharedAdd'))}</button><a class="btn" href="#/sessions">${esc(U('cancel'))}</a></div>
    </section>`;
    root.querySelector('#addBtn').onclick=()=>{
      const m=S.mergeImport(S.loadAll(),[s]);
      let id;
      if(m.added){ S.saveAll(m.sessions); id=m.sessions.at(-1).id; toast(U('sharedAdded')); }
      else { id=s.id; toast(U('sharedHave')); }
      location.replace(`#/sessions/${encodeURIComponent(id)}`);
    };
  }
  render();
  return {relang:render, destroy(){}};
}
