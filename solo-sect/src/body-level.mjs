// N38：能力名稱是當前接法機率的純投影，從不回寫level/XP。
import {MONSTERS,NODES} from './data.mjs';
import {BODY_TIMING,BODY_MOVES,FOE_ACTIONS} from './starter-combat.mjs';
import {clashOdds,windOf,chooseCombatMove,assessLoad,composure,CLASH,postureMax,techniqueFacts} from './arts.mjs';
import {bandMembers,BAND_MEMBER} from './threat.mjs';
import {chooseTactic,restoreSurvivor} from './tactics.mjs';
import {TECHNIQUES,matchesTechnique} from './techniques.mjs';
export const BODY_LEVELS=['挨打','嚇得走野狗','會躲','會截','莊稼把式','好手'];
export function rankFromProbabilities(probabilities){let level=0;for(let i=1;i<BODY_LEVELS.length;i++){if(probabilities[i]>.5)level=i;}return {level,name:BODY_LEVELS[level]};}
function freshOpponent(k,index,weapon){const actual=k==='bandit'?bandMembers(BAND_MEMBER.pts*BAND_MEMBER.min)[index%BAND_MEMBER.min]:{hp:MONSTERS[k].hp,max:MONSTERS[k].hp,agi:MONSTERS[k].agi||0};return {...actual,k,uid:`reference-${k}-${weapon||'body'}-${index}`,energy:100,weapon,moves:[],pos:[0,0],practice:{hands:{},eyes:{},origin:{}}};}
function opponent(s,k,index,weapon){
 const survivors=Object.fromEntries(Object.entries(s.survivors||{}).filter(([,a])=>a.k===k&&(!weapon||(a.weapon||['blade','staff','fist'][(a.i||0)%3])===weapon)));
 const old=Object.entries(survivors).sort((a,b)=>a[1].escapedAt-b[1].escapedAt)[0];
 const a=restoreSurvivor({...s,survivors},k,freshOpponent(k,index,weapon));
 if(old)delete s.survivors[old[0]];return {actor:a,source:old?'returned survivor':'generated reference'};
}
function scene(s,d,kind,weapon=null,count=1,range=BODY_MOVES.find(m=>m.id==='bodyGrab').range){
 const q=structuredClone(d);Object.assign(q,{hp:100,posture:postureMax(q),busyUntil:0,downUntil:0,faintUntil:0,balanceOpenUntil:0,raging:false,rageUntil:0,fret:0,visionUntil:0,swing:null,bswing:null,order:null,path:[],tactics:null,intentTarget:null,pos:[...NODES.court]});
 const ref={t:s.t,day:s.day,codex:s.codex,ds:[q],mons:[],band:null,survivors:structuredClone(s.survivors||{})},sources=[];
 for(let i=0;i<count;i++){const {actor:a,source}=opponent(ref,kind,i,weapon);const angle=2*Math.PI*i/count;a.pos=[q.pos[0]+range*Math.cos(angle),q.pos[1]+range*Math.sin(angle)];a.intentTarget=q.id||q.uid;ref.mons.push(a);sources.push({uid:a.uid,source,weapon:a.weapon||null});}
 return {ref,q,sources};
}
function reception(ref,q,foe,move){const row=FOE_ACTIONS[foe.k].moves.find(m=>m.id===move),wind=windOf(foe,move,row.wind+BODY_TIMING.recovery);return {odds:clashOdds(ref,foe,q,{move,wind}),wind};}
export function bodyAssessment(s,d){
 const rows=[];
 {const {ref,q,sources}=scene(s,d,'dog'),a=ref.mons[0],{odds,wind}=reception(ref,q,a,'dogBite');
  const tactic=chooseTactic(ref,a,assessLoad(ref,a),{temper:composure(a),normalTemper:CLASH.fret.normal,enemies:[q],friends:[]});
  const pick=chooseCombatMove(ref,q,a,()=>{throw Error('能力查詢不得抽樣');},{preview:true}),ownWind=pick?windOf(q,pick.move.id,pick.move.cd)+pick.seconds:Infinity;
  const proactive=ownWind<wind?clashOdds(ref,q,a,{move:pick.move.id,wind:ownWind}).hit:0,reactive=odds.read+odds.dodgeCounter;
  rows.push({level:1,probability:tactic.action==='flee'?1:Math.max(reactive,proactive),firstHit:Math.max(reactive,proactive),proactive,reactive,proactiveMove:pick?.move.id||null,proactiveWind:Number.isFinite(ownWind)?ownWind:null,frightened:tactic.action==='flee',wind,sources});}
 {const {ref,q,sources}=scene(s,d,'boar',null,1,(FOE_ACTIONS.boar.moves.find(m=>m.travel).minDistance+FOE_ACTIONS.boar.moves.find(m=>m.travel).range)/2),{odds,wind}=reception(ref,q,ref.mons[0],'boarCharge');rows.push({level:2,probability:odds.dodge,wind,sources});}
 {const {ref,q,sources}=scene(s,d,'bandit','fist'),{odds,wind}=reception(ref,q,ref.mons[0],'looterFist');rows.push({level:3,probability:odds.read+odds.dodgeCounter,actualRead:odds.read,alsoFitsStep:odds.dodgeCounter,wind,sources});}
 {const {ref,q,sources}=scene(s,d,'bandit','blade'),foe=ref.mons[0],{odds,wind}=reception(ref,q,foe,'looterBlade');
  foe.swing={mv:'looterBlade',wind,at:s.t+wind,tgt:q.id||q.uid};
  const disarm=TECHNIQUES.find(t=>t.effects.includes('disarm')),facts=techniqueFacts(ref,q,foe,disarm.id);let disarmProbability=0;
  if(q.glimmer?.known.includes(disarm.id)&&matchesTechnique(disarm,facts)&&facts.force>facts.opponentForce){const ownWind=windOf(q,disarm.id);disarmProbability=clashOdds(ref,q,foe,{move:disarm.id,wind:ownWind}).hit;}
  rows.push({level:4,probability:Math.max(odds.dodge,disarmProbability),dodge:odds.dodge,disarm:disarmProbability,wind,sources});}
 {const {ref,q,sources}=scene(s,d,'bandit','blade',2);for(const a of ref.mons){const row=FOE_ACTIONS.bandit.moves.find(m=>m.id==='looterBlade'),wind=windOf(a,row.id,row.wind+BODY_TIMING.recovery);a.swing={mv:row.id,tgt:q.id||q.uid,wind,at:s.t+wind};}const load=assessLoad(ref,q);rows.push({level:5,probability:Number(load.L<1),L:load.L,parts:load.rows,sources});}
 const probabilities=Object.fromEntries(rows.map(r=>[r.level,r.probability]));return {...rankFromProbabilities(probabilities),rows,conditions:'休息/無占用的標準接法能力；保留真n/f/筋骨/工具，非自然整場勝率'};
}
export function favoriteMove(d){const contexts=d.selection?.contexts||{},counts=Object.entries(d.selection?.habits||{}).map(([move,uses])=>({move,uses,wins:Object.values(contexts).reduce((n,rows)=>n+(rows[move]?.win||0),0)})).sort((a,b)=>b.uses-a.uses||b.wins-a.wins||a.move.localeCompare(b.move));return {move:counts[0]?.move||null,definition:'真交手最常使用；同次數按得手次數，無交手則null',counts};}
