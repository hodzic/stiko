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
      doseReps:(a,b,c)=>`${a} sets of ${b} reps, ${c} s rest`, doseHold:(a,b,c)=>`${a} holds of ${b} s, ${c} s rest`,
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
      doseReps:(a,b,c)=>`${a} serije po ${b} ponavljanja, ${c} s odmora`, doseHold:(a,b,c)=>`${a} serije po ${b} s držanja, ${c} s odmora`,
      rep:(a,b)=>`Ponavljanje ${a} od ${b}`, left:a=>`Još ${a} s`, rest:a=>`Odmor ${a} s`, set:(a,b)=>`Serija ${a} od ${b}`,
      sound:'Zvuk', voice:'Glas', read:'Pročitaj naglas', stop:'Zaustavi', step:'Korak', ready:'Pripremi se', startsIn:a=>`Počinje za ${a}`,
      setSay:a=>`Serija ${a}`, restSay:a=>`Odmor, ${a} sekundi`, lastOne:'Još jedno', tenLeft:'Još 10 sekundi', great:'Odlično!',
      done:'Gotovo', again:'Dodirni za ponovo',
      noSpeech:'Glas nije dostupan u ovom prikazu (npr. unutar Claude aplikacije). Otvori stranicu u Chromeu ili Safariju da ga čuješ.',
      noVoice:'Na ovom uređaju nema bosanskog glasa. Dodaj bosanski ili hrvatski glas u postavkama za pretvaranje teksta u govor.',
      paused:'Pauza', restLabel:'Odmori se i diši', play:'Nastavi', pause:'Pauza', speed:'Brzina',
      stageLabel:'Stiko pokazuje vježbu. Dodirni za pauzu ili nastavak.'}
};
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
