// UI strings and language state. Every content field is {en, bs}; adding a language means adding a key here.
import * as store from './store.js';

// Bosnian count forms: 1 vježba, 2–4 vježbe, 5+ vježbi (11–14 take the "5+" form).
const bsPlural=(n,one,few,many)=>{const t=n%10,h=n%100; return t===1&&h!==11?one:(t>=2&&t<=4&&(h<12||h>14)?few:many);};

export const UI={
  en:{exercises:'Exercises', back:'All exercises', clear:'Clear filters', empty:'No exercises match these filters.',
      count:n=>`${n} exercise${n===1?'':'s'}`, level:a=>`Level ${a}`, loadError:'Couldn’t load the exercise library.',
      disclaimer:'Stiko is for general fitness, not medical advice or physical therapy. If you have pain, an injury or a health condition, check with a professional first.',
      g_pattern:'Movement', g_region:'Body region', g_type:'Type', g_equipment:'Equipment',
      pattern:{squat:'Squat',hinge:'Hinge',lunge:'Lunge',push:'Push',pull:'Pull','core-stability':'Core stability',rotation:'Rotation',carry:'Carry',balance:'Balance'},
      region:{lower:'Lower body',upper:'Upper body',core:'Core',full:'Full body'},
      type:{strength:'Strength',mobility:'Mobility',stretch:'Stretch',balance:'Balance',cardio:'Cardio'},
      equipment:{none:'No equipment',band:'Band',dumbbell:'Dumbbell',mat:'Mat',chair:'Chair',wall:'Wall'},
      poseCheck:'Pose check',scrub:'Drag to step through one rep',tapPause:'Tap Stiko to pause or resume',
      tapResume:'Tap to resume',setup:'Setup',movement:'Movement',breathing:'Breathing',watch:'Watch out for',easier:'Easier',harder:'Harder',
      note:'Stop if you feel sharp or unusual pain.',debug:'Joint angles in degrees, relative to the parent segment. Red dots mark joints.',
      doseReps:(a,b,c)=>`${a} set${a===1?'':'s'} of ${b} rep${b===1?'':'s'}, ${c} s rest`, doseHold:(a,b,c)=>`${a} hold${a===1?'':'s'} of ${b} s, ${c} s rest`,
      rep:(a,b)=>`Rep ${a} of ${b}`, left:a=>`${a} s left`, rest:a=>`Rest ${a} s`, set:(a,b)=>`Set ${a} of ${b}`,
      sound:'Sound', voice:'Voice', read:'Read aloud', stop:'Stop', step:'Step', ready:'Get ready', startsIn:a=>`Starts in ${a}`,
      setSay:a=>`Set ${a}`, restSay:a=>`Rest, ${a} seconds`, lastOne:'Last one', tenLeft:'10 seconds left', great:'Great work!',
      done:'Done', again:'Tap to go again',
      noSpeech:'Voice isn’t available in this view (for example, inside the Claude app). Open the page in Chrome or Safari to hear it.',
      noVoice:'No Bosnian voice found on this device. Add a Bosnian or Croatian voice in your phone’s text-to-speech settings.',
      paused:'Paused', restLabel:'Rest and breathe', play:'Play', pause:'Pause', speed:'Speed',
      stageLabel:'Stiko demonstrating the exercise. Tap to pause or resume.'},
  bs:{exercises:'Vježbe', back:'Sve vježbe', clear:'Poništi filtere', empty:'Nijedna vježba ne odgovara ovim filterima.',
      count:n=>`${n} ${bsPlural(n,'vježba','vježbe','vježbi')}`, level:a=>`Nivo ${a}`, loadError:'Biblioteku vježbi nije moguće učitati.',
      disclaimer:'Stiko je namijenjen općoj kondiciji, a ne medicinskom savjetu ili fizikalnoj terapiji. Ako imaš bol, povredu ili zdravstveno stanje, prvo se posavjetuj sa stručnjakom.',
      g_pattern:'Pokret', g_region:'Dio tijela', g_type:'Vrsta', g_equipment:'Oprema',
      pattern:{squat:'Čučanj',hinge:'Pregib u kuku',lunge:'Iskorak',push:'Guranje',pull:'Povlačenje','core-stability':'Stabilnost trupa',rotation:'Rotacija',carry:'Nošenje',balance:'Ravnoteža'},
      region:{lower:'Donji dio tijela',upper:'Gornji dio tijela',core:'Trup',full:'Cijelo tijelo'},
      type:{strength:'Snaga',mobility:'Pokretljivost',stretch:'Istezanje',balance:'Ravnoteža',cardio:'Kardio'},
      equipment:{none:'Bez opreme',band:'Elastična traka',dumbbell:'Bučica',mat:'Prostirka',chair:'Stolica',wall:'Zid'},
      poseCheck:'Provjera poze',scrub:'Povuci za pregled jednog ponavljanja',tapPause:'Dodirni Stika za pauzu ili nastavak',
      tapResume:'Dodirni za nastavak',setup:'Priprema',movement:'Pokret',breathing:'Disanje',watch:'Pazi na',easier:'Lakše',harder:'Teže',
      note:'Prekini ako osjetiš oštar ili neuobičajen bol.',debug:'Uglovi zglobova u stepenima, u odnosu na nadređeni segment. Crvene tačke označavaju zglobove.',
      doseReps:(a,b,c)=>`${a} ${bsPlural(a,'serija','serije','serija')} po ${b} ${bsPlural(b,'ponavljanje','ponavljanja','ponavljanja')}, ${c} s odmora`, doseHold:(a,b,c)=>`${a} ${bsPlural(a,'serija','serije','serija')} po ${b} s držanja, ${c} s odmora`,
      rep:(a,b)=>`Ponavljanje ${a} od ${b}`, left:a=>`Još ${a} s`, rest:a=>`Odmor ${a} s`, set:(a,b)=>`Serija ${a} od ${b}`,
      sound:'Zvuk', voice:'Glas', read:'Pročitaj naglas', stop:'Zaustavi', step:'Korak', ready:'Pripremi se', startsIn:a=>`Počinje za ${a}`,
      setSay:a=>`Serija ${a}`, restSay:a=>`Odmor, ${a} sekundi`, lastOne:'Još jedno', tenLeft:'Još 10 sekundi', great:'Odlično!',
      done:'Gotovo', again:'Dodirni za ponovo',
      noSpeech:'Glas nije dostupan u ovom prikazu (npr. unutar Claude aplikacije). Otvori stranicu u Chromeu ili Safariju da ga čuješ.',
      noVoice:'Na ovom uređaju nema bosanskog glasa. Dodaj bosanski ili hrvatski glas u postavkama za pretvaranje teksta u govor.',
      paused:'Pauza', restLabel:'Odmori se i diši', play:'Nastavi', pause:'Pauza', speed:'Brzina',
      stageLabel:'Stiko pokazuje vježbu. Dodirni za pauzu ili nastavak.'}
};
// Sessions, editor and session player.
Object.assign(UI.en,{
  sessions:'Sessions', newSession:'New session', more:'More actions', start:'Start', edit:'Edit', duplicate:'Duplicate', del:'Delete',
  confirmDelete:n=>`Delete “${n}”?`, copyName:n=>`${n} (copy)`,
  noSessions:'No sessions yet. Create one, then add exercises from the library.',
  exCount:n=>`${n} exercise${n===1?'':'s'}`, mins:m=>`~${m} min`,
  b_warmup:'Warm-up', b_main:'Main block', b_cooldown:'Cool-down',
  guide_warmup:'3–5 min · mobility and light cardio', guide_main:'15–30 min · strength across 4–6 movement patterns',
  guide_cooldown:'3–5 min · static stretches, 30–60 s holds',
  addEx:'Add exercise', name:'Name', sets:'Sets', reps:'Reps', holdS:'Hold (s)', restS:'Rest (s)',
  moveUp:'Move up', moveDown:'Move down', remove:'Remove', share:'Share',
  exportAll:'Export backup', importFile:'Import', notFound:'Session not found.', emptySession:'Add exercises to start.',
  storageNote:'Sessions are saved on this device only. Export a backup to keep them safe or move them to another phone. To share a session, open it and tap Share.',
  imported:(n,s,d)=>`Imported ${n} session${n===1?'':'s'}.`+(s?` ${s} already here.`:'')+(d?` ${d} unknown exercise${d===1?'':'s'} left out.`:''),
  importNone:s=>`Nothing new: ${s} already here.`, importFail:'That file isn’t a Stiko sessions file.',
  addingTo:b=>`Adding to ${b}`, added:x=>`${x} added`, addedN:n=>`Added ×${n}`,
  exOf:(a,b)=>`Exercise ${a} of ${b}`, nextUp:x=>`Next: ${x}`, prevEx:'Previous exercise', skipEx:'Skip exercise', allDone:'Session complete',
});
Object.assign(UI.bs,{
  sessions:'Treninzi', newSession:'Novi trening', more:'Više opcija', start:'Počni', edit:'Uredi', duplicate:'Dupliciraj', del:'Obriši',
  confirmDelete:n=>`Obrisati „${n}“?`, copyName:n=>`${n} (kopija)`,
  noSessions:'Još nema treninga. Napravi jedan, pa dodaj vježbe iz biblioteke.',
  exCount:n=>`${n} ${bsPlural(n,'vježba','vježbe','vježbi')}`, mins:m=>`~${m} min`,
  b_warmup:'Zagrijavanje', b_main:'Glavni dio', b_cooldown:'Smirivanje',
  guide_warmup:'3–5 min · pokretljivost i lagani kardio', guide_main:'15–30 min · snaga kroz 4–6 obrazaca pokreta',
  guide_cooldown:'3–5 min · statičko istezanje, držanje 30–60 s',
  addEx:'Dodaj vježbu', name:'Naziv', sets:'Serije', reps:'Ponavljanja', holdS:'Držanje (s)', restS:'Odmor (s)',
  moveUp:'Pomjeri gore', moveDown:'Pomjeri dolje', remove:'Ukloni', share:'Podijeli',
  exportAll:'Izvezi kopiju', importFile:'Uvezi', notFound:'Trening nije pronađen.', emptySession:'Dodaj vježbe za početak.',
  storageNote:'Treninzi se čuvaju samo na ovom uređaju. Izvezi kopiju da ih sačuvaš ili prebaciš na drugi telefon. Da podijeliš trening, otvori ga i dodirni Podijeli.',
  imported:(n,s,d)=>`Uvezeno treninga: ${n}.`+(s?` Već postoji: ${s}.`:'')+(d?` Izostavljeno nepoznatih vježbi: ${d}.`:''),
  importNone:s=>`Ništa novo, već postoji: ${s}.`, importFail:'Ta datoteka nije Stiko datoteka s treninzima.',
  addingTo:b=>`Dodaješ u: ${b}`, added:x=>`Dodano: ${x}`, addedN:n=>`Dodano ×${n}`,
  exOf:(a,b)=>`Vježba ${a} od ${b}`, nextUp:x=>`Sljedeće: ${x}`, prevEx:'Prethodna vježba', skipEx:'Preskoči vježbu', allDone:'Trening završen',
});
export const LANGS=Object.keys(UI);

const nav=typeof navigator!=='undefined'?(navigator.language||''):'';
let lang=store.load('lang',null)||(/^(bs|hr|sr)/i.test(nav)?'bs':'en');
if(!UI[lang]) lang='en';
export const getLang=()=>lang;
export function setLang(l){ lang=UI[l]?l:'en'; store.save('lang',lang); }

export const T=x=>x&&typeof x==='object'&&!Array.isArray(x)?(x[lang]??x.en):x;
export const U=k=>UI[lang][k]??UI.en[k];
export const tagLabel=(group,v)=>U(group)[v]??v;
export const doseText=d=>d.mode==='reps'?U('doseReps')(d.sets,d.reps,d.rest):U('doseHold')(d.sets,d.hold,d.rest);
export const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
