import{Q}from'./data.mjs';import{stations,position}from'./map.mjs';import{begin,cancel,finish,memory,approach}from'./activities.mjs';import{reserveBundle,release,event}from'./state.mjs';import{route,arrived}from'./navigation.mjs';
export function beginClass(w,p,students,art='punch'){
 if(!p?.adult||p.residence!=='resident'||!w.facilities.hall.stage||!['punch','staff','sword'].includes(art)||!p.skill[art]||p.skill[art].U<5)return{ok:false,reason:'授課需修廳、成年常住老師與已理解的拳棍劍'};
 if(!Array.isArray(students)||students.length<1||students.length>4||new Set(students).size!==students.length||students.some(id=>id===p.id||!w.people[id]?.adult||w.people[id].residence!=='resident'||!w.people[id].skill[art]||w.people[id].hp<=0||w.people[id].energy<2500||w.people[id].storyBusy))return{ok:false,reason:'請選1–4位可參與、已學此門武學的成年常住同門'};
 if(p.energy<2500||p.hp<=0)return{ok:false,reason:'老師需先休養至精力25以上'};
 const result=begin(w,p,'class',{students:[...students],art},true);if(!result.ok)return result;const a=w.activities[p.activity];a.classSlots={};p.classSession=a.id;p.storyBusy=true;
 for(const [i,id]of students.entries()){const q=w.people[id];cancel(w,q,'接受有限同堂授課');q.classSession=a.id;q.storyBusy=true;a.classSlots[id]='hall.student.'+i;}
 event(w,'class-accepted',[p.id,...students],{art,activity:a.id});return result;
}
export function detachClass(w,p,reason){if(!p.classSession)return;const a=w.activities[p.classSession];if(!a||a.kind!=='class'){p.classSession=null;return;}const ids=p.id===a.actor?[p.id,...a.args.students]:[p.id];
 for(const id of ids){const q=w.people[id];q.classSession=null;q.storyBusy=false;q.pose='idle';q.reason=reason;if(id!==a.actor){q.path=[];q.routeAt=0;const key=a.classSlots[id];for(const [rid,r]of Object.entries(w.reservations))if(r.activity===a.id&&["participant:"+id,"station:"+key].includes(r.key))delete w.reservations[rid];for(const k of Object.keys(w.queues))w.queues[k]=w.queues[k].filter(r=>r.activity!==a.id||k!=='station:'+key);}}
 if(p.id===a.actor){if(p.intent?.kind==='class')p.intent=null;for(const [i,id]of a.args.students.entries())route(w,w.people[id],stations['safe.'+(i+5)]);}
 if(p.id!==a.actor){a.args.students=a.args.students.filter(id=>id!==p.id);delete a.classSlots[p.id];event(w,'class-left',[p.id],{activity:a.id,reason});}
}
export function classActivityTick(w,p){const a=w.activities[p.activity];if(!a||a.kind!=='class')return false;const students=a.args.students.map(id=>w.people[id]);if(!students.length||[p,...students].some(q=>q.hp<=0||q.energy<2500||q.residence!=='resident')){cancel(w,p,'授課有人失能／需休養，完整課程前不給學理');return true;}
 const requests=[['station:hall.teach'],...students.flatMap(q=>[['participant:'+q.id],['station:'+a.classSlots[q.id]]])];if(!reserveBundle(w,a,requests)){p.blocked='同堂授課候位，整組站位空出後入座';return true;}
 if(!a.routed){for(const q of students)route(w,q,stations[a.classSlots[q.id]]);a.routed=true;}if(!approach(w,p,a,'hall.teach'))return true;
 for(const q of students){const at=stations[a.classSlots[q.id]];if(!arrived(q)||Math.hypot(q.x/Q-at[0],q.y/Q-at[1])>2){if(arrived(q))route(w,q,at);return true;}}
 p.pose='teach';for(const q of students)q.pose='listen';a.progress++;if(a.progress%4===0)p.energy--;if(a.progress<400)return true;
 const learned=[];for(const q of students)if(memory(w,'teach',p,q,a.id)){const s=q.skill[a.args.art];s.U=Math.min(100,s.U+2+Math.floor(p.stats[3]/2));s.sources.push({kind:'class',teacher:p.id,tick:w.tick,activity:a.id});learned.push(q.id);}
 event(w,'class-complete',[p.id,...students.map(q=>q.id)],{art:a.args.art,learned,activity:a.id});detachClass(w,p,'課程完成，各自回到生活');finish(w,p,a,'同堂授課完成');return true;
}
