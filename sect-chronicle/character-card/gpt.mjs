import { card, field, missing } from './contract.mjs';
import { martialEntry } from '../martial-view/contract.mjs';
import { portrait } from './portrait.mjs';
import { situation } from '../scene-shared/sources/gpt/solo-sect-gpt/src/person-view.mjs';
import { visibleEntity } from '../scene-shared/sources/gpt/solo-sect-gpt/src/view.mjs';
import { command } from '../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
export const GPT_SHA = '6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc';
export function gptCard(world, actorId) {
 const p = world.people[actorId]; if (!p || !visibleEntity(world,p)) return null;
 const s = situation(world,p), source = `gpt:${GPT_SHA}:world.people.${actorId}`, a = world.activities[p.activity];
 return card({ branch:'gpt', sha:GPT_SHA, actorId, identity:{name:p.name,role:p.rank,portrait:portrait('gpt',actorId)},
  action:{id:a?.kind || p.action?.move || 'idle',current:s.current,reason:field('action.reason',s.why,{source}),next:s.next,target:a?.kind || null,phase:p.action?.phase || a?.phase || (p.moving?'walking':'idle'),progress:field('action.progress',null,{source}),stopReason:field('action.stopReason',s.blocked?.text || p.blocked || null,{source})},
  fields:[field('energy',p.energy,{source,layer:'effective',unit:'原生百分之一點'}),field('load',s.weight,{source,layer:'effective',unit:'原生負重'}),missing('energy',source),
   ...p.stats.map((v,i)=>field(`stats.${i}`,v,{source,layer:'base',unit:'原生1–7'})),
   ...p.stats.map((v,i)=>missing(`stats.${i}`,source)),
   field('innate',null,{source,layer:'innate',availability:'unsupported'})],
  martial:Object.entries(p.skill).map(([id,v])=>martialEntry({id,name:id,source,
   learned:field('learned','已學：原生 skill 記錄，不代表所有招式解鎖',{source}),
   proficiency:field('proficiency',`U ${v.U}／F ${v.F}／I ${v.I}`,{source,unit:'原生 U／F／I（不同量尺）'}),
   execution:field('execution',null,{source}),
   conditions:{entry:{appliesTo:'已學記錄',policy:'原 skill 來源',result:field('condition.entry',v.sources?.length?v.sources:null,{source})}}
  })),
  commands:s.actions.filter(a=>a.cmd).map(a=>({id:a.label,label:a.label,command:a.cmd,enabled:!a.reason,reason:a.reason})) });
}
export function gptCommand(world,actorId,id){const a=gptCard(world,actorId)?.commands.find(x=>x.id===id);return a?.enabled?command(world,structuredClone(a.command)):{ok:false,reason:a?.reason||'不支援指令'};}
