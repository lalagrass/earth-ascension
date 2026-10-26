import { field, intentView, validateRequest } from './contract.mjs';
import { geminiCard } from '../character-card/gemini.mjs';
export const OFFICIAL_BASE='5e7f36682272ef44190bc0d908030213e4ab8ca0';
const JOB={water:'挑水',herb:'採藥',wood:'砍柴',rest:'本趟後停工'};
export function createOfficialIntentAdapter({getModel,dispatch}) {
 function snapshot(actorId){const model=getModel(),p=model.view().people[actorId];if(!p)return null;
  const source=`dev:${OFFICIAL_BASE}:model.view.people.${actorId}`,card=geminiCard(model,actorId);
  const f=(id,value,path=id)=>field(id,value,{source:`${source}.${path}`});
  const commands=model.actions(actorId).filter(a=>!a.hidden || a.id==='start'&&p.resting || a.id==='cancel'&&p.pending!=null || a.id==='cancel'&&p.auto.wanting).map(a=>({
   id:`dispatch:${a.id}`,nativeId:a.id,label:a.label,enabled:!!a.enabled,reason:a.enabled?null:a.reason||null,detail:a.detail||null,
   payload:{method:'dispatch',actorId,action:a.id},group:'action',hidden:!!a.hidden,
  }));
  const policies=[['guard','自主護院',p.auto,'setAuto'],['upkeep','自主整理護欄',p.up,'setUpkeep']].map(([id,label,a,method])=>{
   const ids=[];if(a){for(const [key,args,name,pressed]of [
    ['allow',{allow:!a.allow},a.allow?'關閉允許':'允許',a.allow],
    ['early',{react:'early'},id==='guard'?'主動照看':'順手照看',a.react==='early'],
    ['late',{react:'late'},id==='guard'?'受擾再處理':'累積再整理',a.react==='late']]){
     const cid=`policy:${id}:${key}`;ids.push(cid);commands.push({id:cid,nativeId:`${method}:${key}`,label:name,enabled:true,reason:null,detail:null,pressed:!!pressed,group:id,payload:{method,actorId,args}});
   } if(a.wanting)ids.push(id==='guard'?'dispatch:cancel':'dispatch:upCancel');}return {id,label,allow:f(`${id}.allow`,a?.allow,`${id==='guard'?'auto':'up'}.allow`),reaction:f(`${id}.reaction`,a?.reactLabel,`${id==='guard'?'auto':'up'}.reactLabel`),state:f(`${id}.state`,a?.state,`${id==='guard'?'auto':'up'}.state`),reason:f(`${id}.reason`,a?.text,`${id==='guard'?'auto':'up'}.text`),commandIds:ids};
  });
  const shortcuts=p.pending!=null?['dispatch:cancel']:p.resting?['dispatch:start']:p.recall?['dispatch:resume']:[];
  return intentView({source,actorId,current:card.action,fields:{
   workGoal:f('workGoal',p.jobLabel,'job/jobLabel'),pending:f('pending',p.pending==null?'沒有':JOB[p.pending]||p.pending,'pending'),
   stop:f('stop',p.resting?'玩家明確停工（回滿也不續工）':'未明確停工','resting'),rest:f('rest',p.rest==='auto'?'自主恢復':p.rest==='manual'?'玩家停工恢復':p.rest||'未恢復中','rest'),recall:f('recall',!!p.recall),
   goals:f('goals',Object.entries({補水:p.life02?.fill,練掌:p.train01?.goal,泡茶:p.tea?.want,修寢舍:p.home02?.want}).filter(([,v])=>v===true).map(([k])=>k),'life02.fill/train01.goal/tea.want/home02.want'),
   queue:field('queue',null,{source,availability:'unsupported'}),
  },policies,commands,shortcuts});
 }
 function command(request,{expectedActorId=request.actorId}={}){const checked=validateRequest(snapshot(request.actorId),request,expectedActorId);if(!checked.ok)return checked;
  const c=checked.command,model=getModel(),p=c.payload;
  return p.method==='dispatch'?(dispatch?dispatch(p.action,p.actorId):model.dispatch(p.action,p.actorId)):model[p.method](p.actorId,structuredClone(p.args));
 }
 return {snapshot,command};
}
