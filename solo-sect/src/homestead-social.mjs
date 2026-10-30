import {ALLY_USE} from './homestead-expedition.mjs';
import {move} from './homestead-spatial.mjs';
import {HOME,PLACES,LIFE_ACTIONS as ACTIONS} from './homestead-life-data.mjs';
import {RECIPES} from './homestead-content.mjs';
export const PAIR_POINT=[620,345];
export const MEETING=[650,345],EXIT=[875,450];
export const SOCIAL_ACTIONS={spar:{name:'一起切磋步勢',place:'pair',duration:8,frontierOnly:true},teach:{name:'互演與教學',place:'pair',duration:6,frontierOnly:true},bond:{name:'與林舟談談',place:'meeting',duration:5,frontierOnly:true},shareMeal:{name:'送林舟一份現成菜',place:'meeting',duration:4,frontierOnly:true},cooperate:{name:'商量幫忙搬一根柴',place:'meeting',duration:3,frontierOnly:true}};
export const freshCompanion=()=>({id:'linzhou',name:'林舟',allowed:true,present:false,leaving:false,pos:[...EXIT],hunger:70,energy:80,food:0,carry:null,task:null,trust:0,affinity:0,respect:0,practiceXP:1,sparDay:0,taught:false,chatDay:0,giftDay:0,coopDay:0,noticeDay:0,helpPending:false,helpJobs:0,woodGathered:0,fruitGathered:0,fruitEaten:0});
const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1,clamp=n=>Math.max(0,Math.min(100,n));
const log=(s,msg)=>{s.log.unshift({day:s.day,msg});s.log.length=Math.min(80,s.log.length);};
const busyNeeds=c=>c.hunger<38||c.energy<24||!!c.carry||c.helpPending;
const clearTask=(s,c)=>{if(c.task?.act==='chop'&&s.leases.wood==='companion')s.leases.wood=null;c.task=null;};
export function cooperationNeed(s){if(!s.frontier)return null;const need=Object.values(s.fac).reduce((n,f)=>n+(f.site&&!f.site.paused?Math.max(0,f.site.need.wood-f.site.delivered.wood-f.site.reserved.wood):0),0),incoming=[s.person,s.frontier.companion].reduce((n,p)=>n+(p.carry?.kind==='wood'&&p.carry.origin==='wild'?p.carry.amount:0),0),missing=Math.max(0,need-s.stock.wood-incoming);return missing?`未暫停工程仍缺${missing}木（已扣庫存與在途）`:null;}
export function socialReason(s,act){const c=s.frontier?.companion;if(!c)return '只在生活與山林試作';if(!c.allowed||!c.present||c.leaving)return '林舟目前不在場／準備離開，獨居仍可生活';if(!near(c.pos,MEETING)||busyNeeds(c))return '林舟先照顧需求或完成手上工作';if(s.frontier.threat.phase!=='quiet')return '先避開林緣侵擾';if(act==='bond')return c.chatDay===s.day?'今天已談過，不重複刷關係':null;if(act==='shareMeal')return c.giftDay===s.day?'今天已送過':c.hunger>=80?'對方暫不需要餐食':!Object.values(RECIPES).some(r=>s.stock[r.output]>0)?'沒有現成料理可分享':null;if(['spar','teach'].includes(act)){if(c.trust<2||c.respect<1)return '需要信任2、敬意1與彼此同意';if(c.hunger<(s.person.task?.act===act?38:45)||c.energy<(s.person.task?.act===act?24:45)||s.person.hunger<(s.person.task?.act===act?38:45)||s.person.energy<(s.person.task?.act===act?24:45))return '雙方先吃飯休息再交流';const m=s.frontier.martial;if(act==='spar')return m.xp<3?'先自己練到步勢3':c.sparDay===s.day?'今天已切磋過，不重複刷學習':null;return c.taught?'這段已互演過':!m.partnerRounds||m.xp<6||c.practiceXP<2?'先實際切磋，主角步勢6、對方步勢2再互演':null;}if(act==='cooperate'&&s.person.task?.act==='cooperate'&&s.person.order!=='cooperate'&&(!s.frontier.autoCooperate||!cooperationNeed(s)))return '自主商量已取消：政策關閉或工程已不缺木';if(act==='cooperate')return c.trust<2?'信任至少2才願幫忙':c.coopDay===s.day?'今天已約過一件幫忙':c.hunger<45||c.energy<45?'對方需要先休息吃飯':s.stock.wood+(s.person.carry?.kind==='wood'?s.person.carry.amount:0)>=s.cap.wood?'木料空間不足':null;return null;}
export function socialPlan(s){const c=s.frontier?.companion;if(!c||s.person.hunger<=55||s.person.energy<=55||!s.autonomy.warmMeals)return null;if(s.frontier.autoCooperate&&cooperationNeed(s)&&!socialReason(s,'cooperate'))return 'cooperate';if(!socialReason(s,'bond')&&(s.person.personality==='sociable'||s.day%2===0))return 'bond';if(s.frontier.approach==='learn'){if(!socialReason(s,'teach'))return 'teach';if(s.frontier.martial.partnerRounds<2&&!socialReason(s,'spar'))return 'spar';}return null;}
export function socialComplete(s,act){const c=s.frontier?.companion;if(!c||socialReason(s,act)||!near(s.person.pos,['spar','teach'].includes(act)?PAIR_POINT:MEETING)||!near(c.pos,MEETING))return false;
 if(act==='spar'){const m=s.frontier.martial;c.sparDay=s.day;c.practiceXP=Math.min(6,c.practiceXP+1);m.xp=Math.min(12,m.xp+1+s.frontier.talents.mind*.5);m.partnerRounds++;s.person.energy=clamp(s.person.energy-6);c.energy=clamp(c.energy-6);c.trust=Math.min(5,c.trust+1);log(s,'實際切磋完成：雙方練到步勢，彼此也更信任。');return true;}
 if(act==='teach'){const m=s.frontier.martial;c.taught=true;c.practiceXP=Math.min(6,c.practiceXP+2);c.respect=Math.min(5,c.respect+1);s.person.energy=clamp(s.person.energy-4);c.energy=clamp(c.energy-3);m.insights=1;log(s,'互演後領悟回身掃勢：可重計敵攻3秒，但耗力且傷害較低。');return true;}
 if(act==='bond'){c.chatDay=s.day;c.trust=Math.min(5,c.trust+1);c.affinity=Math.min(5,c.affinity+1);log(s,'彼此談了日常，林舟多了一點信任；強弱不等於喜歡。');return true;}
 if(act==='shareMeal'){const r=Object.values(RECIPES).find(r=>s.stock[r.output]>0);if(!r)return false;s.stock[r.output]--;c.hunger=clamp(c.hunger+r.hunger);c.energy=clamp(c.energy+r.energy);c.giftDay=s.day;c.trust=Math.min(5,c.trust+1);c.affinity=Math.min(5,c.affinity+1);log(s,`真送林舟${r.name}一份，只有對方得到飲食恢復。`);return true;}
 if(act==='cooperate'){c.coopDay=s.day;c.helpPending=true;clearTask(s,c);log(s,'林舟同意幫忙一件砍柴搬回；尚未發出木料。');return true;}return false;
}
export function tickCompanion(s,dt){const c=s.frontier?.companion;if(!c)return;
 const trip=s.frontier.trip;if(trip?.joined&&trip.phase!=='home'){c.hunger=clamp(c.hunger-.14*dt);if(!c.allowed||c.hunger<38||c.energy<24){trip.joined=false;c.leaving=true;clearTask(s,c);return;}c.present=true;c.leaving=false;clearTask(s,c);move(s,c,trip.phase==='return'?MEETING:ALLY_USE,dt,65);return;}
 const slot=s.day>=5&&s.t%240>=80&&s.t%240<200&&c.allowed&&s.frontier.threat.phase==='quiet';
 if(!c.present){if(!slot)return;c.present=true;c.leaving=false;c.pos=[...EXIT];clearTask(s,c);log(s,'林舟沿村路走來，是否交流由你決定。');}
 c.hunger=clamp(c.hunger-.14*dt);if(!slot)c.leaving=true;
 if(c.hunger<25&&c.task&&!['eat','forage','return'].includes(c.task.act))clearTask(s,c);
 if(c.energy<15&&c.task&&!['rest','eat','return','forage'].includes(c.task.act))clearTask(s,c);
 if(c.leaving&&!c.carry&&c.task&&!['leave'].includes(c.task.act))clearTask(s,c);
 if(!c.carry&&!c.leaving&&c.hunger>=38&&c.energy>=24&&near(c.pos,MEETING)&&Object.hasOwn(SOCIAL_ACTIONS,s.person.task?.act||'')){clearTask(s,c);return;}
 if(!c.task){
  let act;if(c.carry)act='return';else if(c.leaving)act='leave';else if(c.hunger<38&&c.food)act='eat';else if(c.hunger<38&&s.wild.berries>=1)act='forage';else if(c.energy<24)act='rest';
  else if(!near(c.pos,MEETING))act='arrive';
  else if(Object.hasOwn(SOCIAL_ACTIONS,s.person.task?.act||'')){return;}
  else if(c.helpPending&&!s.leases.wood&&s.wild.wood>=1&&s.stock.wood+(s.person.carry?.kind==='wood'?s.person.carry.amount:0)<s.cap.wood)act='chop';else act='leisure';
  c.task={act,phase:'go',timer:0};if(act==='chop')s.leases.wood='companion';
 }
 const t=c.task,target=t.act==='forage'?PLACES.berries:t.act==='chop'?PLACES.wood:t.act==='return'&&c.carry.kind==='wood'?HOME:t.act==='leave'?EXIT:MEETING;
 if(t.phase==='go'){if(!move(s,c,target,dt))return;t.phase='do';t.timer=0;}
 if(t.act==='leave'){c.present=false;c.leaving=false;clearTask(s,c);return;}
 if(t.act==='arrive'){c.respect=Math.max(c.respect,Math.min(5,Number(s.fac.hut.stage===2)+Number(s.fac.bed.stage===2)+Number(s.frontier.martial.xp>=3)));if(c.noticeDay!==s.day&&c.respect){c.noticeDay=s.day;log(s,'林舟看見你學會的手藝，想聽你談談；敬意不代表已信任。');}clearTask(s,c);return;}
 if(t.act==='return'){const a=c.carry;if(a.kind==='wood'){s.stock.wood+=a.amount;c.helpJobs++;c.helpPending=false;log(s,'林舟把真砍的一根木料搬回物堆。');}else c.food+=a.amount;c.carry=null;clearTask(s,c);return;}
 if(t.act==='rest'){c.energy=clamp(c.energy+3*dt);if(c.energy>=85)clearTask(s,c);return;}
 t.timer+=dt;const duration=ACTIONS[t.act]?.duration||8;if(t.timer<duration)return;
 if(t.act==='chop'&&s.wild.wood>=1&&s.stock.wood+(s.person.carry?.kind==='wood'?s.person.carry.amount:0)<s.cap.wood){s.wild.wood--;c.carry={kind:'wood',amount:1,origin:'wild'};c.woodGathered++;c.energy=clamp(c.energy-7);}
 if(t.act==='forage'&&s.wild.berries>=1){s.wild.berries--;c.carry={kind:'berries',amount:1,origin:'personal'};c.fruitGathered++;c.energy=clamp(c.energy-5);}
 if(t.act==='eat'&&c.food){c.food--;c.hunger=clamp(c.hunger+26);c.fruitEaten++;}
 if(t.act==='leisure')c.energy=clamp(c.energy+5);
 clearTask(s,c);
}
export function validCompanion(s){const c=s.frontier?.companion;if(!c||c.id!=='linzhou'||c.name!=='林舟'||['allowed','present','leaving','helpPending','taught'].some(k=>typeof c[k]!=='boolean')||!Array.isArray(c.pos)||c.pos.length!==2||c.pos.some(n=>!Number.isFinite(n))||c.pos[0]<0||c.pos[0]>900||c.pos[1]<0||c.pos[1]>560||['hunger','energy'].some(k=>!Number.isFinite(c[k])||c[k]<0||c[k]>100)||['trust','affinity','respect'].some(k=>!Number.isInteger(c[k])||c[k]<0||c[k]>5)||['sparDay','food','helpJobs','woodGathered','fruitGathered','fruitEaten','chatDay','giftDay','coopDay','noticeDay'].some(k=>!Number.isInteger(c[k])||c[k]<0)||c.food>1||['sparDay','chatDay','giftDay','coopDay','noticeDay'].some(k=>c[k]>s.day)||!Number.isFinite(c.practiceXP)||c.practiceXP<1||c.practiceXP>6)return false;
 if(c.carry&&(!c.present||c.carry.amount!==1||!(c.carry.kind==='wood'&&c.carry.origin==='wild'||c.carry.kind==='berries'&&c.carry.origin==='personal')))return false;
 if(c.woodGathered!==c.helpJobs+(c.carry?.kind==='wood'?1:0)||c.fruitGathered!==c.fruitEaten+c.food+(c.carry?.kind==='berries'?1:0))return false;
 if(c.task&&(!c.present||!['arrive','leave','rest','leisure','eat','forage','chop','return'].includes(c.task.act)||!['go','do'].includes(c.task.phase)||!Number.isFinite(c.task.timer)||c.task.timer<0||c.task.act==='return'&&!c.carry||c.carry&&c.task.act!=='return'))return false;
 if(c.task){const a=c.task.act,target=a==='forage'?PLACES.berries:a==='chop'?PLACES.wood:a==='return'&&c.carry?.kind==='wood'?HOME:a==='leave'?EXIT:MEETING;if(c.task.phase==='go'&&c.task.timer!==0||c.task.phase==='do'&&(!near(c.pos,target)||['arrive','leave','return'].includes(a)||c.task.timer>=(ACTIONS[a]?.duration||8))||a==='forage'&&(c.food!==0||c.carry)||a==='chop'&&(!c.helpPending||c.trust<2))return false;}
 if(c.task?.act==='chop'&&(s.leases.wood!=='companion'||s.person.task?.act==='chop'||s.helper?.task?.act==='chop'))return false;
 return true;
}
export function validSocialTask(s){const t=s.person.task;if(!t||!Object.hasOwn(SOCIAL_ACTIONS,t.act))return true;if(!s.frontier||!Number.isFinite(t.timer)||t.timer<0||t.timer>=SOCIAL_ACTIONS[t.act].duration||t.phase==='go'&&t.timer!==0)return false;return t.phase!=='do'||(near(s.person.pos,['spar','teach'].includes(t.act)?PAIR_POINT:MEETING)&&s.frontier.companion.present&&near(s.frontier.companion.pos,MEETING));}
export function socialText(s){const c=s.frontier.companion;return `林舟：${c.allowed?c.present?'在家園附近':'白天可能來訪':'已選獨處'}；好感${c.affinity}/5、信任${c.trust}/5、敬意${c.respect}/5。${c.helpPending?'已答應一件幫忙，仍需真採集／搬回':`已完成${c.helpJobs}件幫忙`}；飽腹${Math.round(c.hunger)}／精力${Math.round(c.energy)}。對方步勢${c.practiceXP}/6${c.taught?'，已互演':'，尚未互演'}；不是同住／學徒，彼此仍有自己的需求。`;}
