// Pose review: renders every keyframe (and rest pose) of library exercises onto a contact sheet.
//   node tools/sheet.mjs [--out dir] [--png] [id-or-prefix ...]
// Writes <out>/sheet.html; with --png also <out>/sheet-N.png (needs Playwright + Chromium).
import fs from 'node:fs';
import path from 'node:path';
import {solve, framesAt, figureSVG} from '../js/rig.js';

const args=process.argv.slice(2);
const flag=k=>{ const i=args.indexOf(k); if(i<0) return null; args.splice(i,1); return true; };
const opt=k=>{ const i=args.indexOf(k); if(i<0) return null; const v=args[i+1]; args.splice(i,2); return v; };
const out=opt('--out')||'pose-sheets', png=flag('--png'), perPage=+(opt('--per-page')||12);
const libPath=opt('--lib')||new URL('../data/library.json',import.meta.url).pathname;
const lib=JSON.parse(fs.readFileSync(libPath,'utf8'));
const css=fs.readFileSync(new URL('../css/app.css',import.meta.url),'utf8');
const exs=lib.exercises.filter(e=>!args.length||args.some(a=>e.id.startsWith(a)));

const cell=(svg,label)=>`<figure><svg viewBox="0 0 400 300">${svg}</svg><figcaption>${label}</figcaption></figure>`;
function row(ex){
  const a=ex.anim, opts={floorWork:a.floorWork,farShift:a.farShift,props:a.props,joints:true};
  const cells=a.frames.map((f,i)=>{
    const fr=framesAt(a.frames,f.t+1e-6,a.loopAdd);
    return cell(figureSVG(solve(a.spec,fr.pose),f.face,opts),`${i+1}. ${f.label.en} <small>t=${f.t}</small>`);
  });
  // Midway between keyframes catches bad interpolation.
  if(a.frames.length>1) for(let i=0;i<a.frames.length;i++){
    const t0=a.frames[i].t, t1=a.frames[i+1]?.t??1, fr=framesAt(a.frames,(t0+t1)/2,a.loopAdd);
    cells.push(cell(figureSVG(solve(a.spec,fr.pose),fr.face,opts),`mid ${i+1}→${(i+1)%a.frames.length+1}`));
  }
  if(a.restPose) cells.push(cell(figureSVG(solve(a.restPose.spec,a.restPose.pose),'smile',opts),'rest'));
  const meta=[ex.pattern||'—',ex.component,ex.laterality,ex.dose.mode,`L${ex.level}`].join(' · ');
  return `<section><h2>${ex.id} <small>${meta}</small></h2><div class="row">${cells.join('')}</div></section>`;
}
const page=rows=>`<!doctype html><meta charset="utf-8"><style>${css}
body{background:#fff;padding:12px;font:13px system-ui} section{margin:0 0 10px} h2{font:600 15px system-ui;margin:0 0 4px} h2 small{font-weight:400;color:#667}
.row{display:flex;flex-wrap:wrap;gap:6px} figure{margin:0;width:230px;border:1px solid #dde;border-radius:8px;background:#F6FAFE}
figure svg{width:100%;display:block} figcaption{padding:2px 6px 4px;font-size:11px;color:#334} small{color:#889}</style>${rows.join('')}`;

fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'sheet.html'),page(exs.map(row)));
console.log(`${exs.length} exercises → ${path.join(out,'sheet.html')}`);
if(png){
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
  const b=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
  const p=await b.newPage({viewport:{width:1240,height:800}});
  for(let i=0;i*perPage<exs.length;i++){
    await p.setContent(page(exs.slice(i*perPage,(i+1)*perPage).map(row)));
    const f=path.join(out,`sheet-${i+1}.png`); await p.screenshot({path:f,fullPage:true}); console.log(f);
  }
  await b.close();
}
