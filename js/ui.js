// Small shared UI helpers: toast messages and saving JSON files.
let toastTimer=0;
// onTap: makes the toast a button (e.g. Update available, tap to reload); ms: how long it stays.
export function toast(msg,{onTap=null,ms=3200}={}){
  let el=document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; el.setAttribute('role','status'); document.body.append(el);
    el.addEventListener('click',()=>{ const f=el._onTap; if(f){ el.classList.remove('show'); f(); } }); }
  el.textContent=msg; el._onTap=onTap; el.classList.toggle('tap',!!onTap); el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),ms);
}
export function saveJSON(filename,obj){
  const file=new File([JSON.stringify(obj,null,2)],filename,{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=filename;
  document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

// Collapsible filter panel. The summary shows how many items the filters and search let
// through and, while closed, how many filters are on and which.
// key: store key remembering whether it is open (closed by default).
export function filterBox(el,key,load,save){
  el.innerHTML=`<summary><span class="ftitle"></span><span class="fcount"></span><span class="factive"></span><span class="fresult"></span></summary><div class="filters"></div>`;
  el.open=!!load(key,false);
  el.addEventListener('toggle',()=>save(key,el.open));
  return {
    body:el.querySelector('.filters'),
    summary(title,active){
      el.querySelector('.ftitle').textContent=title;
      el.querySelector('.fcount').textContent=active.length||'';
      el.querySelector('.factive').textContent=active.join(', ');
      el.classList.toggle('on',active.length>0);
    },
    result(text){ el.querySelector('.fresult').textContent=text; },
  };
}
// On/off chips in a filter panel (favourites, suited to a block), each a row of its own since they narrow
// together: [id, on, label] each; falsy entries are skipped.
export function togglesHTML(list){
  return list.filter(Boolean).map(([id,p,t])=>`<div class="fgroup"><button class="chip" id="${id}" aria-pressed="${p}">${t.replace(/[&<>"]/g,ch=>`&#${ch.charCodeAt(0)};`)}</button></div>`).join('');
}
