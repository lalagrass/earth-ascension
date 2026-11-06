// N34 RPD + contextual Thompson sampling. 無角色/招名專屬分支。
import {TRAITS} from './data.mjs';
import {BODY_TIMING,BODY_MOVES} from './starter-combat.mjs';
import {emitPractice,ensurePractice,eyeKey,learningWeight} from './practice.mjs';
export const DECISION={informationSecond:BODY_TIMING.simple,credibleZ:2,watchFraction:.5,touch:BODY_MOVES.find(m=>m.id==='bodyPunch').range,reach:BODY_MOVES.find(m=>m.id==='toolStaff').range,postureReference:100};
export const DECISION_STYLE={steady:{feature:'speed',name:'先接得上'},hot:{feature:'force',name:'先壓得住'},normal:{feature:'reach',name:'先夠得到'}};
export const TRAINING_CAUSES={timing:{acts:['spar','train'],name:'來不及辨認來招'},power:{acts:['quarry','water','chop'],name:'打中但勁不過霸體'},crowd:{acts:['spar'],name:'同時被多人圍住'},grip:{acts:['train','quarry'],name:'失衡或握不住兵器'}};
export const decisionTemper=d=>(d.personality||[]).map(k=>TRAITS[k]?.composure).find(Boolean)||'normal';
export function contextKey(d,t,now=0,distance=Math.hypot((d.pos?.[0]||0)-(t.pos?.[0]||0),(d.pos?.[1]||0)-(t.pos?.[1]||0)),capacity=DECISION.postureReference) {
  const range=distance<=DECISION.touch?'touch':distance<=DECISION.reach?'reach':'far';
  return `${t.k||t.arch||'human'}:${range}:${t.swing||t.bswing?'wind':(t.busyUntil||0)>now?'recover':'ready'}:${(d.posture??capacity)<=0?'open':(d.posture??capacity)<capacity/2?'offset':'set'}`;
}
export function ensureSelection(d){return d.selection??={contexts:{},habits:{},failures:{}};}
const stats=(r={})=>{const a=(r.win||0)+1,b=(r.loss||0)+1,mean=a/(a+b),sd=Math.sqrt(a*b/((a+b)**2*(a+b+1)));return {a,b,mean,sd};};
// Marsaglia–Tsang gamma (shape>=1). 1-rnd讓既有PRNG的零合法，不夾機率。
function gamma(shape,rnd){const d=shape-1/3,c=1/Math.sqrt(9*d);for(;;){const x=Math.sqrt(-2*Math.log(1-rnd()))*Math.cos(2*Math.PI*rnd()),v=(1+c*x)**3;if(v<=0)continue;const u=1-rnd();if(Math.log(u)<x*x/2+d*(1-v+Math.log(v)))return d*v;}}
export function betaSample(a,b,rnd){const x=gamma(a,rnd),y=gamma(b,rnd);return x/(x+y);}
function utility(d,m,distance,armor){const f=DECISION_STYLE[decisionTemper(d)].feature;return f==='speed'?1/(m.actualWind||m.wind||m.cd):f==='force'?Math.max(0,(m.force||m.dmg||1)-armor):(m.range||1)/((m.range||1)+distance);}
export function completeDecision(s,d,plan){
 if(plan.mode!=='defend'||plan.available==null)return;
 const S=ensureSelection(d),key=plan.context,prior=S.defenses?.[key];
 (S.defenses??={})[key]={target:plan.target,comparison:plan.comparison,available:prior?.target===plan.target&&prior?.comparison===plan.comparison?Math.max(prior.available,plan.available):plan.available,seconds:plan.seconds,startedAt:plan.startedAt,completedAt:s.t};
 emitPractice(s,{type:'decisionCompleted',who:d.uid||d.id||d.k,mode:'defend',context:plan.context,seconds:plan.seconds,startedAt:plan.startedAt,readyAt:plan.readyAt});
}
export function selectAction(s,d,target,moves,rnd,{distance,composure=Infinity,preview=false,armor=0,postureCapacity=DECISION.postureReference,available=Infinity,observation=''}={}){
  if(!moves.length)return null;
  distance??=Math.hypot((d.pos?.[0]||0)-(target.pos?.[0]||0),(d.pos?.[1]||0)-(target.pos?.[1]||0));
  const key=contextKey(d,target,s?.t||0,distance,postureCapacity), state=d.selection||{contexts:{},habits:{}}, rows=state.contexts[key]||{};
  const ranked=moves.map(move=>{const r=stats(rows[move.id]),value=utility(d,move,distance,armor);return {move,...r,value,lo:(r.mean-DECISION.credibleZ*r.sd)*value,hi:(r.mean+DECISION.credibleZ*r.sd)*value};});
  ranked.sort((a,b)=>b.mean*b.value-a.mean*a.value||a.move.id.localeCompare(b.move.id));
  const stable=ranked.length===1||ranked[0].lo>Math.max(...ranked.slice(1).map(r=>r.hi));
  const habit=d.raging||(d.fret||0)>=composure;
  const seconds=stable||habit?0:DECISION.informationSecond*Math.log2(moves.length);
  const comparison=JSON.stringify([observation,seconds,moves.map(m=>[m.id,m.actualWind??m.wind??m.cd]).sort((a,b)=>a[0].localeCompare(b[0]))]);
  const remembered=state.defenses?.[key];
  const reused=!habit&&Number.isFinite(available)&&remembered?.target===(target.uid||target.id||target.k)&&remembered?.comparison===comparison&&available<=remembered.available;
  let best=ranked[0];
  if(reused)best=null;
  else if(habit)best=[...ranked].sort((a,b)=>(state.habits[b.move.id]||0)-(state.habits[a.move.id]||0)||a.move.id.localeCompare(b.move.id))[0];
  else if(!stable&&!preview){for(const r of ranked)r.sample=betaSample(r.a,r.b,rnd)*r.value;best=[...ranked].sort((a,b)=>b.sample-a.sample)[0];}
  const feasible=ranked.filter(r=>(r.move.actualWind??r.move.wind??r.move.cd)+seconds<=available);
  if(!reused&&!habit&&available<Infinity){if(!feasible.length)best=null;else if(!feasible.some(r=>r.move.id===best.move.id))best=[...feasible].sort((a,b)=>(b.sample??b.mean*b.value)-(a.sample??a.mean*a.value))[0];}
  const result={move:best?.move||null,mode:best?'attack':'defend',context:key,seconds:reused?0:seconds,stable,habit,comparison,available:Number.isFinite(available)?available:null,target:target.uid||target.id||target.k,at:s?.t||0,...(reused?{reused:true,paidAt:remembered.completedAt,paidSeconds:remembered.seconds}:{})};
  if(!preview){const store=ensureSelection(d);store.last={...result,move:best?.move?.id||null};emitPractice(s,{type:'choice',who:d.id||d.uid||d.k,move:best?.move?.id||null,context:key,seconds:result.seconds,stable,habit,mode:result.mode,reused:!!reused,...(reused?{paidAt:remembered.completedAt,paidSeconds:remembered.seconds}:{})});}
  return result;
}
export function recordChoice(s,d,target,move,success,{expected=false}={}){
  const S=ensureSelection(d),key=S.last?.move===move?S.last.context:contextKey(d,target,s?.t||0),rows=S.contexts[key]??={};
  const row=rows[move]??={win:0,loss:0};row.win+=Number(success);row.loss+=1-Number(success);S.habits[move]=(S.habits[move]||0)+1;
  emitPractice(s,{type:'choiceResult',who:d.id||d.uid||d.k,move,context:key,success,expected});
}
export function desireTraining(s,d,cause,evidence){if(!d?.id||!TRAINING_CAUSES[cause])return;const S=ensureSelection(d);S.failures[cause]=(S.failures[cause]||0)+1;(S.evidence??={})[cause]=evidence;const kind=Object.keys(S.failures).sort((a,b)=>S.failures[b]-S.failures[a])[0];d.trainingWish={kind,...TRAINING_CAUSES[kind],evidence:S.evidence[kind],at:s?.t||0};}
export function finishTrainingWish(d,act){const wish=d.trainingWish;if(!wish?.acts.includes(act))return;const S=ensureSelection(d);S.failures[wish.kind]=Math.max(0,(S.failures[wish.kind]||0)-1);if(!S.failures[wish.kind])d.trainingWish=null;}
export function witnessExchange(s,attacker,defender,move,p){for(const d of s?.ds||[]){if(d===attacker||d===defender||d.away||d.swing||d.bswing||!d.pos||!attacker.pos||(d.busyUntil||0)>(s.t||0))continue;
  if(Math.hypot(d.pos[0]-attacker.pos[0],d.pos[1]-attacker.pos[1])>DECISION.reach)continue;
  const P=ensurePractice(d,s.codex),key=eyeKey(attacker,move),gain=learningWeight(p)*DECISION.watchFraction;P.eyes[key]=(P.eyes[key]??P.origin[attacker.k]??0)+gain;emitPractice(s,{type:'observe',who:d.id,move,key,gain,f:P.eyes[key]});
}}
