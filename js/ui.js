// Small shared UI helpers: toast messages and saving JSON files.
let toastTimer=0;
export function toast(msg){
  let el=document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; el.setAttribute('role','status'); document.body.append(el); }
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3200);
}
export function saveJSON(filename,obj){
  const file=new File([JSON.stringify(obj,null,2)],filename,{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=filename;
  document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

// Collapsible filter panel. While closed, the summary shows how many filters are on and which; while open, how
// many items the filters and search let through.
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
