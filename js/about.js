// About page: how to use the app and health advice. Shown once on first launch, then from the ? in the header.
import {U, esc} from './i18n.js';
import * as store from './store.js';
import {APP_VERSION} from './version.js';
import {checkForUpdate, applyUpdate, updateWaiting, onUpdateState} from './updates.js';

const md=t=>esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');

export function mountAbout(root){
  const first=!store.load('welcomed',false);
  function render(){
    document.title=`${U('aboutTitle')} · Stiko`;
    root.innerHTML=`<section class="about">
      ${first?'':`<a class="back" href="#/sessions">← <span>${esc(U('sessions'))}</span></a>`}
      <h2>${esc(U('aboutTitle'))}</h2>
      <p class="lead">${esc(U('aboutIntro'))}</p>
      <div class="safety">
        <h3>${esc(U('safetyTitle'))}</h3>
        <ul>${U('safety').map(x=>`<li>${md(x)}</li>`).join('')}</ul>
      </div>
      <h3>${esc(U('howTitle'))}</h3>
      <ul class="how">${U('how').map(x=>`<li>${md(x)}</li>`).join('')}</ul>
      <p class="apps"><a href="/">${esc(U('allApps'))}</a></p>
      <a class="btn primary go" href="#/sessions" id="goBtn">${esc(U(first?'getStarted':'aboutBack'))}</a>
      <div class="ver row">Stiko ${esc(U('version').toLowerCase())} ${APP_VERSION}
        <button class="btn" id="updBtn">${esc(U(updateWaiting()?'updateNow':'checkUpdates'))}</button><span id="updS"></span></div>
    </section>`;
    root.querySelector('#goBtn').onclick=()=>store.save('welcomed',true);
    const btn=root.querySelector('#updBtn'), st=root.querySelector('#updS');
    btn.onclick=async()=>{
      if(updateWaiting()) return applyUpdate();
      st.textContent=U('checking');
      const r=await checkForUpdate();
      st.textContent=r==='current'?U('upToDate'):r==='failed'?U('checkFailed'):r==='downloading'?U('checking'):'';
      if(r==='ready') btn.textContent=U('updateNow');
    };
  }
  render();
  const off=onUpdateState(()=>{ const b=root.querySelector('#updBtn'); if(b) b.textContent=U('updateNow'); });
  return {relang:render, destroy(){ off(); }};
}
