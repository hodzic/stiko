// Rewrites data/library.json in a stable, diff-friendly layout: one field per line, one keyframe per line.
//   node tools/format-library.mjs [file]
import fs from 'node:fs';

const ORDER=['id','name','short','pattern','component','planes','position','laterality','chain','blocks','muscles','joints',
  'dose','equipment','level','easier','harder','howto','anim'];
const HOWTO=['setup','steps','breathe','mistakes','easier','harder'];
const ANIM=['cycle','floorWork','farShift','props','spec','frames','restPose'];
const j=v=>JSON.stringify(v).replace(/":/g,'": ').replace(/,"/g,', "');
const sorted=(o,order)=>[...order.filter(k=>k in o),...Object.keys(o).filter(k=>!order.includes(k))];
const list=(arr,ind)=>`[\n${arr.map(x=>ind+'  '+j(x)).join(',\n')}\n${ind}]`;

function fmtEx(ex){
  const I='      ', out=[];
  for(const k of sorted(ex,ORDER)){
    const v=ex[k];
    if(k==='howto') out.push(`${I}"howto": {\n`+sorted(v,HOWTO).map(h=>`${I}  "${h}": `+(Array.isArray(v[h])?list(v[h],I+'  '):j(v[h]))).join(',\n')+`\n${I}}`);
    else if(k==='anim') out.push(`${I}"anim": {\n`+sorted(v,ANIM).map(a=>`${I}  "${a}": `+(a==='frames'?list(v[a],I+'  '):j(v[a]))).join(',\n')+`\n${I}}`);
    else out.push(`${I}"${k}": ${j(v)}`);
  }
  return `    {\n${out.join(',\n')}\n    }`;
}
export function formatLibrary(lib){
  const head=Object.keys(lib).filter(k=>k!=='exercises').map(k=>`  "${k}": ${j(lib[k])},`).join('\n');
  return `{\n${head}\n  "exercises": [\n${lib.exercises.map(fmtEx).join(',\n')}\n  ]\n}\n`;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const f=process.argv[2]||new URL('../data/library.json',import.meta.url).pathname;
  const lib=JSON.parse(fs.readFileSync(f,'utf8'));
  fs.writeFileSync(f,formatLibrary(lib));
  console.log(`formatted ${lib.exercises.length} exercises → ${f}`);
}
