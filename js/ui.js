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
