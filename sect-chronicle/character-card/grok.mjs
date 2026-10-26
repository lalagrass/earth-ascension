import { card, field, missing } from './contract.mjs';
import { martialEntry } from '../martial-view/contract.mjs';
import { portrait } from './portrait.mjs';
import { statusOf } from '../scene-shared/sources/grok/solo-sect/src/status.mjs';
import { setOrder } from '../scene-shared/sources/grok/solo-sect/src/sim.mjs';
import { artById } from '../scene-shared/sources/grok/solo-sect/src/arts.mjs';
export const GROK_SHA = '6760f21c342cbf72fc9fb4baf0aec8655abd0dd2';
export function grokCard(state, actorId) {
 const d=state.ds.find(d=>d.id===actorId && !d.removed);if(!d)return null;
 const s=statusOf(state,d),source=`grok:${GROK_SHA}:state.ds.${actorId}`;
 const f=(id,v,layer='base',unit='',availability=v==null?'unknown':'known')=>field(id,v,{source,layer,unit,availability});
 return card({branch:'grok',sha:GROK_SHA,actorId,identity:{name:d.name,role:d.role,portrait:portrait('grok',actorId)},
 action:{id:d.task?.act||'idle',current:s.now,reason:f('action.reason',s.why),next:s.next,phase:d.task?.phase||'idle',target:d.task?.node||d.order,
 progress:f('action.progress',null),stopReason:f('action.stopReason',null)},
 fields:[f('energy',d.needs.energy,'effective','原生點'),f('load',d.carry?.n ?? (d.carry ? null : 0),'effective','原生攜帶量'),missing('energy',source),
 f('root',d.root,'base','1–5',d.rootKnown?'known':'hidden'),f('comprehension',d.wu,'base','1–5',d.rootKnown?'known':'hidden'),
 ...Object.entries(d.skills).map(([k,v])=>f(`skills.${k}`,v,'base','原生技能值')),
 ...Object.keys(d.skills).map(k=>missing(`skills.${k}`,source)),
 f('personality',d.known,'base','已揭露項'),f('innate',null,'innate','', 'unsupported')],
 martial:Object.entries(d.arts||{}).map(([id,a])=>{const def=artById(id);return martialEntry({id,name:def?.name||id,source,
  learned:f('learned','已學：原生 arts 記錄；不推定整套招式'),
  proficiency:f('proficiency',a.xp,'base','原生XP'),execution:f('execution',null),
  moves:(def?.techs||[]).filter(id=>(d.moves||[]).includes(id)).map(id=>({id,source})),
  conditions:{entry:{appliesTo:'原武學取得／前置（非當下施展判定）',policy:'原 req 結構；空陣列不代表沒有師承或機緣',result:f('condition.entry',def?.req)},
   special:{appliesTo:'原生武學進展門檻',policy:'隱藏悟性不傳判定結果；原單位不轉成公版規則',
    result:f('condition.special',null,'base','', 'unknown')}}});}),
 commands:['water','forage','train','rest'].map(id=>({id,label:id,enabled:true}))});
}
export function grokCommand(state,actorId,id){if(!grokCard(state,actorId)?.commands.some(c=>c.id===id))return {ok:false,reason:'不支援指令'};return {ok:setOrder(state,actorId,id)};}
