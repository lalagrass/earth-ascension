import { field } from '../character-card/contract.mjs';
export { field };
export function intentView({source,actorId,current,fields,policies=[],commands=[],shortcuts=[]}) {
  return structuredClone({version:1,key:`${source}:${actorId}`,source,actorId,current,fields,policies,commands,shortcuts});
}
export function validateRequest(view, request, expectedActorId) {
  if(!view || view.actorId!==expectedActorId || request.actorId!==expectedActorId)return {ok:false,reason:'人物已切換：請在目前人物面板重新下令'};
  const c=view.commands.find(c=>c.id===request.commandId);
  if(!c)return {ok:false,reason:'此人物目前沒有這項可見指令'};
  if(!c.enabled)return {ok:false,reason:c.reason || '原核心目前不允許'};
  if(request.payload && JSON.stringify(request.payload)!==JSON.stringify(c.payload))return {ok:false,reason:'指令狀態已更新：請使用目前面板的選項'};
  return {ok:true,command:c};
}
