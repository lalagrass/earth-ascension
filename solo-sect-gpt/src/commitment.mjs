// M7 activity ownership: one derived owner per person, read from existing state only.
const active=e=>e&&!['returned','cancelled'].includes(e.phase);
export const OWNER_LABEL={expedition:'遠征隊',journey:'遠行同伴',rescue:'救援',practice:'教習對練',class:'同堂授課',drill:'演武',spar:'切磋',culture:'門風相處',story:'約定',appointment:'其他約定'};
export function commitmentOf(w,p){if(!p)return null;const e=w.expedition;
 if(p.rank==='rescuer'&&e?.rescue?.helpers?.includes(p.id)&&e.rescue.phase!=='completed')return{owner:'rescue',id:e.id,party:[p.id]};
 if(active(e)&&e.actors.includes(p.id))return{owner:'expedition',id:e.id,phase:e.phase,party:[...e.actors]};
 if(active(e)&&(e.journey?.escort===p.id||e.journey?.sparPartner===p.id&&p.storyBusy)||p.id==='zhou'&&p.helpedBy)return{owner:'journey',id:e?.id||null,party:[p.id]};
 const t=w.martialPlan?.trial;if(t?.status==='running'&&(t.actor===p.id||t.coach===p.id))return{owner:'practice',id:t.session,party:[t.actor,t.coach]};
 if(p.classSession){const a=w.activities[p.classSession];return{owner:'class',id:p.classSession,role:a?.actor===p.id?'teacher':'student',party:a?[a.actor,...a.args.students]:[p.id]};}
 const d=w.drill;if(d&&!['completed','cancelled'].includes(d.status)&&(p.combatSession===d.id||d.witnessId===p.id))return{owner:'drill',id:d.id,party:[...d.actors]};
 if(p.sparUntil)return{owner:'spar',id:p.combatSession,party:[p.id,p.sparPartner].filter(Boolean)};
 const life=w.culturePlan?.active;if(life?.status==='running'&&life.casting.cast.includes(p.id))return{owner:'culture',id:life.activity,party:[...life.casting.cast]};
 const own=w.activities[p.activity];if(own&&['story','school','reception'].includes(own.kind))return{owner:'story',id:own.id,party:[p.id,own.args.partner||own.partner].filter(Boolean)};
 const held=Object.values(w.activities).find(a=>a.actor!==p.id&&(a.kind==='story'&&a.args.partner===p.id||['school','reception'].includes(a.kind)&&a.partner===p.id));if(held)return{owner:'story',id:held.id,party:[held.actor,p.id]};
 if(p.storyBusy)return{owner:'appointment',id:null,party:[p.id]};
 return null;}
// Owners an individual task/stop/recall may withdraw a person from, through that owner's own cancel path.
const WITHDRAWABLE=new Set(['practice','class','drill','spar','culture','story']);
const SOLO=new Set(['task','stop','guard','build','recall','resume','practiceStop']);
const SHARED=new Set(['spar','class','drill','practice','story','cultureEvent','school','fame','expedition','journey','cohabit','martialStyle','studyContent','promote','mentorPropose','mentorEvent','jointDrill']);
export function affected(w,c,p){if(c.type==='spar'||c.type==='mentorPropose')return[p?.id,c.target];if(c.type==='promote'){const q=w.people[c.target];return[c.target,...(q&&!q.sparHistory?.some(r=>r.duration>=600&&r.hits>=3)?['leader']:[])];}if(c.type==='class')return[p?.id,...(Array.isArray(c.students)?c.students:[])];if(['drill','expedition','journey','jointDrill'].includes(c.type))return Array.isArray(c.actors)?c.actors:[];if(c.type==='build')return Array.isArray(c.actors)?c.actors:[p?.id];if(c.type==='cohabit'){const f=w.families[p?.family];return f?[...f.members]:[p?.id];}if(c.type==='depart'){const q=w.people[c.legend]||Object.values(w.people).find(o=>o.canonicalIdentity===c.legend);return[q?.id];}return[p?.id];}
function describe(w,q,k){const name=q.name,label=OWNER_LABEL[k.owner];if(k.owner==='expedition')return name+'在'+label+'中（'+(k.phase==='prepare'?'準備領糧':'已出門')+'）；請到遠征頁「召回全隊」，返院後再改派';if(k.owner==='journey')return name+'正隨遠行隊伍同行，返院後才可另作安排';if(k.owner==='rescue')return name+'正在救援傷員，完成這趟後才可改派';return name+'正在'+label+'中；請先叫停或等它完成';}
// Returns null when the command may proceed; otherwise a rejection that has caused no side effect.
export function ownershipGate(w,c,p){const ids=affected(w,c,p).filter(id=>id&&w.people[id]);
 for(const id of ids){const q=w.people[id],k=commitmentOf(w,q);if(!k)continue;
  if(c.type==='recall'&&k.owner==='expedition')continue;
  if(c.type==='practiceStop'&&k.owner==='practice')continue;
  if(SOLO.has(c.type)&&WITHDRAWABLE.has(k.owner)&&c.type!=='resume')continue;
  if(c.type==='resume'&&!['expedition','journey','rescue','appointment'].includes(k.owner))continue;
  if(c.type==='depart'&&k.owner==='appointment'&&!q.storyBusy)continue;
  if(SOLO.has(c.type)||SHARED.has(c.type)||c.type==='depart')return{ok:false,reason:describe(w,q,k),reasonCode:'commitment.'+k.owner,commitment:{person:id,...k}};}
 return null;}
export function livenessIssues(w){const out=[],e=w.expedition;
 if(e?.phase==='halted')out.push({code:'expedition-halted',actors:[...e.actors],hint:'舊版暫停的遠征：召回全隊即可收尾'});
 if(e?.phase==='prepare'){const lost=e.actors.filter(id=>!e.packed.includes(id)&&w.activities[w.people[id]?.activity]?.kind!=='pack');if(lost.length)out.push({code:'pack-missing',actors:lost,hint:'領糧活動已被取代；召回全隊可取消出發'});}
 for(const p of Object.values(w.people))if(p.storyBusy&&!commitmentOf(w,{...p,storyBusy:false})&&!(p.contentArriving)&&!(e?.journey?.escort===p.id)&&!(p.id==='zhou'&&e?.choice==='rescue'&&active(e)))out.push({code:'busy-without-owner',actors:[p.id],hint:'標記忙碌卻沒有任何共享安排'});
 return out;}
