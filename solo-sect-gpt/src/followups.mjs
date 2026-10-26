// M22 follow-up stories v1: three lines, two talk segments each, started from real memories/families and answered from existing trust and willingness only.
import{DAY}from'./data.mjs';import{event,sorted}from'./state.mjs';import{rulesFor}from'./save-features.mjs';import{commitmentOf}from'./commitment.mjs';import{begin}from'./activities.mjs';
export const LINES={school:{name:'義學之後',segs:['回訪','再邀']},cowork:{name:'共作之後',segs:['談入門','本人回應']},household:{name:'同住之後',segs:['共同生活','傷後照料']}};
export const ANSWERS={accept:'答應',later:'延後',decline:'婉拒',remembered:'記得了'};
const MEMBER=['leader','outer','inner'],LATER=3*DAY;
export function adoptFollowups(w){if(!w.followPlan){w.followPlan={version:1,lines:{}};w.rulesVersion=rulesFor(w);event(w,'followups-adopted',[],{version:1,text:'採用後續 v1：義學、共作、同住之後的事會有下文。'});}return{ok:true};}
const present=p=>p&&p.kind==='human'&&p.adult&&p.residence!=='departed'&&!p.inactive&&p.hp>0;
const memOf=(w,kind,a,b,after=-1)=>w.memories.filter(m=>m.kind===kind&&m.actors.includes(a)&&m.actors.includes(b)&&m.tick>after).at(-1)||null;
const trust=(w,a,b)=>w.relationships[a+'|'+b]?.trust||0;
// Who the line is about, from real records; a stored line keeps its cast.
function cast(w,line){const st=w.followPlan?.lines[line];if(st)return{actors:st.actors,source:st.source};
 if(line==='school'){const lin=w.people.lin;if(!lin||w.stories['recruit.school']?.status!=='completed')return{reason:'還沒有完成過義學'};const m=w.memories.filter(m=>m.kind==='teach'&&m.actors.includes('lin')).at(-1),teacher=m?.actors.find(id=>id!=='lin');return m?{actors:[teacher,'lin'],source:{memory:m.id,tick:m.tick}}:{actors:['leader','lin'],source:null};}
 if(line==='cowork'){for(const m of w.memories.filter(m=>m.kind==='cowork')){const other=m.actors.find(id=>w.people[id]&&!MEMBER.includes(w.people[id].rank)&&w.people[id].kind==='human'&&w.people[id].adult),member=m.actors.find(id=>MEMBER.includes(w.people[id]?.rank));if(other&&member)return{actors:[member,other],source:{memory:m.id,tick:m.tick}};}return{reason:'還沒有和非門人一起做過工'};}
 const f=sorted(w.families).find(f=>f.status!=='separated'&&f.members.every(id=>w.people[id]?.adult));return f?{actors:[...f.members],source:{family:f.id}}:{reason:'還沒有兩位成年人結伴'};}
const sourceOk=(w,s)=>s&&(s.memory?w.memories.some(m=>m.id===s.memory):!!w.families[s.family]&&w.families[s.family].status!=='separated');
// Read-only status for one line: which segment is next and whether it can start now.
export function lineStatus(w,line){const def=LINES[line],st=w.followPlan?.lines[line],c=cast(w,line);if(!w.followPlan)return{line,name:def.name,ok:false,reason:'先採用後續 v1'};
 if(c.reason)return{line,name:def.name,ok:false,reason:c.reason,seg:1};const [a,b]=c.actors,pa=w.people[a],pb=w.people[b],done=st?.segs||[null,null],base={line,name:def.name,actors:c.actors,source:c.source,segs:done,answer:st?.answer||null};
 if(st?.closed)return{...base,ok:false,seg:null,reason:st.closed==='decline'?'對方婉拒，這條後續結束；過往記憶仍在':'這條後續已完成'};
 const seg=done[0]?2:1;if(!sourceOk(w,c.source))return{...base,seg,ok:false,reason:'缺來源：起點紀錄已不在保留範圍，不能編出往事'};
 if(line!=='household'&&seg===1&&MEMBER.includes(pb?.rank))return{...base,seg,ok:false,reason:pb.name+'已入門，這條後續不適用'};
 if(seg===2&&st?.answer==='later'&&w.tick<st.laterUntil)return{...base,seg,ok:false,reason:'對方說再想想：第'+(Math.floor(st.laterUntil/DAY)+1)+'日後可再問'};
 if(line==='household'&&seg===2&&!memOf(w,'care',a,b,done[0].at))return{...base,seg,ok:false,reason:'條件不足：同住之後還沒有照料過受傷的對方'};
 for(const p of[pa,pb]){if(!present(p))return{...base,seg,ok:false,reason:'條件不足：'+(p?.name||'對方')+'不在院中或無法赴約'};const k=commitmentOf(w,p);if(k)return{...base,seg,ok:false,reason:p.name+'正在忙，等結束或先叫停'};}
 return{...base,seg,ok:true,reason:null};}
