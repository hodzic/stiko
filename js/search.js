// Text search over exercises and sessions. Matching ignores case and accents, and every word typed must be the
// start of some word in the searched text ("sh pr" finds "Shoulder press"). Names count most, then labels
// (pattern, muscles, equipment, style...), then instruction text. Pure apart from i18n lookups, so it is unit-tested.
import {UI, getLang} from './i18n.js';
import {tagsOf} from './vocab.js';
import {nameOf} from './sessions.js';

// Lower case, no accents (đ and ß don't decompose, so they are mapped by hand), words split on anything else.
export const norm=s=>String(s??'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/đ/g,'d').replace(/ß/g,'ss').replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ø/g,'o').replace(/ł/g,'l');
const words=s=>norm(s).split(/[^a-z0-9]+/).filter(Boolean);
export const tokens=q=>words(q);

// Field weights.
const NAME=4, LABEL=2, TEXT=1;
const GROUPS=['discipline','family','pattern','component','region','muscle','position','equipment','plane','laterality'];

// The current language and English, so a search in English still works with the app in another language.
const langs=()=>[...new Set([getLang(),'en'])];
const tr=v=>v&&typeof v==='object'&&!Array.isArray(v)?langs().map(l=>v[l]).filter(Boolean):[v];
const label=(g,v)=>langs().map(l=>UI[l]?.[g]?.[v]).filter(Boolean);

const howText=ex=>{ const h=ex.howto; return [h.setup,...h.steps,h.breathe,...h.mistakes,h.easier,h.harder].flatMap(tr); };

export function exerciseFields(ex,withHow=false){
  const f=[[NAME,[...tr(ex.name),...tr(ex.short)]]];
  f.push([LABEL,GROUPS.flatMap(g=>tagsOf(ex,g).flatMap(v=>label(g,v)))]);
  if(withHow) f.push([TEXT,howText(ex)]);
  return f;
}
export function sessionFields(s,byId,withHow=false){
  const exs=s.items.map(it=>byId.get(it.ex)).filter(Boolean);
  const f=[[NAME,[nameOf(s,getLang()),s.names?.en,s.name].filter(Boolean)],
    [LABEL,[...(s.sport?label('sport',s.sport):[]),...exs.flatMap(ex=>[...tr(ex.name),...tr(ex.short)])]]];
  if(withHow) f.push([TEXT,exs.flatMap(howText)]);
  return f;
}

// 0 when some typed word matches nothing; otherwise the summed weight of the best field for each word.
export function score(fields,toks){
  if(!toks.length) return 1;
  const ws=fields.map(([w,texts])=>[w,texts.flatMap(words)]);
  let total=0;
  for(const t of toks){
    let best=0;
    for(const [w,list] of ws) if(w>best&&list.some(x=>x.startsWith(t))) best=w;
    if(!best) return 0;
    total+=best;
  }
  return total;
}

// Items that match, best first; ties keep their original order. keep=true keeps the original order throughout.
export function search(items,fieldsOf,q,keep=false){
  const toks=tokens(q);
  if(!toks.length) return items;
  const hits=items.map((it,i)=>[it,score(fieldsOf(it),toks),i]).filter(h=>h[1]>0);
  if(!keep) hits.sort((a,b)=>b[1]-a[1]||a[2]-b[2]);
  return hits.map(h=>h[0]);
}
