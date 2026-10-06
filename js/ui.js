// Small shared UI helpers: toast messages and saving JSON files.
let toastTimer=0;
export function toast(msg){
  let el=document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; el.setAttribute('role','status'); document.body.append(el); }
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3200);
}
// share=true uses the phone's share sheet when it can take files; otherwise the file is downloaded.
export async function saveJSON(filename,obj,share=false){
  const file=new File([JSON.stringify(obj,null,2)],filename,{type:'application/json'});
  if(share&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file],title:filename}); return; }
    catch(e){ if(e.name==='AbortError') return; }
  }
  const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=filename;
  document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
export const slug=s=>s.normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'session';