export function startFollowup(w,line){if(!Object.hasOwn(LINES,line))return{ok:false,reason:'未知後續'};const s=lineStatus(w,line);if(!s.ok)return{ok:false,reason:LINES[line].name+'：'+s.reason};const [a,b]=s.actors;
 return begin(w,w.people[a],'talk',{target:b,followup:line,seg:s.seg},true);}
const TEXT={school:[(p,o)=>o.name+'回來看'+p.name+'，兩人談起那堂義學。',null],cowork:[(p,o)=>p.name+'向'+o.name+'提起入門的事，說得直接。',null],household:[(p,o)=>p.name+'和'+o.name+'談起同住以來的日子。',(p,o)=>'那次受傷時的照料，'+p.name+'和'+o.name+'都還記得。']};
const ANSWER_TEXT={accept:o=>o.name+'說願意；入門仍照門規（床位、供餐）辦理。',later:o=>o.name+'說再想想，過幾日再談。',decline:o=>o.name+'婉拒了，說現在這樣就好。'};
// Called once when the talk carrying args.followup finishes; a finished segment is never awarded twice.
export function completeFollowup(w,a,p,o){const line=a.args.followup,seg=a.args.seg,s=lineStatus(w,line);if(!w.followPlan||s.seg!==seg||!s.actors||w.followPlan.lines[line]?.segs?.some(x=>x?.activity===a.id))return;
 const st=w.followPlan.lines[line]??={actors:[...s.actors],source:structuredClone(s.source),segs:[null,null],answer:null,laterUntil:null,closed:null};let outcome,text;
 if(seg===1){outcome='done';text=TEXT[line][0](p,o);}
 else if(line==='household'){outcome='remembered';text=TEXT.household[1](p,o);st.closed='done';}
 else{const r=w.people[st.actors[1]],t=trust(w,r.id,st.actors[0]);outcome=(r.willingness||0)>=6&&t>=4?'accept':t>=4?'later':'decline';st.answer=outcome;st.laterUntil=outcome==='later'?w.tick+LATER:null;if(outcome!=='later')st.closed=outcome==='decline'?'decline':'done';text=ANSWER_TEXT[outcome](r);}
 st.segs[seg-1]={at:w.tick,activity:a.id,outcome};event(w,'followup',[p.id,o.id],{line,seg,outcome,text:LINES[line].name+'・'+LINES[line].segs[seg-1]+'：'+text});}
export function validFollowPlan(w,m,record,int,safeId){const ids=Object.keys(m.lines);return record(m)&&m.version===1&&Object.keys(m).sort().join()==='lines,version'&&record(m.lines)&&ids.every(id=>Object.hasOwn(LINES,id))&&Object.values(m.lines).every(st=>record(st)&&Object.keys(st).sort().join()==='actors,answer,closed,laterUntil,segs,source'&&Array.isArray(st.actors)&&st.actors.length===2&&st.actors.every(id=>w.people[id]?.adult)&&st.actors[0]!==st.actors[1]&&record(st.source)&&(st.source.memory!==undefined?safeId(st.source.memory)&&int(st.source.tick,0,w.tick)&&Object.keys(st.source).length===2:safeId(st.source.family)&&Object.keys(st.source).length===1)&&Array.isArray(st.segs)&&st.segs.length===2&&st.segs.every((x,k)=>x===null||record(x)&&int(x.at,0,w.tick)&&safeId(x.activity)&&(k===0?x.outcome==='done':Object.hasOwn(ANSWERS,x.outcome)))&&st.segs[0]!==null&&(st.answer===null||['accept','later','decline'].includes(st.answer))&&(st.answer==='later')===(st.laterUntil!==null)&&(st.laterUntil===null||int(st.laterUntil,0,w.tick+LATER))&&(st.closed===null||['done','decline'].includes(st.closed)));}
