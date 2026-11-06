import {POSTURES,ROUTINES,COMBAT_POSES,COMBAT_MOVE_SETS,WORK_POSES} from '../src/routines.mjs';
import {BODY_MOVES} from '../src/starter-combat.mjs';
import {routineFrame} from '../src/routines.mjs';
import {playbackParams} from '../src/growth-playback.mjs';
const sequences=[];
for(const[id,r]of Object.entries(ROUTINES))for(const[f,form]of r.forms.entries())sequences.push([`routine:${id}:${f}`,form.poses]);
for(const[id,poses]of Object.entries(COMBAT_POSES))sequences.push(['defence:'+id,poses]);
for(const[id,variants]of Object.entries(COMBAT_MOVE_SETS))variants.forEach((p,i)=>sequences.push([`combat:${id}:${i}`,p]));
for(const[id,poses]of Object.entries(WORK_POSES))sequences.push(['work:'+id,poses]);
for(const m of BODY_MOVES)sequences.push(['body:'+m.id,m.poses]);
const errors=[];
for(const[id,poses]of sequences){if(/(?:novice|expert|beginner|veteran|day1|day60)/i.test(id))errors.push('熟練分支:'+id);if(!poses.length||poses.some(p=>!POSTURES[p]))errors.push('缺姿勢:'+id);console.log(id+' = '+poses.join(' → '));}
for(const[routine,r]of Object.entries(ROUTINES))for(let f=0;f<r.forms.length;f++){
  const bare={bare:true,skills:{agility:10},practice:{hands:{}}},master={...bare,practice:{hands:{bodyPunch:500,bodyPush:500}}},art={routine};
  const a=routineFrame(art,bare,(f+.5)*playbackParams(bare,art).formSeconds);
  const b=routineFrame(art,master,(f+.5)*playbackParams(master,art).formSeconds);
  if(a.poses!==b.poses||a.poses!==r.forms[f].poses)errors.push('熟練另有pose:'+routine+':'+f);
}
console.log(JSON.stringify({sequences:sequences.length,errors,pass:!errors.length}));if(errors.length)process.exitCode=1;
