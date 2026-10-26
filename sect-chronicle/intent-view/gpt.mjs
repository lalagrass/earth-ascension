import {field,intentView,validateRequest} from './contract.mjs';
import {gptCard,GPT_SHA} from '../character-card/gpt.mjs';
import {visibleEntity} from '../scene-shared/sources/gpt/solo-sect-gpt/src/view.mjs';
import {command} from '../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
export function createGPTIntentAdapter({getWorld}){
 function snapshot(actorId){const w=getWorld(),p=w.people[actorId];if(!p||p.inactive||p.residence==='departed'||!visibleEntity(w,p))return null;
  const card=gptCard(w,actorId),source=`gpt:${GPT_SHA}:world.people.${actorId}`;
  const f=(id,value)=>field(id,value,{source:`${source}.${id}`});
  return intentView({source,actorId,current:card.action,fields:{workGoal:f('intent.kind',p.intent?.kind||'沒有已受理人工目標'),pending:f('pendingCommands',(w.pendingCommands||[]).filter(c=>c.actor===actorId).map(c=>({id:c.id,type:c.type,kind:c.kind||null,executeTick:c.executeTick}))),stop:f('manualStop',p.manualStop),rest:f('recovering',p.recovering),recall:field('recall',null,{source,availability:'unsupported'}),goals:f('primary/secondary',{primary:p.primary,secondary:p.secondary}),queue:f('queue','原生pendingCommands；非正式版單一pending')},
   policies:[{id:'native-auto',label:'原生自主',allow:f('auto',p.auto),reaction:field('reaction',null,{source,availability:'unsupported'}),state:field('state',null,{source,availability:'unsupported'}),reason:card.action.reason,commandIds:[]}],
   commands:card.commands.map(c=>({id:`native:${JSON.stringify(c.command)}`,nativeId:c.command.type,label:c.label,enabled:c.enabled,reason:c.reason||null,detail:null,group:'action',payload:{method:'command',command:structuredClone(c.command)}})),shortcuts:[]});
 }
 return {snapshot,command(request,{expectedActorId=request.actorId}={}){const checked=validateRequest(snapshot(request.actorId),request,expectedActorId);return checked.ok?command(getWorld(),structuredClone(checked.command.payload.command)):checked;}};
}
