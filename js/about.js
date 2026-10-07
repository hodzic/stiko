// About page: how to use the app and health advice. Shown once on first launch, then from the ? in the header.
import {U, esc} from './i18n.js';
import * as store from './store.js';

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
      <a class="btn primary go" href="#/sessions" id="goBtn">${esc(U(first?'getStarted':'aboutBack'))}</a>
    </section>`;
    root.querySelector('#goBtn').onclick=()=>store.save('welcomed',true);
  }
  render();
  return {relang:render, destroy(){}};
}
