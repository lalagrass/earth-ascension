import {HOME} from './homestead-life-data.mjs';
import {RECIPES,preparedCount} from './homestead-content.mjs';
import {MOVES,moveKnown,strike} from './homestead-martial.mjs';
import {feel} from './homestead-living.mjs';
import {recordTaste} from './homestead-autonomy-meals.mjs';
import {recordMealUse} from './homestead-autonomy-learning.mjs';
export const SOURCE=[855,90],SOURCE_USE=[855,130],ALLY_USE=[825,130];
export const EXPEDITION_ACTIONS={depart:{name:'備路糧出發（本圖獸徑）',place:'home',duration:3,frontierOnly:true},journey:{name:'走到近山獸徑',place:'source',duration:1,frontierOnly:true},trailFight:{name:'在獸徑近身應對',place:'source',duration:2,frontierOnly:true},trailEat:{name:'吃包內一份路糧',place:'source',duration:2,frontierOnly:true},returnTrip:{name:'沿原路回家',place:'home',duration:1,frontierOnly:true}};
export const freshSource=()=>({hp:24,cleared:false,clearAt:null,lastStrike:0});
export const freshTrip=()=>({phase:'home',ration:null,joinRequested:false,joined:false,deferred:false,journeys:0,returns:0,packed:0,eaten:0,returned:0,energySpent:0,lastAid:0,aidHits:0});
const near=(a,b,r=1)=>Math.hypot(a[0]-b[0],a[1]-b[1])<=r;
const clamp=n=>Math.max(0,Math.min(100,n));
const log=(s,msg)=>{s.log.unshift({day:s.day,msg});s.log.length=Math.min(80,s.log.length);};
export function companionReady(s){const c=s.frontier.companion;return c.allowed&&c.present&&!c.leaving&&!c.carry&&!c.helpPending&&near(c.pos,[650,345])&&c.trust>=3&&c.practiceXP>=2&&c.hunger>=60&&c.energy>=60;}
export function expeditionReason(s,act){const f=s.frontier;if(!f)return '只在生活與山林試作';const t=f.trip;
 if(act==='depart')return t.phase!=='home'?'已在探行，不能重複打包':f.martial.avoid?'已選避戰，不打包出征；允許應戰後才可近山':f.source.cleared?'獸徑已清理，不重開同一目標':f.threat.phase!=='quiet'?'先處理眼前預警／侵擾':!s.autonomy.warmMeals?'先安家並吃過熱飯':f.martial.xp<3?'先練會基本步勢3':s.person.carry?'先搬回手上的物資':s.person.hunger<55||s.person.energy<60?'先吃飯休息（飽腹55／精力60）':preparedCount(s)<1?'至少一份真料理作路糧':t.joinRequested&&!companionReady(s)?'林舟需要在場空手、願意、信任3／步勢2、需求60才同行':null;
 if(act==='returnTrip')return t.phase==='home'?'已在家':null;
 if(act==='journey')return t.phase!=='outbound'?'沒有出行中的路程':null;
 if(act==='trailEat')return !['source','return'].includes(t.phase)||!t.ration?'沒有可用路糧':s.person.hunger>=95&&(!RECIPES[t.ration].energy||s.person.energy>=95)?'暫不需吃這份路糧':null;
 if(act==='trailFight')return t.phase!=='source'||f.source.cleared?'目前不在可應對的獸徑':f.martial.avoid?'已選避戰，先撤回':!moveKnown(s,f.martial.stance)?'尚未學會這招':s.person.energy<MOVES[f.martial.stance].energy?'精力不足，先撤回':null;
 return null;
}
export function expeditionTarget(s,act){return ['depart','returnTrip'].includes(act)||act==='trailEat'&&s.frontier.trip.phase==='return'?HOME:SOURCE_USE;}
export function expeditionPlan(s){const f=s.frontier;if(!f)return null;const t=f.trip,p=s.person;
 if(t.phase!=='home'){
  if(p.order&&!Object.hasOwn(EXPEDITION_ACTIONS,p.order)){t.phase='return';t.deferred=true;}
  if(p.hunger<38&&t.ration&&(t.phase==='source'||t.phase==='return'&&near(p.pos,HOME)))return 'trailEat';
  if(p.hunger<38||p.energy<23||f.martial.avoid){t.phase='return';t.deferred=true;}
  if(p.order==='trailEat'&&!expeditionReason(s,'trailEat'))return 'trailEat';
  if(t.phase==='return')return 'returnTrip';
  if(t.phase==='outbound')return 'journey';
  if(f.source.cleared){t.phase='return';return 'returnTrip';}
  return 'trailFight';
 }
 if(!p.order&&f.approach==='peace'&&!t.deferred&&s.autonomy.comfortRests&&p.hunger>65&&p.energy>75&&preparedCount(s)>=2&&!expeditionReason(s,'depart'))return 'depart';return null;
}
export function secureSource(s){const f=s.frontier;if(f.source.hp>0||f.source.cleared)return;f.source.cleared=true;f.source.clearAt=s.t;f.trip.phase='return';log(s,'獸徑已清理，先沿真路回家；沒有自動發戰利品。');}
export function expeditionComplete(s,act){const f=s.frontier;if(!f||expeditionReason(s,act))return false;const t=f.trip,p=s.person;
 if(act==='depart'){if(!near(p.pos,HOME))return false;const [id,r]=Object.entries(RECIPES).find(([,r])=>s.stock[r.output]>0)||[];if(!r)return false;s.stock[r.output]--;t.ration=id;t.packed++;t.journeys++;t.phase='outbound';t.joined=t.joinRequested&&companionReady(s);t.deferred=false;if(t.joined)f.companion.task=null;log(s,`打包一份${r.name}，實際前往本圖獸徑${t.joined?'，林舟同意同行':''}。`);return true;}
 if(act==='journey'){if(!near(p.pos,SOURCE_USE))return false;p.energy=clamp(p.energy-4);t.energySpent+=4;t.phase='source';f.source.lastStrike=s.t;return true;}
 if(act==='trailFight'){if(strike(s,f.source,SOURCE)){secureSource(s);return true;}return false;}
 if(act==='trailEat'){if(!near(p.pos,expeditionTarget(s,act)))return false;const id=t.ration,r=RECIPES[id],before={hunger:p.hunger,energy:p.energy};t.ration=null;t.eaten++;p.hunger=clamp(p.hunger+r.hunger);p.energy=clamp(p.energy+r.energy);recordTaste(s,id);recordMealUse(s,id,before);feel(s,r.feeling);if(id==='basic')s.autonomy.warmMeals++;log(s,`真吃包內${r.name}，實得飽腹${(p.hunger-before.hunger).toFixed(1)}／精力${(p.energy-before.energy).toFixed(1)}。`);return true;}
 if(act==='returnTrip'){if(!near(p.pos,HOME))return false;if(t.ration){if(preparedCount(s)>=s.cap.meal)return false;s.stock[RECIPES[t.ration].output]++;t.ration=null;t.returned++;}t.phase='home';t.joined=false;t.returns++;p.energy=clamp(p.energy-4);t.energySpent+=4;log(s,'沿真路回到家，未吃的路糧已退回；可以繼續生活。');return true;}return false;
}
export function tickExpedition(s,dt){const f=s.frontier;if(!f||!['source','return'].includes(f.trip.phase)||f.source.cleared)return;const q=f.source,t=f.trip,p=s.person;
 if(near(p.pos,SOURCE,55)&&s.t-q.lastStrike>=3){p.energy=clamp(p.energy-2);if(t.joined&&near(f.companion.pos,SOURCE,60))f.companion.energy=clamp(f.companion.energy-2);q.lastStrike=s.t;}
 const c=f.companion;if(t.phase==='source'&&t.joined&&near(c.pos,SOURCE,60)&&c.energy>25&&c.hunger>38&&s.t-t.lastAid>=4){q.hp=Math.max(0,q.hp-2);c.energy-=2;c.practiceXP=Math.min(6,c.practiceXP+.25);t.lastAid=s.t;t.aidHits++;secureSource(s);}
}
export function validExpedition(s){const f=s.frontier,q=f.source,t=f.trip;if(!q||!Number.isFinite(q.hp)||q.hp<0||q.hp>24||typeof q.cleared!=='boolean'||q.cleared!==(q.hp===0)||q.cleared&&(!Number.isFinite(q.clearAt)||q.clearAt<0||q.clearAt>s.t)||!q.cleared&&q.clearAt!==null||!Number.isFinite(q.lastStrike)||q.lastStrike<0||q.lastStrike>s.t||!t||!['home','outbound','source','return'].includes(t.phase)||['joinRequested','joined','deferred'].some(k=>typeof t[k]!=='boolean')||['journeys','returns','packed','eaten','returned','aidHits'].some(k=>!Number.isInteger(t[k])||t[k]<0)||!Number.isFinite(t.energySpent)||t.energySpent<0||!Number.isFinite(t.lastAid)||t.lastAid<0||t.lastAid>s.t||t.ration!==null&&!Object.hasOwn(RECIPES,t.ration))return false;
 if(t.packed!==t.eaten+t.returned+Number(!!t.ration)||t.journeys!==t.packed||t.journeys-t.returns!==(t.phase==='home'?0:1)||t.phase==='home'&&(t.ration!==null||t.joined)||t.joined&&(!f.companion.present||!f.companion.allowed||f.companion.carry||f.companion.task))return false;
 if(t.phase==='source'&&!near(s.person.pos,SOURCE_USE))return false;
 const a=s.person.task;if(a&&Object.hasOwn(EXPEDITION_ACTIONS,a.act)){if(expeditionReason(s,a.act)||a.timer>=EXPEDITION_ACTIONS[a.act].duration||a.phase==='go'&&a.timer!==0||a.phase==='do'&&!near(s.person.pos,expeditionTarget(s,a.act)))return false;}return true;
}
export function expeditionText(s){const f=s.frontier,t=f.trip;return `獸徑${f.source.hp}/24${f.source.cleared?'，已清理':''}；${{home:'在家',outbound:'正在走近山路',source:'在獸徑應對',return:'沿路回家'}[t.phase]}，包內${t.ration?RECIPES[t.ration].name+'1份':'無路糧'}${t.joined?'、林舟同行':''}；完成探行${t.returns}/${t.journeys}，已吃${t.eaten}／退回${t.returned}份。來回實行各耗4精力，途中需求不停；可撤回，暫緩後不自動重開。`;}
