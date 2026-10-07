// Voice settings in the header: one of the phone's voices for the current language (remembered per language),
// speaking speed, and a test sentence. Applies everywhere Stiko speaks.
import {U, esc} from './i18n.js';
import * as A from './audio.js';

const ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5v5h4l5 4v-13l-5 4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function mountVoiceSettings(root){
  if(!A.hasSpeech()){ root.hidden=true; return {relang(){}}; }
  root.innerHTML=`<summary class="help">${ICON}</summary>
    <div class="vpop">
      <h3 id="vsTitle"></h3>
      <label class="field"><span class="flabel" id="vsVoiceL"></span><select id="voiceSel"></select></label>
      <div class="field"><span class="flabel" id="vsRateL"></span><div class="seg" role="group" id="rateSeg"></div></div>
      <button class="btn" id="testBtn"></button>
    </div>`;
  const $=id=>root.querySelector('#'+id);
  function render(){
    const sum=root.querySelector('summary'); sum.setAttribute('aria-label',U('voiceSettings')); sum.title=U('voiceSettings');
    $('vsTitle').textContent=U('voiceSettings'); $('vsVoiceL').textContent=U('voicePick'); $('vsRateL').textContent=U('speechSpeed');
    $('testBtn').textContent=U('testVoice');
    const vs=A.langVoices(), cur=A.voiceName();
    $('voiceSel').innerHTML=`<option value="">${esc(U('voiceAuto'))}${vs[0]?` (${esc(vs[0].name)})`:''}</option>`+
      vs.map(v=>`<option value="${esc(v.voiceURI)}">${esc(v.name)}${v.lang?` · ${esc(v.lang)}`:''}</option>`).join('');
    $('voiceSel').value=vs.some(v=>v.voiceURI===cur)?cur:'';
    $('rateSeg').setAttribute('aria-label',U('speechSpeed'));
    $('rateSeg').innerHTML=A.RATES.map((r,i)=>`<button data-r="${r}" aria-pressed="${r===A.prefs.rate}">${esc(U(['slower','normal','faster'][i]))}</button>`).join('');
  }
  const test=()=>A.testVoice(U('voiceSample'));
  $('voiceSel').onchange=e=>{ A.setVoiceName(e.target.value); test(); };
  $('rateSeg').onclick=e=>{ const b=e.target.closest('button[data-r]'); if(!b) return; A.setRate(+b.dataset.r); render(); test(); };
  $('testBtn').onclick=test;
  // Close when tapping elsewhere or pressing Escape.
  document.addEventListener('click',e=>{ if(root.open&&!e.composedPath().includes(root)) root.open=false; });
  root.addEventListener('keydown',e=>{ if(e.key==='Escape'&&root.open){ root.open=false; root.querySelector('summary').focus(); } });
  A.onVoicesChanged(render,'header');
  render();
  return {relang:render};
}
