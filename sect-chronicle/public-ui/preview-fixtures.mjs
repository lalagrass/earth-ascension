// Developer-only examples. No engine import, clock, hidden payload or persistence.
import { field } from '../character-card/contract.mjs';
import { presentCard } from '../character-card/profiles.mjs';
import { resourceView } from '../resource-view/contract.mjs';
import { intentView } from '../intent-view/contract.mjs';
import { eventView } from '../event-view/contract.mjs';
const source = 'developer-fixture:UI-PRESENTATION-01';
const f = (id,value,availability = value == null ? 'unknown' : 'known') => field(id,value,{source,availability});
export function previewFixtures() {
 const card = presentCard('life-girl');
 card.profile.background = '示意長公開背景：這段只用來查看換行、收合與缺圖時的操作位置。'.repeat(8);
 card.fields = [f('energy',0),f('root',null),f('innate',null,'hidden'),f('comprehension',null,'unsupported')];
 card.martial = [{id:'fixture-palm',name:'示意掌法（非本局學習）',learned:f('learned',0),proficiency:f('proficiency',null),execution:f('execution',null,'unsupported'),conditions:[],risk:f('risk',null),source}];
 const resources = [resourceView({namespace:'fixture',sha:'0'.repeat(40),nativeId:'sample',label:'示意水',unit:'示意單位',source,values:Object.fromEntries(['amount','capacity','incoming','reserved','available'].map((key,i)=>[key,f(key,i===0?0:null,i===3?'unsupported':i===4?'hidden':i===0?'known':'unknown')])),uses:f('uses',['排版範例']),links:[{id:'fixture-place',kind:'native',label:'示意定位（停用）'}]})];
 const intent = intentView({source,actorId:'fixture-girl',current:{current:'示意坐休',next:'示意待命',reason:f('reason',null)},fields:Object.fromEntries(['workGoal','pending','stop','rest','recall','goals','queue'].map((key,i)=>[key,f(key,i===0?'示意工作':null,i===5?'hidden':i===6?'unsupported':i===0?'known':'unknown')])),commands:[
  {id:'fixture:enabled',nativeId:'fixture',label:'示意可用按鈕',enabled:true,payload:{fixture:true},group:'action'},
  {id:'fixture:disabled',nativeId:'fixture-disabled',label:'示意停用按鈕',enabled:false,reason:'示意：原核心不允許',payload:{fixture:true},group:'action'},
 ],shortcuts:[]});
 const events = [eventView({id:'fixture-event',source,stream:'fixture',sequence:1,tick:0,unit:'示意tick',kind:'activity-complete',result:{text:'示意完成（非本局事件）',units:0},actors:[],reason:null})];
 return {card,resources,intent,events};
}
